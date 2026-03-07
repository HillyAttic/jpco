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

export interface TaskAttachment {
  name: string;       // original filename
  url: string;        // Firebase Storage download URL
  type: string;       // MIME type
  size: number;       // bytes
  storagePath: string; // path in storage for deletion
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: string[];
  createdBy?: string;
  contactId?: string;
  category?: string;
  commentCount?: number;
  attachments?: TaskAttachment[];
}

export interface Comment {
  id: string;
  taskId: string;
  author: string;
  authorId?: string;
  content: string;
  createdAt: Date;
}