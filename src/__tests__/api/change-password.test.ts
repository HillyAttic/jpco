/**
 * @jest-environment node
 *
 * Tests for POST /api/auth/change-password — self-service password change.
 * The real verifyAuthToken runs, so authentication is exercised end to end.
 */

jest.mock('@/lib/firebase-admin', () => {
  const mocks = {
    verifyIdToken: jest.fn(),
    profileGet: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
  };
  return {
    __esModule: true,
    __mocks: mocks,
    default: { auth: () => ({ verifyIdToken: mocks.verifyIdToken }) },
    adminAuth: { getUser: mocks.getUser, updateUser: mocks.updateUser },
    adminDb: { collection: () => ({ doc: () => ({ get: mocks.profileGet }) }) },
  };
});

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/change-password/route';
import { invalidateProfileCache } from '@/lib/server-auth';

const { __mocks } = jest.requireMock('@/lib/firebase-admin') as any;
const { verifyIdToken, profileGet, getUser, updateUser } = __mocks;

const VALID_BODY = { currentPassword: 'old-password', newPassword: 'new-password' };

function makeRequest(body: unknown, authorized = true) {
  return new NextRequest('http://localhost/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorized ? { authorization: 'Bearer test-token' } : {}),
    },
    body: JSON.stringify(body),
  });
}

function authenticateAs(role: 'admin' | 'manager' | 'employee') {
  verifyIdToken.mockResolvedValue({ uid: `caller-${role}`, email: 'caller@example.com' });
  // The role comes from the Firestore profile, since the token carries no claim here.
  profileGet.mockResolvedValue({ exists: true, data: () => ({ role }) });
  getUser.mockResolvedValue({ uid: `caller-${role}`, email: 'caller@example.com' });
}

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateProfileCache('caller-admin');
    invalidateProfileCache('caller-manager');
    invalidateProfileCache('caller-employee');
    global.fetch = jest.fn();
  });

  it('rejects callers with no token', async () => {
    const response = await POST(makeRequest(VALID_BODY, false), undefined);

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(['admin', 'manager', 'employee'] as const)('lets a %s change their own password', async (role) => {
    authenticateAs(role);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    updateUser.mockResolvedValue({});

    const response = await POST(makeRequest(VALID_BODY), undefined);

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(`caller-${role}`, { password: 'new-password' });
  });

  it('ignores a body-supplied uid, so no caller can target another account', async () => {
    authenticateAs('manager');
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    updateUser.mockResolvedValue({});

    await POST(makeRequest({ ...VALID_BODY, uid: 'someone-else', email: 'victim@example.com' }), undefined);

    expect(updateUser).toHaveBeenCalledWith('caller-manager', { password: 'new-password' });
  });

  it('rejects a body that fails validation', async () => {
    authenticateAs('employee');

    const response = await POST(
      makeRequest({ currentPassword: '', newPassword: 'short' }),
      undefined
    );

    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a wrong current password', async () => {
    authenticateAs('employee');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }),
    });

    const response = await POST(makeRequest(VALID_BODY), undefined);

    expect(response.status).toBe(401);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('reports an infrastructure failure as 502, not a wrong password', async () => {
    authenticateAs('employee');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'API_KEY_HTTP_REFERRER_BLOCKED' } }),
    });

    const response = await POST(makeRequest(VALID_BODY), undefined);

    expect(response.status).toBe(502);
    expect((await response.json()).message).toContain('API_KEY_HTTP_REFERRER_BLOCKED');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('verifies against the address on the Auth record, not the token', async () => {
    authenticateAs('employee');
    getUser.mockResolvedValue({ uid: 'caller-employee', email: 'current@example.com' });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    updateUser.mockResolvedValue({});

    await POST(makeRequest(VALID_BODY), undefined);

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(init.body).email).toBe('current@example.com');
  });
});
