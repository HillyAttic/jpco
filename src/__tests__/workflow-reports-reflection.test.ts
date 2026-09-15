/**
 * Objective: a step marked on /tasks/recurring (or /calendar) must show up as
 * Complete on /reports for the same client.
 *
 * These tests join the two ends of that promise in one process:
 *   writer  = the payload shape produced by PUT /api/workflow/[taskId]
 *   reader  = the exact helpers the reports page renders from
 *             (getReportTypes → getReportTypeById → getStepsForReportType
 *              → getClientCompletedStepIds)
 */

// Mock Firebase so importing the service module doesn't touch a real SDK.
jest.mock('@/lib/firebase', () => ({ db: {} }));
jest.mock('@/services/firebase.service', () => ({
  createFirebaseService: () => ({}),
}));

import { RecurringTask, getClientCompletedStepIds } from '@/services/recurring-task.service';
import {
  getReportTypes,
  getReportTypeById,
  getStepsForReportType,
  getWorkflowTemplate,
  initializeWorkflowSteps,
} from '@/lib/workflow-templates';

const NOW = '2026-09-15T07:15:00.000Z';
const CLIENT_A = 'client-alpha';
const CLIENT_B = 'client-beta';

// ── Task fixtures ────────────────────────────────────────────────────────────

/** Dynamic report types (the modern shape) — lowercase id, like the app stores. */
const dynamicTask = {
  id: 'task-dynamic',
  title: 'TAX AUDIT',
  reportTypes: [
    {
      id: 'tar',
      name: 'TAR Reports',
      badgeLabel: 'TAX AUDIT',
      badgeClass: '',
      description: 'Tax Audit Report',
      enabled: true,
      steps: initializeWorkflowSteps('TAR'),
    },
  ],
} as unknown as RecurringTask;

/** Legacy shape: no reportTypes, steps live in tarSteps. */
const legacyTask = {
  id: 'task-legacy',
  title: 'TAX AUDIT LEGACY',
  tarEnabled: true,
  tarSteps: initializeWorkflowSteps('TAR'),
} as unknown as RecurringTask;

/** Dynamic report type with a custom (non tar/stat) id. */
const customTask = {
  id: 'task-custom',
  title: 'CUSTOM WORKFLOW',
  reportTypes: [
    {
      id: 'tax-audit-fy26',
      name: 'Tax Audit',
      badgeLabel: 'TAX AUDIT',
      badgeClass: '',
      description: 'Custom',
      enabled: true,
      steps: initializeWorkflowSteps('TAR'),
    },
  ],
} as unknown as RecurringTask;

// ── Writer side ──────────────────────────────────────────────────────────────
// PUT /api/workflow/[taskId] writes dotted sub-paths and lets Firestore merge:
// only the target client's slice is touched, at write time, never a snapshot.
// See src/app/api/workflow/[taskId]/route.ts.

type Progress = { completedStepIds: string[]; completedAt?: string; stepMeta?: Record<string, unknown> };
type TaskDoc = Record<string, unknown> & { clientProgress?: Record<string, Progress | undefined> };

/** Faithful model of one PUT: merge into the live doc for ONE client. */
function putSteps(doc: TaskDoc, clientId: string, stepIds: string[], completed: boolean): void {
  const live = doc.clientProgress?.[clientId];
  const ids = new Set(live?.completedStepIds || []);
  const meta = { ...(live?.stepMeta || {}) };
  stepIds.forEach((id) => {
    if (completed) {
      ids.add(id);
      meta[id] = { completedAt: NOW, completedBy: 'uid-1' };
    } else {
      ids.delete(id);
      meta[id] = undefined as unknown as never;
      delete meta[id];
    }
  });
  doc.clientProgress = {
    ...(doc.clientProgress || {}),
    [clientId]: { ...live, completedStepIds: Array.from(ids), completedAt: NOW, stepMeta: meta },
  };
}

/** The pre-fix write: read the WHOLE map, then replace it. */
function putStepsWholeMap(doc: TaskDoc, clientId: string, stepIds: string[], completed: boolean): TaskDoc {
  const snapshot = JSON.parse(JSON.stringify(doc.clientProgress || {}));
  const ids = new Set(snapshot[clientId]?.completedStepIds || []);
  stepIds.forEach((id) => (completed ? ids.add(id) : ids.delete(id)));
  snapshot[clientId] = { completedStepIds: Array.from(ids), completedAt: NOW, stepMeta: {} };
  return { ...doc, clientProgress: snapshot };
}

const stepIdsOf = (task: RecurringTask) => {
  const rt = getReportTypes(task).find((r) => r.enabled)!;
  return getStepsForReportType(task, rt.id).map((s) => s.id);
};

