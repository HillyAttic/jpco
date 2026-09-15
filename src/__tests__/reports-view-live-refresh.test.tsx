/**
 * The reports PAGE must show progress that was marked elsewhere (recurring page,
 * calendar page) — without a hard reload.
 *
 * Renders the real ReportsView against a fake server, then changes the server's
 * answer the way a mark made on /tasks/recurring would, and asserts the page
 * catches up on its own (auto-refresh) instead of showing a stale 0%.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'uid-1', getIdToken: jest.fn().mockResolvedValue('token') } },
}));

// the firebase SDK's node entrypoint needs fetch, which jsdom does not provide
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(), getAuth: jest.fn() }));
jest.mock('@/lib/api-client', () => ({
  authenticatedFetch: jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })),
  apiGet: jest.fn(),
  apiPut: jest.fn(),
  apiPost: jest.fn(),
}));

jest.mock('@/services/client.service', () => ({
  clientService: { getAll: jest.fn() },
}));

jest.mock('@/utils/report-export.utils', () => ({
  exportSummaryToPDF: jest.fn(),
  exportSummaryToExcel: jest.fn(),
}));

jest.mock('@/contexts/modal-context', () => ({
  useModal: () => ({ openModal: jest.fn(), closeModal: jest.fn() }),
}));

import { ReportsView } from '@/components/reports/ReportsView';
import { clientService } from '@/services/client.service';
import { initializeWorkflowSteps } from '@/lib/workflow-templates';

const STEP_IDS = initializeWorkflowSteps('TAR').map((s) => s.id);
const CLIENT_ID = 'client-capal';

/** The task as the server holds it; mutate to simulate writes made elsewhere. */
const serverTask = {
  id: 'task-1',
  title: 'TAX AUDIT',
  recurrencePattern: 'monthly',
  status: 'pending',
  tarEnabled: true,
  tarSteps: initializeWorkflowSteps('TAR'),
  teamMemberMappings: [{ userId: 'uid-1', userName: 'Ajay Chaudhary', clientIds: [CLIENT_ID] }],
  contactIds: [],
  clientProgress: {} as Record<string, { completedStepIds: string[] }>,
};

const serverClients = [{ id: CLIENT_ID, clientName: 'CAPAL INDUSTRIES PVT LTD (DL)' }];

beforeEach(() => {
  jest.clearAllMocks();
  serverTask.clientProgress = {};
  (clientService.getAll as jest.Mock).mockResolvedValue(serverClients);

  global.fetch = jest.fn(async (input: any) => {
    const url = String(input);
    if (url.startsWith('/api/recurring-tasks')) {
      return { ok: true, status: 200, json: async () => [JSON.parse(JSON.stringify(serverTask))] } as any;
    }
    if (url.startsWith('/api/task-completions')) {
      return { ok: true, status: 200, json: async () => [] } as any;
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

it('shows 0% then picks up a mark made on another page without a reload', async () => {
  jest.useFakeTimers();
  try {
    render(<ReportsView />);

    // initial load: nothing marked yet (desktop table + mobile card both render it)
    await waitFor(() => expect(screen.getAllByText('0%').length).toBeGreaterThan(0));
    expect(screen.queryByText('100%')).not.toBeInTheDocument();

    // meanwhile, the user hits "Mark all complete" on /tasks/recurring —
    // the server now holds 7 completed steps for this client.
    serverTask.clientProgress = { [CLIENT_ID]: { completedStepIds: [...STEP_IDS] } };

    // the page is still open; its auto-refresh should pull the new state
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    await waitFor(() => expect(screen.getAllByText('100%').length).toBeGreaterThan(0));
  } finally {
    jest.useRealTimers();
  }
});

it('refreshes immediately when the user returns to the reports tab', async () => {
  const hidden = jest.spyOn(document, 'hidden', 'get');
  hidden.mockReturnValue(false);
  try {
    render(<ReportsView />);
    await waitFor(() => expect(screen.getAllByText('0%').length).toBeGreaterThan(0));

    serverTask.clientProgress = { [CLIENT_ID]: { completedStepIds: [...STEP_IDS] } };

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(screen.getAllByText('100%').length).toBeGreaterThan(0));
  } finally {
    hidden.mockRestore();
  }
});

it('renders a fully marked client as 100%', async () => {
  serverTask.clientProgress = { [CLIENT_ID]: { completedStepIds: [...STEP_IDS] } };

  render(<ReportsView />);

  await waitFor(() => expect(screen.getAllByText('100%').length).toBeGreaterThan(0));
});

it('summary % counts fully-complete clients, not steps (per-step detail is in the detail modal)', async () => {
  serverTask.clientProgress = { [CLIENT_ID]: { completedStepIds: STEP_IDS.slice(0, 5) } };

  render(<ReportsView />);

  // 5 of 7 steps: the client is not done, so the summary row stays at 0%
  await waitFor(() => expect(screen.getAllByText('0%').length).toBeGreaterThan(0));
  expect(screen.queryByText('71%')).not.toBeInTheDocument();
});
