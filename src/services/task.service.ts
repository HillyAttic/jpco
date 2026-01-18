import { Task, Comment, TaskStatus, TaskPriority } from '@/types/task.types';

// Mock data for tasks
let tasks: Task[] = [
  {
    id: '1',
    title: 'Design Homepage',
    description: 'Create wireframes and mockups for the homepage',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    assignedTo: ['John Doe'],
    category: 'Design',
    commentCount: 3,
  },
  {
    id: '2',
    title: 'API Integration',
    description: 'Integrate with third-party APIs',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    assignedTo: ['Jane Smith', 'Bob Johnson'],
    category: 'Development',
    commentCount: 1,
  },
  {
    id: '3',
    title: 'Write Documentation',
    description: 'Document the new features',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.LOW,
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    assignedTo: ['Alice Williams'],
    category: 'Documentation',
    commentCount: 5,
  },
];

// Mock data for comments
let comments: Comment[] = [
  {
    id: '1',
    taskId: '1',
    author: 'John Doe',
    content: 'Started working on the wireframes',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    taskId: '1',
    author: 'Jane Smith',
    content: 'Can you share the initial designs?',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    taskId: '1',
    author: 'Bob Johnson',
    content: 'Looks good so far!',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: '4',
    taskId: '2',
    author: 'Jane Smith',
    content: 'API integration is 70% complete',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '5',
    taskId: '3',
    author: 'Alice Williams',
    content: 'Documentation is finalized',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

export const taskService = {
  getAll: (filters: { status?: TaskStatus; priority?: TaskPriority; search?: string; category?: string } = {}) => {
    let filteredTasks = [...tasks];

    if (filters.status) {
      filteredTasks = filteredTasks.filter(task => task.status === filters.status);
    }

    if (filters.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredTasks = filteredTasks.filter(
        task =>
          task.title.toLowerCase().includes(searchTerm) ||
          task.description?.toLowerCase().includes(searchTerm) ||
          task.category?.toLowerCase().includes(searchTerm) ||
          task.assignedTo.some(user => user.toLowerCase().includes(searchTerm))
      );
    }

    if (filters.category) {
      filteredTasks = filteredTasks.filter(task => task.category === filters.category);
    }

    return filteredTasks;
  },

  getById: (id: string) => {
    return tasks.find(task => task.id === id) || null;
  },

  create: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'commentCount'>) => {
    const newTask: Task = {
      ...taskData,
      id: String(tasks.length + 1),
      createdAt: new Date(),
      updatedAt: new Date(),
      commentCount: 0,
    };
    tasks.push(newTask);
    return newTask;
  },

  update: (id: string, taskData: Partial<Task>) => {
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...taskData,
        updatedAt: new Date(),
      };
      return tasks[taskIndex];
    }
    return null;
  },

  delete: (id: string) => {
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      tasks.splice(taskIndex, 1);
      // Remove associated comments
      comments = comments.filter(comment => comment.taskId !== id);
      return true;
    }
    return false;
  },

  addComment: (taskId: string, commentData: Omit<Comment, 'id' | 'taskId' | 'createdAt'>) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    const newComment: Comment = {
      ...commentData,
      id: String(comments.length + 1),
      taskId,
      createdAt: new Date(),
    };

    comments.push(newComment);

    // Update comment count on the task
    task.commentCount = (task.commentCount || 0) + 1;
    task.updatedAt = new Date();

    return newComment;
  },

  getCommentsByTaskId: (taskId: string) => {
    return comments.filter(comment => comment.taskId === taskId);
  },
};