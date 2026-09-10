import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskAdminService } from '@/services/recurring-task-admin.service';
import { initializeWorkflowSteps, getWorkflowTemplate } from '@/lib/workflow-templates';
import { WorkflowStep, WorkflowType } from '@/services/recurring-task.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for updating a single workflow step
const updateStepSchema = z.object({
  stepId: z.string(),
  workflowType: z.string(), // Now dynamic: 'tar', 'stat', or custom report type ID
  completed: z.boolean(),
  clientId: z.string().optional(), // per-client progress
});

// Validation schema for initializing workflow
const initializeWorkflowSchema = z.object({
  workflowType: z.string(), // Now dynamic
});

/**
 * GET /api/workflow/[taskId]
 * Fetch workflow steps for a task
 * Requires: Employee role or higher
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const workflowType = searchParams.get('type') as WorkflowType | null;

    const task = await recurringTaskAdminService.getById(taskId);

    if (!task) {
      return ErrorResponses.notFound('Recurring task');
    }

    // Return requested workflow or both
    const response: any = {};

    // Always return reportTypes if present (dynamic report types)
    if (task.reportTypes && task.reportTypes.length > 0) {
      response.reportTypes = task.reportTypes;
    }

    if (!workflowType || workflowType === 'tar' || workflowType === 'TAR') {
      response.tarEnabled = task.tarEnabled || false;
      response.tarSteps = task.tarSteps || [];
    }

    if (!workflowType || workflowType === 'stat' || workflowType === 'STAT') {
      response.statEnabled = task.statEnabled || false;
      response.statSteps = task.statSteps || [];
    }

    // Always return clientProgress so the client can compute per-client progress
    response.clientProgress = task.clientProgress || {};

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/workflow/[taskId]
 * Update a single workflow step completion status for a specific client
 * Requires: Employee role or higher
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { taskId } = await params;
    const body = await request.json();

    const validationResult = updateStepSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { stepId, workflowType, completed, clientId } = validationResult.data;

    const task = await recurringTaskAdminService.getById(taskId);
    if (!task) {
      return ErrorResponses.notFound('Recurring task');
    }

    // Resolve steps: check reportTypes first, then legacy fields
    let steps: WorkflowStep[] = [];
    let stepsField: string | null = null;

    if (task.reportTypes && task.reportTypes.length > 0) {
      const reportType = task.reportTypes.find(rt => rt.id === workflowType);
      if (reportType) {
        steps = reportType.steps;
      }
    }
    // Fallback to legacy fields
    if (steps.length === 0) {
      stepsField = workflowType === 'tar' ? 'tarSteps' : workflowType === 'stat' ? 'statSteps' : null;
      if (stepsField) {
        steps = (task as any)[stepsField] || [];
      }
    }

    // Build updated clientProgress
    const clientProgress = { ...(task.clientProgress || {}) };

    if (clientId) {
      // Per-client update: initialize from legacy if first touch, then toggle
      const existing = clientProgress[clientId]
        ? { ...clientProgress[clientId] }
        : {
            completedStepIds: steps.filter((s: WorkflowStep) => s.completed).map((s: WorkflowStep) => s.id),
          };

      const completedStepIds = new Set(existing.completedStepIds || []);
      if (completed) {
        completedStepIds.add(stepId);
      } else {
        completedStepIds.delete(stepId);
      }

      clientProgress[clientId] = {
        completedStepIds: Array.from(completedStepIds),
        completedAt: new Date().toISOString(),
        completedBy: authResult.user!.uid,
      };
    } else {
      // Legacy fallback: update task-level step and sync to all clients that don't have their own progress
      const updatedSteps = steps.map((step: WorkflowStep) => {
        if (step.id === stepId) {
          return {
            ...step,
            completed,
            completedAt: completed ? new Date() : undefined,
            completedBy: completed ? authResult.user!.uid : undefined,
          };
        }
        return step;
      });

      // Sync legacy completion to all clients that don't yet have their own progress
      // This ensures backward compatibility
      const completedIds = updatedSteps.filter((s: WorkflowStep) => s.completed).map((s: WorkflowStep) => s.id);
      const taskClientIds = getClientIdsFromTask(task);
      taskClientIds.forEach((cid: string) => {
        if (!clientProgress[cid]) {
          clientProgress[cid] = {
            completedStepIds: [...completedIds],
            completedAt: new Date().toISOString(),
            completedBy: authResult.user!.uid,
          };
        }
      });

      // Build update payload: write to reportTypes or legacy field
      const updatePayload: Record<string, any> = { clientProgress };

      if (task.reportTypes && task.reportTypes.length > 0) {
        // Update steps inside reportTypes array
        const updatedReportTypes = task.reportTypes.map(rt => {
          if (rt.id === workflowType) {
            return { ...rt, steps: updatedSteps };
          }
          return rt;
        });
        updatePayload.reportTypes = updatedReportTypes;
      } else if (stepsField) {
        // Legacy field update
        updatePayload[stepsField] = updatedSteps;
      }

      await recurringTaskAdminService.update(taskId, updatePayload as any);

      return NextResponse.json({ success: true, steps: updatedSteps, clientProgress }, { status: 200 });
    }

    // Per-client update path
    await recurringTaskAdminService.update(taskId, {
      clientProgress,
    } as any);

    return NextResponse.json({ success: true, clientProgress }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/workflow/[taskId]
 * Initialize workflow steps when toggled ON
 * Requires: Manager or Admin role
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can initialize workflows');
    }

    const { taskId } = await params;
    const body = await request.json();

    const validationResult = initializeWorkflowSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { workflowType } = validationResult.data;

    const task = await recurringTaskAdminService.getById(taskId);
    if (!task) {
      return ErrorResponses.notFound('Recurring task');
    }

    // Initialize workflow steps from template
    const steps = initializeWorkflowSteps(workflowType);
    const stepsField = workflowType === 'TAR' ? 'tarSteps' : 'statSteps';
    const enabledField = workflowType === 'TAR' ? 'tarEnabled' : 'statEnabled';

    await recurringTaskAdminService.update(taskId, {
      [stepsField]: steps,
      [enabledField]: true,
    } as any);

    return NextResponse.json({ success: true, steps }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Extract all client IDs from a task (contactIds + teamMemberMappings) */
function getClientIdsFromTask(task: any): string[] {
  const ids = new Set<string>();
  (task.contactIds || []).forEach((id: string) => ids.add(id));
  (task.teamMemberMappings || []).forEach((m: any) => {
    (m.clientIds || []).forEach((id: string) => ids.add(id));
  });
  return Array.from(ids);
}
