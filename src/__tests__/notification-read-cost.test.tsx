/**
 * Guards the /notifications read-cost fix.
 *
 * Firestore bills executions x documents returned. The route used to be polled every 30s
 * from two globally-mounted hooks (header bell + mobile badge), each poll returning up to
 * 50 documents — 61,527 executions x 43 docs = 2.66M reads/30d. What is worth asserting is
 * therefore *what a tick asks for* (a count aggregation, not the list) and *whether it
 * runs at all* (not in a hidden tab), not what it renders.
 */

jest.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(), getAuth: jest.fn() }));
jest.mock('@/hooks/use-auth-enhanced', () => ({
  useAuthEnhanced: () => ({ user: { uid: 'uid-1' } }),
}));

// ── The meter: every poll funnels through authenticatedFetch, so the URLs are the count.
const mockCalls: string[] = [];
let mockUnread = 2;
let mockList: any[] = [];

jest.mock('@/lib/api-client', () => ({
  authenticatedFetch: jest.fn(async (url: string) => {
    mockCalls.push(url);
    if (url.includes('count=1')) {
      return { ok: true, status: 200, json: async () => ({ unreadCount: mockUnread }) };
    }
    return { ok: true, status: 200, json: async () => ({ notifications: mockList }) };
  }),
}));

import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotifications } from '@/hooks/use-notifications';

const notif = (id: string, read: boolean) => ({
  id,
  title: `N ${id}`,
  body: 'b',
  read,
  createdAt: '2026-01-01T00:00:00.000Z',
  type: 'general',
});

const countPolls = () => mockCalls.filter((u) => u.includes('count=1')).length;
const listPolls = () => mockCalls.filter((u) => !u.includes('count=1')).length;

describe('useNotifications polling', () => {
  beforeEach(() => {
    mockCalls.length = 0;
    mockUnread = 2;
    mockList = [notif('n1', false), notif('n2', false), notif('n3', true)];
  });

  it('loads the list once on mount and derives the badge from it', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.unreadCount).toBe(2));
    expect(listPolls()).toBe(1);
    expect(countPolls()).toBe(0);
  });

  it('polls the count, never the list, on a 30s tick', async () => {
    jest.useFakeTimers();
    try {
      renderHook(() => useNotifications());
      await waitFor(() => expect(listPolls()).toBe(1));

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      expect(countPolls()).toBe(1);
      expect(listPolls()).toBe(1); // unchanged — no 50-document read
      expect(mockCalls[1]).toContain('count=1');
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not poll at all while the tab is hidden', async () => {
    const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    jest.useFakeTimers();
    try {
      renderHook(() => useNotifications());
      await waitFor(() => expect(listPolls()).toBe(1)); // mount still loads

      await act(async () => {
        jest.advanceTimersByTime(90_000);
      });

      expect(countPolls()).toBe(0);
      expect(listPolls()).toBe(1);
    } finally {
      jest.useRealTimers();
      hidden.mockRestore();
    }
  });

  it('polls as soon as the tab becomes visible again', async () => {
    const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    jest.useFakeTimers();
    try {
      renderHook(() => useNotifications());
      await waitFor(() => expect(listPolls()).toBe(1));

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(countPolls()).toBe(1);
    } finally {
      jest.useRealTimers();
      hidden.mockRestore();
    }
  });

  it('fetches the list when the count rises, so new mail still appears on its own', async () => {
    jest.useFakeTimers();
    try {
      renderHook(() => useNotifications());
      await waitFor(() => expect(listPolls()).toBe(1));

      // first tick only establishes the baseline — no redundant list read
      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      expect(listPolls()).toBe(1);

      mockUnread = 4; // a notification arrived
      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      expect(listPolls()).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not refetch the list when the count falls (our own mark-as-read)', async () => {
    jest.useFakeTimers();
    try {
      renderHook(() => useNotifications());
      await waitFor(() => expect(listPolls()).toBe(1));

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      mockUnread = 1; // the user read one
      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      expect(listPolls()).toBe(1); // no 43-read echo of an action we already applied
      expect(countPolls()).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
