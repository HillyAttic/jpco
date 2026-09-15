/**
 * @jest-environment node
 *
 * Contract tests for the workflow API that the recurring page, the calendar page
 * and the reports page all sit on.
 *
 * PUT  /api/workflow/[taskId] — marks steps for ONE client
 * GET  /api/workflow/[taskId] — reads a task's steps + per-client progress
 *
 * Firebase, auth and Firestore are mocked: these assert what the route sends to
 * Firestore and what it answers, without touching the real database.
 */

jest.mock('@/lib/server-auth', () => ({ verifyAuthToken: jest.fn() }));

jest.mock('@/services/recurring-task-admin.service', () => ({
  recurringTaskAdminService: { getById: jest.fn(), update: jest.fn() },
}));

const firestoreUpdate = jest.fn();
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: jest.fn(() => ({ doc: jest.fn(() => ({ update: firestoreUpdate })) })) },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    arrayUnion: (...values: unknown[]) => ({ op: 'arrayUnion', values }),
    arrayRemove: (...values: unknown[]) => ({ op: 'arrayRemove', values }),
    delete: () => ({ op: 'delete' }),
  },
}));

import { NextRequest } from 'next/server';
import { PUT, GET, POST } from '@/app/api/workflow/[taskId]/route';
import { verifyAuthToken } from '@/lib/server-auth';
import { recurringTaskAdminService } from '@/services/recurring-task-admin.service';
import { initializeWorkflowSteps } from '@/lib/workflow-templates';

const verify = verifyAuthToken as jest.Mock;
const getById = recurringTaskAdminService.getById as jest.Mock;

const TASK_ID = 'task-1';
const CLIENT = 'client-alpha';
const STEP_IDS = initializeWorkflowSteps('TAR').map((s) => s.id);

const task = {
  id: TASK_ID,
  title: 'TAX AUDIT',
  tarEnabled: true,
  tarSteps: initializeWorkflowSteps('TAR'),
  clientProgress: {},
};

const params = () => ({ params: Promise.resolve({ taskId: TASK_ID }) });

