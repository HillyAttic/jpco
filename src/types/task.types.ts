export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in-progress",
  COMPLETED = "completed",
  PENDING = "pending",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: string[];
  category?: string;
  commentCount?: number;
}

export interface Comment {
  id: string;
  taskId: string;
  author: string;
  content: string;
  createdAt: Date;
}