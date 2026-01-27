import { Task, Comment, TaskStatus, TaskPriority } from '@/types/task.types';
import { auth } from '@/lib/firebase';

const API_BASE_URL = '/api/tasks';

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  category?: string;
}

/**
 * Get authentication headers with Firebase token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export const taskApi = {
  // Fetch all tasks with optional filters
  getTasks: async (filters?: TaskFilters): Promise<Task[]> => {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);

    const queryString = params.toString();
    const url = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;

    const headers = await getAuthHeaders();
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Fetch a single task by ID
  getTaskById: async (id: string): Promise<Task> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${id}`, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch task: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Create a new task
  createTask: async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'commentCount'>): Promise<Task> => {
    const headers = await getAuthHeaders();
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Update an existing task
  updateTask: async (id: string, taskData: Partial<Task>): Promise<Task> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Delete a task
  deleteTask: async (id: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.statusText}`);
    }
  },

  // Add a comment to a task
  addComment: async (taskId: string, commentData: Omit<Comment, 'id' | 'taskId' | 'createdAt'>): Promise<Comment> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${taskId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(commentData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Get comments for a task
  getComments: async (taskId: string): Promise<Comment[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${taskId}/comments`, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }
    
    return response.json();
  },
};