/**
 * Unit tests for per-client workflow progress helpers.
 *
 * These cover the critical bug fixes:
 *  - Bug A: toggling a step for one client must NOT leak to other clients
 *           (per-client isolation via clientProgress, no shared-array mutation).
 *  - Bug B: progress percentage/status must be computed case-insensitively
 *           and support dynamic reportTypes (previously reported 0%).
 */

// Mock Firebase so importing the service module doesn't touch a real SDK.
jest.mock('@/lib/firebase', () => ({ db: {} }));
jest.mock('@/services/firebase.service', () => ({
  createFirebaseService: () => ({}),
}));

import {
  getClientCompletedStepIds,
  getClientStepMeta,
  getClientProgressSummary,
  getClientWorkflowStatus,
  calculateClientProgressPercent,
  updateClientStepProgress,
  isStepCompletedForClient,
  RecurringTask,
  WorkflowStep,
} from '@/services/recurring-task.service';

function makeSteps(prefix: string, count: number, completedFlags: boolean[] = []): WorkflowStep[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-step-${i + 1}`,
    name: `Step ${i + 1}`,
    shortName: `S${i + 1}`,
    completed: completedFlags[i] ?? false,
  }));
}

function baseTask(overrides: Partial<RecurringTask> = {}): RecurringTask {
  return {
    title: 'TAX AUDIT',
    description: '',
    priority: 'medium',
    status: 'pending',
    contactIds: ['clientA', 'clientB', 'clientC'],
    recurrencePattern: 'yearly',
    dueDate: new Date(),
    startDate: new Date(),
    completionHistory: [],
    isPaused: false,
    tarEnabled: true,
    tarSteps: makeSteps('tar', 7),
    ...overrides,
  };
}

describe('getClientCompletedStepIds — per-client isolation (Bug A)', () => {
  it('returns [] for a client with no progress once ANY client has diverged', () => {
    const task = baseTask({
      clientProgress: {
        clientA: { completedStepIds: ['tar-step-1', 'tar-step-2'] },
      },
    });

    // clientA has its own progress
    expect(getClientCompletedStepIds(task, 'clientA', 'tar')).toEqual(['tar-step-1', 'tar-step-2']);

    // clientB has NOT been touched — must NOT inherit clientA's progress,
    // even though the system is in per-client mode.
    expect(getClientCompletedStepIds(task, 'clientB', 'tar')).toEqual([]);
    expect(getClientCompletedStepIds(task, 'clientC', 'tar')).toEqual([]);
  });

  it('does NOT leak from a polluted shared step array when per-client progress exists', () => {
    // Simulate a legacy shared array where some steps were marked complete,
    // AND per-client progress already exists (post-migration state).
    const task = baseTask({
      tarSteps: makeSteps('tar', 7, [true, true, true, false, false, false, false]),
      clientProgress: {
        clientA: { completedStepIds: ['tar-step-1'] },
      },
    });

    // clientA reads only its own single completed step, ignoring the shared array.
    expect(getClientCompletedStepIds(task, 'clientA', 'tar')).toEqual(['tar-step-1']);
    // clientB (untouched) reads nothing, NOT the 3 polluted shared steps.
    expect(getClientCompletedStepIds(task, 'clientB', 'tar')).toEqual([]);
  });

  it('falls back to shared steps ONLY for genuinely legacy tasks (no clientProgress)', () => {
    const task = baseTask({
      tarSteps: makeSteps('tar', 7, [true, true, false, false, false, false, false]),
      // no clientProgress at all
    });
    expect(getClientCompletedStepIds(task, 'clientA', 'tar')).toEqual(['tar-step-1', 'tar-step-2']);
  });

  it('is case-insensitive for workflowType', () => {
    const task = baseTask({
      clientProgress: { clientA: { completedStepIds: ['tar-step-3'] } },
    });
    expect(getClientCompletedStepIds(task, 'clientA', 'TAR')).toEqual(['tar-step-3']);
    expect(getClientCompletedStepIds(task, 'clientA', 'tar')).toEqual(['tar-step-3']);
  });
});

describe('updateClientStepProgress — writes per-client, never mutates shared array', () => {
  it('adds a completed step to only the target client and records stepMeta', () => {
    const task = baseTask();
    const before = JSON.stringify(task.tarSteps);

    const updated = updateClientStepProgress(task, 'tar-step-1', true, 'clientA', 'tar', 'user-1');

    // Shared step array is untouched (referential intent: same content)
    expect(JSON.stringify(updated.tarSteps)).toEqual(before);

    // clientA now has the step + metadata
    expect(updated.clientProgress?.clientA.completedStepIds).toEqual(['tar-step-1']);
    expect(updated.clientProgress?.clientA.stepMeta?.['tar-step-1'].completedBy).toBe('user-1');
    expect(updated.clientProgress?.clientA.stepMeta?.['tar-step-1'].completedAt).toBeTruthy();

    // Other clients unaffected
    expect(getClientCompletedStepIds(updated, 'clientB', 'tar')).toEqual([]);
  });

  it('stores remark metadata when provided', () => {
    const task = baseTask();
    const updated = updateClientStepProgress(task, 'tar-step-2', true, 'clientA', 'tar', 'user-1', '  needs review  ');
    const meta = updated.clientProgress?.clientA.stepMeta?.['tar-step-2'];
    expect(meta?.remark).toBe('needs review');
    expect(meta?.remarkBy).toBe('user-1');
  });

  it('removes a step and its metadata when reopened', () => {
    let task = baseTask();
    task = updateClientStepProgress(task, 'tar-step-1', true, 'clientA', 'tar', 'user-1');
    task = updateClientStepProgress(task, 'tar-step-1', false, 'clientA', 'tar', 'user-1');
    expect(task.clientProgress?.clientA.completedStepIds).toEqual([]);
    expect(task.clientProgress?.clientA.stepMeta?.['tar-step-1']).toBeUndefined();
  });
});

describe('getClientStepMeta — per-client metadata isolation', () => {
  it('returns metadata only for the owning client', () => {
    const task = baseTask({
      clientProgress: {
        clientA: {
          completedStepIds: ['tar-step-1'],
          stepMeta: { 'tar-step-1': { completedAt: '2026-09-01T00:00:00.000Z', completedBy: 'user-1' } },
        },
      },
    });
    expect(getClientStepMeta(task, 'clientA', 'tar-step-1', 'tar').completedBy).toBe('user-1');
    // clientB has no meta and must not read clientA's
    expect(getClientStepMeta(task, 'clientB', 'tar-step-1', 'tar')).toEqual({});
  });
});

describe('getClientProgressSummary — case-insensitive + dynamic reportTypes (Bug B)', () => {
  it('computes correct percentage for a TAR task with lowercase workflowType', () => {
    const task = baseTask({
      clientProgress: {
        clientA: { completedStepIds: ['tar-step-1', 'tar-step-2', 'tar-step-3'] },
      },
    });
    // 3 of 7 complete = 43%
    const summary = getClientProgressSummary(task, 'clientA', 'tar');
    expect(summary.total).toBe(7);
    expect(summary.completed).toBe(3);
    expect(summary.percentage).toBe(43);
    expect(summary.status).toBe('in-progress');
  });

  it('previously-broken case: lowercase "tar" no longer yields 0% total', () => {
    const task = baseTask({
      clientProgress: { clientA: { completedStepIds: ['tar-step-1'] } },
    });
    // Before the fix, key resolved to statSteps (empty) -> total 0 -> 0%.
    expect(getClientProgressSummary(task, 'clientA', 'tar').total).toBe(7);
  });

  it('supports dynamic reportTypes with custom IDs', () => {
    const task = baseTask({
      tarEnabled: false,
      tarSteps: undefined,
      reportTypes: [
        {
          id: 'tar',
          name: 'TAR Reports',
          badgeLabel: 'TAX',
          badgeClass: '',
          description: '',
          enabled: true,
          steps: makeSteps('tar', 7),
        },
      ],
      clientProgress: {
        clientA: { completedStepIds: ['tar-step-1', 'tar-step-2', 'tar-step-3', 'tar-step-4', 'tar-step-5', 'tar-step-6', 'tar-step-7'] },
      },
    });
    const summary = getClientProgressSummary(task, 'clientA', 'tar');
    expect(summary.total).toBe(7);
    expect(summary.completed).toBe(7);
    expect(summary.percentage).toBe(100);
    expect(summary.status).toBe('completed');
  });

  it('an untouched client shows 0% (not fake completion) in per-client mode', () => {
    const task = baseTask({
      clientProgress: {
        clientA: { completedStepIds: ['tar-step-1', 'tar-step-2', 'tar-step-3', 'tar-step-4', 'tar-step-5', 'tar-step-6', 'tar-step-7'] },
      },
    });
    // clientB never toggled anything — reports must show 0%, not inherit clientA's 100%.
    const summary = getClientProgressSummary(task, 'clientB', 'tar');
    expect(summary.completed).toBe(0);
    expect(summary.percentage).toBe(0);
    expect(summary.status).toBe('pending');
  });
});

describe('getClientWorkflowStatus & calculateClientProgressPercent — case-insensitive', () => {
  it('reports completed status correctly for lowercase type', () => {
    const allIds = makeSteps('tar', 7).map((s) => s.id);
    const task = baseTask({ clientProgress: { clientA: { completedStepIds: allIds } } });
    expect(getClientWorkflowStatus(task, 'clientA', 'tar')).toBe('completed');
    expect(calculateClientProgressPercent(task, 'clientA', 'tar')).toBe(100);
  });
});

describe('isStepCompletedForClient', () => {
  it('reflects per-client completion', () => {
    const task = baseTask({ clientProgress: { clientA: { completedStepIds: ['tar-step-2'] } } });
    expect(isStepCompletedForClient(task, 'tar-step-2', 'clientA', 'tar')).toBe(true);
    expect(isStepCompletedForClient(task, 'tar-step-2', 'clientB', 'tar')).toBe(false);
  });
});
