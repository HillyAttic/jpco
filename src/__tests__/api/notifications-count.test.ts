/**
 * Guards the "documents returned" half of the notifications bill.
 *
 * @jest-environment node
 *
 * The hook test (src/__tests__/notification-read-cost.test.tsx) guards how often the route
 * is called; this one guards how many documents each call costs. The badge poll must be an
 * aggregation — ~1 billed read per 1000 matched index entries — not a 50-document list read.
 *
 * Node environment on purpose: NextResponse's constructor touches ResponseCookies, which
 * needs a real Response/Headers, and jsdom provides neither.
 */

// Factories, not automock: automocking still loads the real module to read its shape, and
// the real server-auth pulls in firebase-admin, whose jose dependency is ESM.
jest.mock('@/lib/server-auth', () => ({ verifyAuthToken: jest.fn() }));
jest.mock('@/lib/firebase-admin', () => ({ adminDb: null }));

import { GET } from '@/app/api/notifications/route';

const countGet = jest.fn();
const docsGet = jest.fn();
const query: any = {};

const request = (qs: string) =>
  ({ nextUrl: { searchParams: new URLSearchParams(qs) } }) as any;

const body = async (res: any) => res.json();

beforeEach(() => {
  jest.clearAllMocks();

  query.where = jest.fn(() => query);
  query.orderBy = jest.fn(() => query);
  query.limit = jest.fn(() => query);
  query.count = jest.fn(() => ({ get: countGet }));
  query.get = docsGet;

  require('@/lib/server-auth').verifyAuthToken = jest.fn(async () => ({
    success: true,
    user: { uid: 'uid-1', claims: { role: 'employee' } },
  }));
  require('@/lib/firebase-admin').adminDb = { collection: jest.fn(() => query) };

  countGet.mockResolvedValue({ data: () => ({ count: 7 }) });
  docsGet.mockResolvedValue({ size: 3, docs: [] });
});

it('answers the badge from an aggregation without reading any documents', async () => {
  const res = await GET(request('userId=uid-1&count=1'));

  expect(await body(res)).toEqual({ unreadCount: 7 });
  expect(countGet).toHaveBeenCalledTimes(1);
  expect(docsGet).not.toHaveBeenCalled();
  expect(query.orderBy).not.toHaveBeenCalled(); // no ordered list read either
});

it('still counts correctly if the aggregation is unavailable', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  countGet.mockRejectedValue(new Error('aggregation unsupported'));

  try {
    const res = await GET(request('userId=uid-1&count=1'));

    expect(await body(res)).toEqual({ unreadCount: 3 });
    expect(docsGet).toHaveBeenCalledTimes(1);
    expect(query.limit).toHaveBeenCalledWith(50); // never worse than the read it replaces
  } finally {
    warn.mockRestore();
  }
});

it('leaves the default list response untouched', async () => {
  const res = await GET(request('userId=uid-1'));

  expect(await body(res)).toEqual({ notifications: [] });
  expect(countGet).not.toHaveBeenCalled();
});
