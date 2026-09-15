import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { recurringTaskAdminService } from '@/services/recurring-task-admin.service';
import { initializeWorkflowSteps } from '@/lib/workflow-templates';
import { WorkflowType } from '@/services/recurring-task.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for toggling workflow step(s) for one client
const updateStepSchema = z
  .object({
    stepId: z.string().optional(), // single step
    stepIds: z.array(z.string()).optional(), // bulk (mark all complete / untick all)
    workflowType: z.string().optional(), // kept for callers; step IDs are explicit
    completed: z.boolean(),
    clientId: z.string().min(1, 'clientId is required'), // per-client progress
    remark: z.string().optional(), // optional remark text (single-step only)
  })
  .refine((v) => !!v.stepId || (v.stepIds?.length ?? 0) > 0, {
    message: 'Provide stepId or stepIds',
    path: ['stepId'],
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
 * Mark one or more workflow steps complete/incomplete for ONE client.
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

    const { stepId, stepIds, completed, clientId } = validationResult.data;
    const stepIdsToWrite = stepIds?.length ? stepIds : [stepId!];
    const remark: string | undefined = typeof body.remark === 'string' ? body.remark : undefined;

    // clientId and stepId become Firestore field-path segments — a dot would
    // silently build a nested map instead of the intended field.
    if (clientId.includes('.') || stepIdsToWrite.some((id) => id.includes('.'))) {
      return ErrorResponses.badRequest('clientId and stepId must not contain "."');
    }

    const task = await recurringTaskAdminService.getById(taskId);
    if (!task) {
      return ErrorResponses.notFound('Recurring task');
    }

    const nowIso = new Date().toISOString();
    const userUid = authResult.user.uid;
    const withRemark = stepIdsToWrite.length === 1 && !!remark?.trim();

    // ALL per-client state lives in clientProgress[clientId]. Write it through
    // dotted sub-paths instead of rewriting the whole clientProgress map: a
    // read-modify-write of the map loses steps whenever two writes overlap
    // (mark-all fires one request per step, and other clients write too).
    const update: Record<string, any> = {
      [`clientProgress.${clientId}.completedStepIds`]: completed
        ? FieldValue.arrayUnion(...stepIdsToWrite)
        : FieldValue.arrayRemove(...stepIdsToWrite),
      [`clientProgress.${clientId}.completedAt`]: nowIso,
      [`clientProgress.${clientId}.completedBy`]: userUid,
    };
    stepIdsToWrite.forEach((id) => {
      update[`clientProgress.${clientId}.stepMeta.${id}`] = completed
        ? {
            completedAt: nowIso,
            completedBy: userUid,
            ...(withRemark ? { remark: remark!.trim(), remarkBy: userUid, remarkAt: nowIso } : {}),
          }
        : FieldValue.delete();
    });

    const { adminDb } = await import('@/lib/firebase-admin');
    await adminDb.collection('recurring-tasks').doc(taskId).update(update);

    // Return the persisted state so callers never have to guess what landed.
    const updated = await recurringTaskAdminService.getById(taskId);
    return NextResponse.json(
      { success: true, clientProgress: updated?.clientProgress || {} },
      { status: 200 }
    );
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

    // Initialize workflow steps from template (case-insensitive: callers send
    // 'tar'/'TAR'/'stat' — a case-sensitive check used to write statSteps for 'tar')
    const isTar = workflowType.toUpperCase() === 'TAR';
    const steps = initializeWorkflowSteps(isTar ? 'TAR' : 'STAT');
    const stepsField = isTar ? 'tarSteps' : 'statSteps';
    const enabledField = isTar ? 'tarEnabled' : 'statEnabled';

    await recurringTaskAdminService.update(taskId, {
      [stepsField]: steps,
      [enabledField]: true,
    } as any);

    return NextResponse.json({ success: true, steps }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}


