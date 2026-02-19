/**
 * Manager-Employee Hierarchy Types
 */

export interface ManagerHierarchy {
  id?: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  employeeIds: string[];
  employees: EmployeeInfo[];
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  email: string;
  department?: string;
}

export interface ManagerHierarchyFilters {
  managerId?: string;
  search?: string;
  limit?: number;
}
