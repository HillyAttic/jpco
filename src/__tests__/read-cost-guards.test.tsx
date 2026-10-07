/**
 * Guards the two Firestore read-cost fixes.
 *
 * Firestore bills executions x documents returned, so what is worth asserting is
 * *how many times* each data source is hit — not what it returns.
 *
 *   1. clientService.getAll is memoized, so reopening a task modal is free.
 *   2. ReportsView's 30s tick does not re-run its per-task fan-out when nothing changed.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';

jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'uid-1', getIdToken: jest.fn().mockResolvedValue('token') } },
}));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(), getAuth: jest.fn() }));
jest.mock('@/lib/api-client', () => ({
  authenticatedFetch: jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })),
}));
jest.mock('@/utils/report-export.utils', () => ({
  exportSummaryToPDF: jest.fn(),
  exportSummaryToExcel: jest.fn(),
}));
jest.mock('@/contexts/modal-context', () => ({
  useModal: () => ({ openModal: jest.fn(), closeModal: jest.fn() }),
}));

// Every Firestore read in this file funnels through here, so the counter is the meter.
let clientsFirestoreReads = 0;
jest.mock('@/services/firebase.service', () => ({
  createFirebaseService: () => ({
    getAll: async () => {
      clientsFirestoreReads++;
      return [{ id: 'c1', clientName: 'CLIENT ONE', status: 'active' }];
    },
  }),
}));

import { clientService, invalidateClientCache } from '@/services/client.service';
import { ReportsView } from '@/components/reports/ReportsView';
import { initializeWorkflowSteps } from '@/lib/workflow-templates';

const steps = initializeWorkflowSteps('TAR');

describe('clientService.getAll memo', () => {
  beforeEach(() => {
    clientsFirestoreReads = 0;
    invalidateClientCache();
  });

  it('reads Firestore once for repeated identical calls and returns the same array', async () => {
    const first = await clientService.getAll({ status: 'active', limit: 1000 });
    const second = await clientService.getAll({ status: 'active', limit: 1000 });

    expect(clientsFirestoreReads).toBe(1);
    expect(second).toBe(first);
  });

  it('re-reads after invalidateClientCache', async () => {
    await clientService.getAll({ status: 'active', limit: 1000 });
    invalidateClientCache();
    await clientService.getAll({ status: 'active', limit: 1000 });

    expect(clientsFirestoreReads).toBe(2);
  });

  it('caches different filters separately', async () => {
    await clientService.getAll();
    await clientService.getAll({ status: 'active', limit: 1000 });

    expect(clientsFirestoreReads).toBe(2);
  });
});

// ── ReportsView tick fan-out ─────────────────────────────────────────────────

/** Three recurring tasks; t1 has a compliance filter, so both fan-out loops apply to it. */
const makeTask = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: `TASK ${id}`,
  recurrencePattern: 'monthly',
  status: 'pending',
  tarEnabled: true,
  tarSteps: steps,
  teamMemberMappings: [],
  contactIds: [],
  clientProgress: {},
  ...extra,
});

describe('ReportsView read-cost guards', () => {
  let completionsCalls = 0;
  let unassignedCalls = 0;
  let taskListCalls = 0;
  let tasks: ReturnType<typeof makeTask>[] = [];

  beforeEach(() => {
    completionsCalls = 0;
    unassignedCalls = 0;
    taskListCalls = 0;
    tasks = [
      makeTask('t1', { clientFilter: 'roc', showUnassignedClients: true }),
      makeTask('t2'),
      makeTask('t3'),
    ];

    global.fetch = jest.fn(async (input: any) => {
      const url = String(input);
      const ok = (body: any) => ({ ok: true, status: 200, json: async () => body });

      // Must be checked before the bare task-list prefix.
      if (url.startsWith('/api/recurring-tasks/')) {
        unassignedCalls++;
        return ok({ totalCount: 1, mappedCount: 0, unassignedCount: 1, unassignedClientIds: ['c1'] });
      }
      if (url.startsWith('/api/recurring-tasks')) {
        taskListCalls++;
        return ok(tasks);
      }
      if (url.startsWith('/api/task-completions')) {
        completionsCalls++;
        return ok([]);
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;
  });

  it('fans out on load, but not again on an unchanged 30s tick', async () => {
    jest.useFakeTimers();
    try {
      render(<ReportsView />);

      await waitFor(() => expect(taskListCalls).toBe(1));
      await waitFor(() => expect(completionsCalls).toBe(3)); // one per task
      await waitFor(() => expect(unassignedCalls).toBe(2)); // dynamicStats + unassigned list

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      await waitFor(() => expect(taskListCalls).toBe(2)); // the tick did run
      await act(async () => {});

      expect(completionsCalls).toBe(3);
      expect(unassignedCalls).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('re-runs the fan-out when the task list actually changed', async () => {
    jest.useFakeTimers();
    try {
      render(<ReportsView />);

      await waitFor(() => expect(completionsCalls).toBe(3));
      await waitFor(() => expect(unassignedCalls).toBe(2));

      // Someone marks a step elsewhere: clientProgress lands on the task doc.
      tasks[0].clientProgress = { c1: { completedStepIds: steps.map((s) => s.id) } };

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      await waitFor(() => expect(unassignedCalls).toBe(4));
      // No detail modal is open, so the tick refreshes no completions at all.
      expect(completionsCalls).toBe(3);
    } finally {
      jest.useRealTimers();
    }
  });
});