const put = (body: Record<string, unknown>) =>
  PUT(
    new NextRequest(`http://localhost/api/workflow/${TASK_ID}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    params()
  );

const payloadSentToFirestore = () => firestoreUpdate.mock.calls[0][0] as Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  verify.mockResolvedValue({ success: true, user: { uid: 'uid-1', claims: { role: 'admin' } } });
  getById.mockResolvedValue(task);
});

describe('PUT /api/workflow/[taskId] — auth and validation', () => {
  it('401s without a valid token', async () => {
    verify.mockResolvedValue({ success: false });
    const res = await put({ stepId: STEP_IDS[0], completed: true, clientId: CLIENT });
    expect(res.status).toBe(401);
    expect(firestoreUpdate).not.toHaveBeenCalled();
  });

  it('403s for a role that cannot edit workflows', async () => {
    verify.mockResolvedValue({ success: true, user: { uid: 'u', claims: { role: 'client' } } });
    const res = await put({ stepId: STEP_IDS[0], completed: true, clientId: CLIENT });
    expect(res.status).toBe(403);
    expect(firestoreUpdate).not.toHaveBeenCalled();
  });

  it('400s when clientId is missing — no more silent task-level writes', async () => {
    const res = await put({ stepId: STEP_IDS[0], completed: true });
    expect(res.status).toBe(400);
    expect((await res.json()).details).toHaveProperty('clientId');
    expect(firestoreUpdate).not.toHaveBeenCalled();
  });

  it('400s when neither stepId nor stepIds is given', async () => {
    const res = await put({ completed: true, clientId: CLIENT });
    expect(res.status).toBe(400);
    expect(firestoreUpdate).not.toHaveBeenCalled();
  });

  it('400s on an empty stepIds array', async () => {
    const res = await put({ stepIds: [], completed: true, clientId: CLIENT });
    expect(res.status).toBe(400);
    expect(firestoreUpdate).not.toHaveBeenCalled();
  });

  it('400s on ids containing a dot (they would become nested field paths)', async () => {
    const withDot = await put({ stepId: 'tar.step.1', completed: true, clientId: CLIENT });
    expect(withDot.status).toBe(400);

    const clientWithDot = await put({ stepId: STEP_IDS[0], completed: true, clientId: 'a.b' });
    expect(clientWithDot.status).toBe(400);
    expect(firestoreUpdate).not.toHaveBeenCalled();
  });

  it('404s when the task does not exist', async () => {
    getById.mockResolvedValue(null);
    const res = await put({ stepId: STEP_IDS[0], completed: true, clientId: CLIENT });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/workflow/[taskId] — the write it performs', () => {
  it('writes one client through dotted paths and never rewrites the map', async () => {
    await put({ stepIds: STEP_IDS, completed: true, clientId: CLIENT });

    const payload = payloadSentToFirestore();
    // regression guard: the whole-map rewrite is what lost steps
    expect(payload).not.toHaveProperty('clientProgress');
    expect(Object.keys(payload).sort()).toEqual(
      [
        `clientProgress.${CLIENT}.completedStepIds`,
        `clientProgress.${CLIENT}.completedAt`,
        `clientProgress.${CLIENT}.completedBy`,
        ...STEP_IDS.map((id) => `clientProgress.${CLIENT}.stepMeta.${id}`),
      ].sort()
    );
    expect(payload[`clientProgress.${CLIENT}.completedStepIds`]).toEqual({
      op: 'arrayUnion',
      values: STEP_IDS,
    });
  });

  it('touches only the target client — other clients appear nowhere in the payload', async () => {
    await put({ stepId: STEP_IDS[0], completed: true, clientId: CLIENT });
    const otherClientKeys = Object.keys(payloadSentToFirestore()).filter(
      (k) => k.includes('clientProgress.') && !k.startsWith(`clientProgress.${CLIENT}.`)
    );
    expect(otherClientKeys).toEqual([]);
  });

  it('unticking removes from the array and deletes the step metadata', async () => {
    await put({ stepIds: STEP_IDS, completed: false, clientId: CLIENT });

    const payload = payloadSentToFirestore();
    expect(payload[`clientProgress.${CLIENT}.completedStepIds`]).toEqual({
      op: 'arrayRemove',
      values: STEP_IDS,
    });
    STEP_IDS.forEach((id) => {
      expect(payload[`clientProgress.${CLIENT}.stepMeta.${id}`]).toEqual({ op: 'delete' });
    });
  });

  it('stores a remark for a single-step write', async () => {
    await put({ stepId: STEP_IDS[2], completed: true, clientId: CLIENT, remark: '  checked  ' });
    const meta = payloadSentToFirestore()[`clientProgress.${CLIENT}.stepMeta.${STEP_IDS[2]}`] as any;
    expect(meta.remark).toBe('checked');
    expect(meta.completedBy).toBe('uid-1');
    expect(meta.completedAt).toEqual(expect.any(String));
  });

  it('ignores a remark sent alongside a bulk write', async () => {
    await put({ stepIds: STEP_IDS, completed: true, clientId: CLIENT, remark: 'nope' });
    const meta = payloadSentToFirestore()[`clientProgress.${CLIENT}.stepMeta.${STEP_IDS[0]}`] as any;
    expect(meta.remark).toBeUndefined();
  });

  it('accepts both a single stepId and a bulk stepIds list', async () => {
    await put({ stepId: STEP_IDS[0], completed: true, clientId: CLIENT });
    expect(payloadSentToFirestore()[`clientProgress.${CLIENT}.completedStepIds`]).toEqual({
      op: 'arrayUnion',
      values: [STEP_IDS[0]],
    });

    jest.clearAllMocks();
    verify.mockResolvedValue({ success: true, user: { uid: 'uid-1', claims: { role: 'employee' } } });
    getById.mockResolvedValue(task);
    await put({ stepIds: STEP_IDS, completed: true, clientId: CLIENT });
    expect((payloadSentToFirestore()[`clientProgress.${CLIENT}.completedStepIds`] as any).values).toHaveLength(7);
  });
});

describe('PUT /api/workflow/[taskId] — the answer it gives back', () => {
  it('returns the persisted clientProgress, not the caller’s guess', async () => {
    const persisted = { [CLIENT]: { completedStepIds: STEP_IDS, completedAt: 'now' } };
    getById
      .mockResolvedValueOnce(task) // existence check
      .mockResolvedValueOnce({ ...task, clientProgress: persisted }); // post-write read

    const res = await put({ stepIds: STEP_IDS, completed: true, clientId: CLIENT });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.clientProgress).toEqual(persisted);
  });

  it('returns an empty map rather than failing when the re-read finds nothing', async () => {
    getById.mockResolvedValueOnce(task).mockResolvedValueOnce(null);
    const res = await put({ stepId: STEP_IDS[0], completed: true, clientId: CLIENT });
    expect((await res.json()).clientProgress).toEqual({});
  });

  it('500s (not silently 200) when the Firestore write fails', async () => {
    firestoreUpdate.mockRejectedValueOnce(new Error('write failed'));
    const res = await put({ stepId: STEP_IDS[0], completed: true, clientId: CLIENT });
    expect(res.status).toBe(500);
    expect((await res.json()).success).toBeUndefined();
  });
});

describe('POST /api/workflow/[taskId] — initialize steps', () => {
  const post = (body: Record<string, unknown>) =>
    POST(
      new NextRequest(`http://localhost/api/workflow/${TASK_ID}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }),
      params()
    );

  it('writes template steps with no undefined values (Firestore rejects those)', async () => {
    const update = recurringTaskAdminService.update as jest.Mock;
    const res = await post({ workflowType: 'TAR' });

    expect(res.status).toBe(200);
    const written = update.mock.calls[0][1];
    expect(written.tarEnabled).toBe(true);
    expect(written.tarSteps).toHaveLength(7);
    written.tarSteps.forEach((step: Record<string, unknown>) => {
      expect(Object.values(step)).not.toContain(undefined);
    });
    // JSON round-trip is what Firestore serialization effectively does
    expect(() => JSON.stringify(written.tarSteps)).not.toThrow();
  });

  it.each([['TAR'], ['tar'], ['Tar']])('initializes tarSteps for workflowType=%s', async (type) => {
    const update = recurringTaskAdminService.update as jest.Mock;
    await post({ workflowType: type });

    const written = update.mock.calls[0][1];
    expect(written.tarSteps).toHaveLength(7);
    expect(written.tarEnabled).toBe(true);
    expect(written.statSteps).toBeUndefined();
    expect(written.statEnabled).toBeUndefined();
    expect(written.tarSteps[0].shortName).toBe('Stat Recon'); // TAR template, not STAT
  });

  it('initializes statSteps for stat workflow types', async () => {
    const update = recurringTaskAdminService.update as jest.Mock;
    await post({ workflowType: 'stat' });

    const written = update.mock.calls[0][1];
    expect(written.statSteps).toHaveLength(10);
    expect(written.tarSteps).toBeUndefined();
  });

  it('403s for an employee (init is manager/admin only)', async () => {
    verify.mockResolvedValue({ success: true, user: { uid: 'u', claims: { role: 'employee' } } });
    const res = await post({ workflowType: 'TAR' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/workflow/[taskId]', () => {
  it('returns the step definitions and per-client progress for a legacy task', async () => {
    getById.mockResolvedValue({ ...task, clientProgress: { [CLIENT]: { completedStepIds: STEP_IDS } } });

    const res = await GET(
      new NextRequest(`http://localhost/api/workflow/${TASK_ID}`),
      params()
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tarEnabled).toBe(true);
    expect(body.tarSteps.map((s: any) => s.id)).toEqual(STEP_IDS);
    expect(body.clientProgress[CLIENT].completedStepIds).toEqual(STEP_IDS);
  });

  it('returns reportTypes for a dynamic task', async () => {
    const reportTypes = [{ id: 'tar', enabled: true, steps: initializeWorkflowSteps('TAR') }];
    getById.mockResolvedValue({ ...task, tarEnabled: false, reportTypes });

    const res = await GET(new NextRequest(`http://localhost/api/workflow/${TASK_ID}`), params());
    expect((await res.json()).reportTypes).toEqual(reportTypes);
  });

  it('401s without a valid token', async () => {
    verify.mockResolvedValue({ success: false });
    const res = await GET(new NextRequest(`http://localhost/api/workflow/${TASK_ID}`), params());
    expect(res.status).toBe(401);
  });

  it('404s for an unknown task', async () => {
    getById.mockResolvedValue(null);
    const res = await GET(new NextRequest(`http://localhost/api/workflow/${TASK_ID}`), params());
    expect(res.status).toBe(404);
  });
});
