/**
 * Client Visit Tracking Types
 */

export interface ClientVisit {
  id?: string;
  clientId: string;
  clientName: string;
  employeeId: string;
  employeeName: string;
  visitDate: Date;
  taskId: string;
  taskTitle: string;
  taskType: 'recurring' | 'non-recurring';
  completedAt?: Date;
  arnNumber?: string;
  arnName?: string;
  notes?: string;
  createdAt?: Date;
}

export interface ClientVisitFilters {
  clientId?: string;
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
}

export interface ClientVisitStats {
  totalVisits: number;
  uniqueClients: number;
  uniqueEmployees: number;
  visitsByClient: { clientName: string; count: number }[];
  visitsByEmployee: { employeeName: string; count: number }[];
}
