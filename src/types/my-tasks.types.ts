export interface MyTask {
    id: string;
    listId: string;           // The task list (head) this task belongs to
    userId: string;           // Firebase user UID
    title: string;
    notes: string;
    completed: boolean;
    dueDate: Date | null;
    order: number;            // For manual sorting within a list
    createdAt: Date;
    updatedAt: Date;
}

export interface TaskList {
    id: string;
    userId: string;           // Firebase user UID
    name: string;
    color: string;            // Accent color for the list
    order: number;            // For manual sorting of lists
    createdAt: Date;
    updatedAt: Date;
}

// Colors available for task lists
export const TASK_LIST_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#14B8A6', // Teal
];
