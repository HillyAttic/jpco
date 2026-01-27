export type KanbanStatus = 'todo' | 'in-progress' | 'completed';

export interface KanbanAssignee {
  name: string;
  role: string;
  avatarColor: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: KanbanStatus;
  dueDate: Date;
  priority?: 'low' | 'medium' | 'high';
  commentsCount?: number;
  attachmentsCount?: number;
  assignee: KanbanAssignee;
  tags?: string[];
  createdAt: Date;
  businessId: string;
}

export interface Business {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: Date;
}

export interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  color: string;
}

export interface KanbanFilters {
  status?: KanbanStatus[];
  assignee?: string[];
  dueDate?: 'today' | 'this-week' | 'overdue' | 'all';
}

export interface KanbanSort {
  field: 'dueDate' | 'priority' | 'createdAt';
  direction: 'asc' | 'desc';
}
