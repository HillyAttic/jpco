import { roleManagementService } from '@/services/role-management.service';
import { UserRole, ROLE_CONFIGS } from '@/types/auth.types';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(),
  getDoc: jest.fn(() => ({
    exists: () => false,
    data: () => null,
  })),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

describe('RoleManagementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role Configuration', () => {
    test('should have valid role configurations for all roles', () => {
      const roles: UserRole[] = ['admin', 'manager', 'employee'];
      
      roles.forEach(role => {
        expect(ROLE_CONFIGS[role]).toBeDefined();
        expect(ROLE_CONFIGS[role].role).toBe(role);
        expect(ROLE_CONFIGS[role].permissions).toBeInstanceOf(Array);
        expect(ROLE_CONFIGS[role].description).toBeTruthy();
      });
    });

    test('admin should have all permissions', () => {
      const adminConfig = ROLE_CONFIGS.admin;
      expect(adminConfig.canManageUsers).toBe(true);
      expect(adminConfig.canViewReports).toBe(true);
      expect(adminConfig.canManageTasks).toBe(true);
      expect(adminConfig.permissions.length).toBeGreaterThan(0);
    });

    test('employee should have minimal permissions', () => {
      const employeeConfig = ROLE_CONFIGS.employee;
      expect(employeeConfig.canManageUsers).toBe(false);
      expect(employeeConfig.canViewReports).toBe(false);
      expect(employeeConfig.canManageTasks).toBe(false);
    });

    test('manager should have intermediate permissions', () => {
      const managerConfig = ROLE_CONFIGS.manager;
      expect(managerConfig.canManageUsers).toBe(false);
      expect(managerConfig.canViewReports).toBe(true);
      expect(managerConfig.canManageTasks).toBe(true);
    });
  });

  describe('Permission Hierarchy', () => {
    test('admin should have more permissions than manager', () => {
      const adminPermissions = ROLE_CONFIGS.admin.permissions.length;
      const managerPermissions = ROLE_CONFIGS.manager.permissions.length;
      expect(adminPermissions).toBeGreaterThan(managerPermissions);
    });

    test('manager should have more permissions than employee', () => {
      const managerPermissions = ROLE_CONFIGS.manager.permissions.length;
      const employeePermissions = ROLE_CONFIGS.employee.permissions.length;
      expect(managerPermissions).toBeGreaterThan(employeePermissions);
    });
  });

  describe('Role Assignment', () => {
    test('should assign role with correct permissions', async () => {
      const mockUpdateDoc = require('firebase/firestore').updateDoc;
      const mockDoc = require('firebase/firestore').doc;
      mockUpdateDoc.mockResolvedValue(undefined);
      mockDoc.mockReturnValue({});

      await roleManagementService.assignRole('user123', 'manager', 'admin123');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          role: 'manager',
          permissions: ROLE_CONFIGS.manager.permissions.map(p => p.id),
        })
      );
    });
  });

  describe('Permission Validation', () => {
    test('should validate permission format', () => {
      Object.values(ROLE_CONFIGS).forEach(config => {
        config.permissions.forEach(permission => {
          expect(permission.id).toBeTruthy();
          expect(permission.name).toBeTruthy();
          expect(permission.description).toBeTruthy();
          expect(permission.resource).toBeTruthy();
          expect(permission.action).toBeTruthy();
        });
      });
    });

    test('should have unique permission IDs within each role', () => {
      Object.values(ROLE_CONFIGS).forEach(config => {
        const permissionIds = config.permissions.map(p => p.id);
        const uniqueIds = new Set(permissionIds);
        expect(uniqueIds.size).toBe(permissionIds.length);
      });
    });
  });
});