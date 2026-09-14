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
  remark: z.string().optional(), // optional remark text
});

// Validation schema for initializing workflow
const initializeWorkflowSchema = z.object({
  workflowType: z.string(), // Now dynamic
});

/**
 * Build the persisted version of a workflow step after a completion toggle.
 * Reopened steps must omit cleared metadata rather than sending undefined
 * values, because Firestore rejects undefined properties in update payloads.
 */
function updateWorkflowStep(
  step: WorkflowStep,
  completed: boolean,
  userId: string,
  now: Date,
  remark?: string,
): WorkflowStep {
  const updatedStep: WorkflowStep = { ...step, completed };

  if (!completed) {
    delete updatedStep.completedAt;
    delete updatedStep.completedBy;
    delete updatedStep.remark;
    delete updatedStep.remarkBy;
    delete updatedStep.remarkAt;
    return updatedStep;
  }

  updatedStep.completedAt = now;
  updatedStep.completedBy = userId;

  if (remark?.trim()) {
    updatedStep.remark = remark.trim();
    updatedStep.remarkBy = userId;
    updatedStep.remarkAt = now;
  }

  return updatedStep;
}

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

    // Resolve step definitions: check reportTypes first (case-insensitive), then legacy fields
    let steps: WorkflowStep[] = [];
    const lowerWorkflowType = workflowType.toLowerCase();

    if (task.reportTypes && task.reportTypes.length > 0) {
      const reportType = task.reportTypes.find(rt => rt.id.toLowerCase() === lowerWorkflowType);
      if (reportType) {
        steps = reportType.steps || [];
      }
    }
    // Fallback to legacy fields (case-insensitive)
    if (steps.length === 0) {
      const legacyField = lowerWorkflowType === 'tar' ? 'tarSteps' : lowerWorkflowType === 'stat' ? 'statSteps' : null;
      if (legacyField) {
        steps = (task as any)[legacyField] || [];
      }
    }

    const nowIso = new Date().toISOString();
    const userUid = authResult.user!.uid;
    const remark: string | undefined = typeof body.remark === 'string' ? body.remark : undefined;

    // Build updated clientProgress
    const clientProgress = { ...(task.clientProgress || {}) };

    if (clientId) {
      // ── Per-client update ────────────────────────────────────────────
      // ALL per-client state (completed step IDs + per-step metadata) lives
      // inside clientProgress[clientId]. The shared step-definition array is
      // NEVER mutated, so one client's toggle cannot leak to any other client.
      const existing = clientProgress[clientId]
        ? { ...clientProgress[clientId] }
        : { completedStepIds: [] as string[] };

      const completedStepIds = new Set<string>(existing.completedStepIds || []);
      const stepMeta: Record<string, any> = { ...(existing.stepMeta || {}) };

      if (completed) {
        completedStepIds.add(stepId);
        stepMeta[stepId] = {
          completedAt: nowIso,
          completedBy: userUid,
          ...(remark?.trim()
            ? { remark: remark.trim(), remarkBy: userUid, remarkAt: nowIso }
            : {}),
        };
      } else {
        completedStepIds.delete(stepId);
        delete stepMeta[stepId];
      }

      clientProgress[clientId] = {
        completedStepIds: Array.from(completedStepIds),
        completedAt: nowIso,
        completedBy: userUid,
        stepMeta,
      };

      await recurringTaskAdminService.update(taskId, { clientProgress } as any);

      return NextResponse.json({ success: true, clientProgress }, { status: 200 });
    } else {
      // ── Legacy task-level update (no clientId) ───────────────────────
      // Only used for genuinely legacy tasks that never adopted per-client
      // tracking. Update the shared step objects for backward compatibility.
      const now = new Date();
      const updatedSteps = steps.map((step: WorkflowStep) => {
        if (step.id === stepId) {
          return updateWorkflowStep(step, completed, userUid, now, remark);
        }
        return step;
      });

      const updatePayload: Record<string, any> = {};

      if (task.reportTypes && task.reportTypes.length > 0) {
        const updatedReportTypes = task.reportTypes.map(rt => {
          if (rt.id.toLowerCase() === lowerWorkflowType) {
            return { ...rt, steps: updatedSteps };
          }
          return rt;
        });
        updatePayload.reportTypes = updatedReportTypes;
      } else {
        const legacyField = lowerWorkflowType === 'tar' ? 'tarSteps' : lowerWorkflowType === 'stat' ? 'statSteps' : null;
        if (legacyField) {
          updatePayload[legacyField] = updatedSteps;
        }
      }

      await recurringTaskAdminService.update(taskId, updatePayload as any);

      return NextResponse.json({ success: true, steps: updatedSteps }, { status: 200 });
    }
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


