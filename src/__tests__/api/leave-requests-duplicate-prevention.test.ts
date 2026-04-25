// Mock dependencies before imports
jest.mock('@/lib/server-auth');
jest.mock('@/lib/firebase-admin');
jest.mock('@/lib/notifications/send-notification');

// Mock Next.js server components
global.Request = class Request {
  constructor(public url: string, public init?: any) {}
  async json() {
    return this.init?.body ? JSON.parse(this.init.body) : {};
  }
} as any;

global.Response = class Response {
  constructor(public body: any, public init?: any) {}
  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }
  get status() {
    return this.init?.status || 200;
  }
} as any;

import { POST } from '@/app/api/leave-requests/route';

describe('Leave Requests API - Duplicate Prevention', () => {
  const mockVerifyAuthToken = jest.fn();
  const mockAdminDb = {
    collection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup auth mock
    require('@/lib/server-auth').verifyAuthToken = mockVerifyAuthToken;

    // Setup firebase admin mock
    require('@/lib/firebase-admin').adminDb = mockAdminDb;

    // Setup notification mock
    require('@/lib/notifications/send-notification').sendNotification = jest.fn();
  });

  const createMockRequest = (body: any): any => {
    return {
      json: async () => body,
      url: 'http://localhost:3000/api/leave-requests',
      headers: new Map(),
      method: 'POST',
    };
  };

  const mockAuthResult = {
    success: true,
    user: {
      uid: 'test-user-123',
      email: 'test@example.com',
      claims: { role: 'employee' },
    },
  };

  const mockUserDoc = {
    data: () => ({
      displayName: 'Test User',
      email: 'test@example.com',
    }),
  };

  it('should reject duplicate request within 5-minute window', async () => {
    mockVerifyAuthToken.mockResolvedValue(mockAuthResult);

    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    // Mock existing duplicate request
    const mockExistingDoc = {
      id: 'existing-request-123',
      data: () => ({
        employeeId: 'test-user-123',
        leaveType: 'sick',
        startDate: { toDate: () => new Date('2026-05-01') },
        endDate: { toDate: () => new Date('2026-05-02') },
        halfDay: false,
        createdAt: { toDate: () => twoMinutesAgo },
      }),
    };

    mockAdminDb.collection.mockImplementation((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          doc: () => ({
            get: async () => ({ data: () => mockUserDoc.data() }),
          }),
        };
      }
      if (collectionName === 'leave-requests') {
        return {
          where: jest.fn().mockReturnThis(),
          get: async () => ({
            docs: [mockExistingDoc],
          }),
          add: jest.fn(),
        };
      }
      return {};
    });

    const request = createMockRequest({
      leaveType: 'sick',
      startDate: '2026-05-01',
      endDate: '2026-05-02',
      reason: 'Not feeling well',
      halfDay: false,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('Duplicate request detected');
    expect(data.existingRequestId).toBe('existing-request-123');
  });

  it('should allow identical request after 5-minute window', async () => {
    mockVerifyAuthToken.mockResolvedValue(mockAuthResult);

    const now = new Date();
    const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);

    // Mock old request (outside 5-minute window)
    const mockOldDoc = {
      id: 'old-request-123',
      data: () => ({
        employeeId: 'test-user-123',
        leaveType: 'sick',
        startDate: { toDate: () => new Date('2026-05-01') },
        endDate: { toDate: () => new Date('2026-05-02') },
        halfDay: false,
        createdAt: { toDate: () => sixMinutesAgo },
      }),
    };

    const mockDocRef = { id: 'new-request-456' };

    mockAdminDb.collection.mockImplementation((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          doc: () => ({
            get: async () => ({ data: () => mockUserDoc.data() }),
          }),
        };
      }
      if (collectionName === 'leave-requests') {
        return {
          where: jest.fn().mockReturnThis(),
          get: async () => ({
            docs: [], // No recent duplicates
          }),
          add: async () => mockDocRef,
        };
      }
      if (collectionName === 'manager-hierarchies') {
        return {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: async () => ({ empty: true, docs: [] }),
        };
      }
      return {};
    });

    const request = createMockRequest({
      leaveType: 'sick',
      startDate: '2026-05-01',
      endDate: '2026-05-02',
      reason: 'Not feeling well',
      halfDay: false,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('new-request-456');
  });

  it('should allow different leave type with same dates', async () => {
    mockVerifyAuthToken.mockResolvedValue(mockAuthResult);

    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    // Mock existing sick leave request
    const mockExistingDoc = {
      id: 'existing-request-123',
      data: () => ({
        employeeId: 'test-user-123',
        leaveType: 'sick',
        startDate: { toDate: () => new Date('2026-05-01') },
        endDate: { toDate: () => new Date('2026-05-02') },
        halfDay: false,
        createdAt: { toDate: () => twoMinutesAgo },
      }),
    };

    const mockDocRef = { id: 'new-request-456' };

    mockAdminDb.collection.mockImplementation((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          doc: () => ({
            get: async () => ({ data: () => mockUserDoc.data() }),
          }),
        };
      }
      if (collectionName === 'leave-requests') {
        return {
          where: jest.fn().mockReturnThis(),
          get: async () => ({
            docs: [], // Different leave type, so no match
          }),
          add: async () => mockDocRef,
        };
      }
      if (collectionName === 'manager-hierarchies') {
        return {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: async () => ({ empty: true, docs: [] }),
        };
      }
      return {};
    });

    const request = createMockRequest({
      leaveType: 'casual', // Different type
      startDate: '2026-05-01',
      endDate: '2026-05-02',
      reason: 'Personal work',
      halfDay: false,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('new-request-456');
  });

  it('should allow different dates with same leave type', async () => {
    mockVerifyAuthToken.mockResolvedValue(mockAuthResult);

    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    // Mock existing request with different dates
    const mockExistingDoc = {
      id: 'existing-request-123',
      data: () => ({
        employeeId: 'test-user-123',
        leaveType: 'sick',
        startDate: { toDate: () => new Date('2026-05-01') },
        endDate: { toDate: () => new Date('2026-05-02') },
        halfDay: false,
        createdAt: { toDate: () => twoMinutesAgo },
      }),
    };

    const mockDocRef = { id: 'new-request-456' };

    mockAdminDb.collection.mockImplementation((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          doc: () => ({
            get: async () => ({ data: () => mockUserDoc.data() }),
          }),
        };
      }
      if (collectionName === 'leave-requests') {
        return {
          where: jest.fn().mockReturnThis(),
          get: async () => ({
            docs: [mockExistingDoc], // Has docs but dates don't match
          }),
          add: async () => mockDocRef,
        };
      }
      if (collectionName === 'manager-hierarchies') {
        return {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: async () => ({ empty: true, docs: [] }),
        };
      }
      return {};
    });

    const request = createMockRequest({
      leaveType: 'sick',
      startDate: '2026-05-10', // Different dates
      endDate: '2026-05-11',
      reason: 'Not feeling well',
      halfDay: false,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('new-request-456');
  });

  it('should allow different halfDay flag with same dates', async () => {
    mockVerifyAuthToken.mockResolvedValue(mockAuthResult);

    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    // Mock existing full-day request
    const mockExistingDoc = {
      id: 'existing-request-123',
      data: () => ({
        employeeId: 'test-user-123',
        leaveType: 'sick',
        startDate: { toDate: () => new Date('2026-05-01') },
        endDate: { toDate: () => new Date('2026-05-01') },
        halfDay: false,
        createdAt: { toDate: () => twoMinutesAgo },
      }),
    };

    const mockDocRef = { id: 'new-request-456' };

    mockAdminDb.collection.mockImplementation((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          doc: () => ({
            get: async () => ({ data: () => mockUserDoc.data() }),
          }),
        };
      }
      if (collectionName === 'leave-requests') {
        return {
          where: jest.fn().mockReturnThis(),
          get: async () => ({
            docs: [mockExistingDoc], // Has docs but halfDay doesn't match
          }),
          add: async () => mockDocRef,
        };
      }
      if (collectionName === 'manager-hierarchies') {
        return {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: async () => ({ empty: true, docs: [] }),
        };
      }
      return {};
    });

    const request = createMockRequest({
      leaveType: 'sick',
      startDate: '2026-05-01',
      endDate: '2026-05-01',
      reason: 'Doctor appointment',
      halfDay: true, // Different halfDay flag
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('new-request-456');
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockVerifyAuthToken.mockResolvedValue({
      success: false,
      user: null,
    });

    const request = createMockRequest({
      leaveType: 'sick',
      startDate: '2026-05-01',
      endDate: '2026-05-02',
      reason: 'Not feeling well',
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid data', async () => {
    mockVerifyAuthToken.mockResolvedValue(mockAuthResult);

    const request = createMockRequest({
      leaveType: 'invalid-type', // Invalid leave type
      startDate: '2026-05-01',
      endDate: '2026-05-02',
      reason: 'Not feeling well',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