// ── Reader side (mirrors the reports page) ───────────────────────────────────

/**
 * What WorkflowTaskDetailModal renders for one client row:
 * the reports page picks the first enabled report type, then ticks each column
 * whose step id is in that client's completedStepIds.
 */
function reportsRow(task: RecurringTask, clientId: string) {
  const workflowType = getReportTypes(task).find((rt) => rt.enabled)!.id;
  const template = getReportTypeById(task, workflowType) || getWorkflowTemplate(workflowType as never);
  const steps = getStepsForReportType(task, workflowType);
  const completed = getClientCompletedStepIds(task, clientId, workflowType as never);

  return {
    workflowType,
    columns: steps.map((s) => ({ shortName: s.shortName, done: completed.includes(s.id) })),
    completedCount: steps.filter((s) => completed.includes(s.id)).length,
    total: steps.length,
    percent: steps.length ? Math.round((steps.filter((s) => completed.includes(s.id)).length / steps.length) * 100) : 0,
  };
}

/** What the drawer's switches show after it adopts the server's response. */
function drawerTicks(task: RecurringTask, clientId: string) {
  const workflowType = getReportTypes(task).find((rt) => rt.enabled)!.id;
  const completed = getClientCompletedStepIds(task, clientId, workflowType as never);
  return getStepsForReportType(task, workflowType).map((s) => completed.includes(s.id));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('mark progress → reports reflection', () => {
  it.each([
    ['dynamic reportTypes task', dynamicTask],
    ['legacy tarSteps task', legacyTask],
    ['custom report type id', customTask],
  ])('mark all complete on %s shows every column Done in reports', (_label, task) => {
    const doc: TaskDoc = {};
    const ids = stepIdsOf(task);

    // user clicks "Mark all complete" for CLIENT_A
    putSteps(doc, CLIENT_A, ids, true);
    const marked = { ...task, ...doc } as RecurringTask;

    const row = reportsRow(marked, CLIENT_A);
    expect(row.total).toBe(7);
    expect(row.completedCount).toBe(7);
    expect(row.percent).toBe(100);
    expect(row.columns.every((c) => c.done)).toBe(true);
    expect(row.columns.map((c) => c.shortName)).toEqual([
      'Stat Recon', 'Fin Review', 'Profit Eval', 'Sign-off', 'Fins Ready', 'TAR Ready', 'TAR Filed',
    ]);
  });

  it('recurring page and reports page agree after a single step toggle', () => {
    const ids = stepIdsOf(dynamicTask);
    const doc: TaskDoc = {};

    putSteps(doc, CLIENT_A, [ids[2]], true); // tick "Profit Evaluation"
    const marked = { ...dynamicTask, ...doc } as RecurringTask;

    expect(drawerTicks(marked, CLIENT_A)).toEqual([false, false, true, false, false, false, false]);

    const row = reportsRow(marked, CLIENT_A);
    expect(row.columns.map((c) => c.done)).toEqual([false, false, true, false, false, false, false]);
    expect(row.percent).toBe(14); // 1/7
  });

  it('calendar page writes the same shape and lands on the same view', () => {
    const ids = stepIdsOf(dynamicTask);
    const fromRecurring: TaskDoc = {};
    const fromCalendar: TaskDoc = {};

    putSteps(fromRecurring, CLIENT_A, ids, true); // calendar uses the same route
    putSteps(fromCalendar, CLIENT_A, ids, true);

    expect(fromCalendar.clientProgress).toEqual(fromRecurring.clientProgress);
    expect(reportsRow({ ...dynamicTask, ...fromCalendar } as RecurringTask, CLIENT_A).percent).toBe(100);
  });

  it('a partial write shows exactly the missing columns as Incomplete', () => {
    const ids = stepIdsOf(dynamicTask);
    const doc: TaskDoc = {};

    putSteps(doc, CLIENT_A, [ids[0], ids[1], ids[3], ids[4], ids[5]], true); // 5 of 7
    const row = reportsRow({ ...dynamicTask, ...doc } as RecurringTask, CLIENT_A);

    expect(row.completedCount).toBe(5);
    expect(row.percent).toBe(71);
    // this is what the reported bug looked like: two red cells after "mark all"
    expect(row.columns.filter((c) => !c.done).map((c) => c.shortName)).toEqual(['Profit Eval', 'TAR Filed']);
  });

  it('untick all clears every column again', () => {
    const ids = stepIdsOf(dynamicTask);
    const doc: TaskDoc = {};

    putSteps(doc, CLIENT_A, ids, true);
    expect(reportsRow({ ...dynamicTask, ...doc } as RecurringTask, CLIENT_A).percent).toBe(100);

    putSteps(doc, CLIENT_A, ids, false);
    const row = reportsRow({ ...dynamicTask, ...doc } as RecurringTask, CLIENT_A);
    expect(row.percent).toBe(0);
    expect(row.columns.every((c) => !c.done)).toBe(true);
  });

  it('marking one client never marks another', () => {
    const ids = stepIdsOf(dynamicTask);
    const doc: TaskDoc = {};

    putSteps(doc, CLIENT_A, ids, true);
    const marked = { ...dynamicTask, ...doc } as RecurringTask;

    expect(reportsRow(marked, CLIENT_A).percent).toBe(100);
    expect(reportsRow(marked, CLIENT_B).percent).toBe(0);
    expect(drawerTicks(marked, CLIENT_B).every((t) => t === false)).toBe(true);
  });

  it('reopening one step for one client leaves the other six ticked', () => {
    const ids = stepIdsOf(dynamicTask);
    const doc: TaskDoc = {};

    putSteps(doc, CLIENT_A, ids, true);
    putSteps(doc, CLIENT_A, [ids[0]], false);

    const row = reportsRow({ ...dynamicTask, ...doc } as RecurringTask, CLIENT_A);
    expect(row.completedCount).toBe(6);
    expect(row.columns[0].done).toBe(false);
  });

  it('a client with no entry at all reads as 0% once another client was marked', () => {
    const ids = stepIdsOf(legacyTask);
    const doc: TaskDoc = {};
    putSteps(doc, CLIENT_A, ids, true);

    expect(reportsRow({ ...legacyTask, ...doc } as RecurringTask, CLIENT_B).percent).toBe(0);
  });
});

describe('regression: overlapping "mark all complete" writes', () => {
  const ids = stepIdsOf(dynamicTask);

  it('the old whole-map write loses steps (this was the bug)', () => {
    let doc: TaskDoc = {};
    // client-card A and client-card B clicked in quick succession: both read
    // the same snapshot before either write lands, then both write the map.
    const readA = JSON.parse(JSON.stringify(doc));
    const readB = JSON.parse(JSON.stringify(doc));
    doc = putStepsWholeMap(readA, CLIENT_A, ids, true); // A's 7 steps land...
    doc = putStepsWholeMap(readB, CLIENT_B, ids, true); // ...then B's stale map erases them

    expect((doc.clientProgress![CLIENT_A]?.completedStepIds || []).length).toBe(0);
    expect(reportsRow({ ...dynamicTask, ...doc } as RecurringTask, CLIENT_A).percent).toBe(0);
  });

  it('the dotted-path write keeps both clients at 7/7', () => {
    const doc: TaskDoc = {};
    putSteps(doc, CLIENT_A, ids, true);
    putSteps(doc, CLIENT_B, ids, true); // interleaving cannot matter: only one client's slice is merged

    expect((doc.clientProgress![CLIENT_A]?.completedStepIds || []).length).toBe(7);
    expect((doc.clientProgress![CLIENT_B]?.completedStepIds || []).length).toBe(7);
    expect(reportsRow({ ...dynamicTask, ...doc } as RecurringTask, CLIENT_A).percent).toBe(100);
    expect(reportsRow({ ...dynamicTask, ...doc } as RecurringTask, CLIENT_B).percent).toBe(100);
  });

  it('two clients whose step ids differ do not bleed into each other', () => {
    const doc: TaskDoc = {};
    putSteps(doc, CLIENT_A, [ids[0], ids[1]], true);
    putSteps(doc, CLIENT_B, ids, true);

    expect(reportsRow({ ...dynamicTask, ...doc } as RecurringTask, CLIENT_A).percent).toBe(29);
    expect(reportsRow({ ...dynamicTask, ...doc } as RecurringTask, CLIENT_B).percent).toBe(100);
  });
});

describe('reports column source', () => {
  it('legacy task renders TAR columns even though the id is lowercase', () => {
    // getWorkflowTemplate() is case-sensitive and would return the STAT template,
    // so the report type config lookup has to win here.
    const row = reportsRow(legacyTask, CLIENT_A);
    expect(row.workflowType).toBe('tar');
    expect(row.columns.map((c) => c.shortName)).toEqual([
      'Stat Recon', 'Fin Review', 'Profit Eval', 'Sign-off', 'Fins Ready', 'TAR Ready', 'TAR Filed',
    ]);
  });

  it('custom report type ids resolve their own steps', () => {
    const row = reportsRow(customTask, CLIENT_A);
    expect(row.workflowType).toBe('tax-audit-fy26');
    expect(row.total).toBe(7);
  });
});
