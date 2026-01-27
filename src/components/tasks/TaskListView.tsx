import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { PencilIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  assignedTo?: string[];
  category?: string;
  categoryId?: string;
  contactId?: string;
  createdBy?: string;
}

interface TaskListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
}

/**
 * TaskListView Component
 * Displays tasks in a table/list format
 */
export function TaskListView({ 
  tasks, 
  onEdit, 
  onDelete, 
  onToggleComplete
}: TaskListViewProps) {
  const { isAdmin, isManager } = useEnhancedAuth();
  const isAdminOrManager = isAdmin || isManager;
  
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);

  // Fetch user names for all assigned users and creators
  useEffect(() => {
    const fetchUserNames = async () => {
      try {
        setLoadingUsers(true);
        
        // Get authentication token
        const { auth } = await import('@/lib/firebase');
        const user = auth.currentUser;
        
        if (!user) {
          console.error('User not authenticated');
          setUserNames({});
          setLoadingUsers(false);
          return;
        }

        const token = await user.getIdToken();
        
        // Fetch user names from API endpoint
        const response = await fetch('/api/users/names', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user names');
        }

        const nameMap = await response.json();
        setUserNames(nameMap);
      } catch (error) {
        console.error('Error fetching user names:', error);
        // Set empty map on error to prevent infinite loading
        setUserNames({});
      } finally {
        setLoadingUsers(false);
      }
    };

    if (tasks.length > 0) {
      fetchUserNames();
    } else {
      // If no tasks, clear the loading state
      setLoadingUsers(false);
      setUserNames({});
    }
  }, [tasks]);

  // Fetch category names
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        
        // Import category service dynamically
        const { categoryService } = await import('@/services/category.service');
        const categories = await categoryService.getAll();
        
        // Create a map of category ID to name
        const catMap: Record<string, string> = {};
        categories.forEach(cat => {
          if (cat.id) {
            catMap[cat.id] = cat.name;
          }
        });
        
        setCategoryNames(catMap);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (tasks.length > 0) {
      fetchCategories();
    }
  }, [tasks]);

  // Fetch client names
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        
        // Import client service dynamically
        const { clientService } = await import('@/services/client.service');
        const clients = await clientService.getAll();
        
        // Create a map of client ID to name
        const clientMap: Record<string, string> = {};
        clients.forEach(client => {
          if (client.id) {
            clientMap[client.id] = client.name;
          }
        });
        
        setClientNames(clientMap);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };

    if (tasks.length > 0) {
      fetchClients();
    }
  }, [tasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAssignedNames = (assignedTo?: string[]) => {
    if (!assignedTo || assignedTo.length === 0) {
      return 'Unassigned';
    }

    if (loadingUsers) {
      return 'Loading...';
    }

    const names = assignedTo
      .map(id => userNames[id] || id)
      .join(', ');
    
    return names || 'Unknown';
  };

  const getCreatorName = (createdBy?: string, assignedTo?: string[]) => {
    if (!createdBy) {
      return 'System';
    }

    if (loadingUsers) {
      return 'Loading...';
    }

    const name = userNames[createdBy];
    
    return name || 'Unknown';
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) {
      return '-';
    }

    if (loadingCategories) {
      return 'Loading...';
    }

    return categoryNames[categoryId] || categoryId;
  };

  const getClientName = (contactId?: string) => {
    if (!contactId) {
      return '-';
    }

    if (loadingClients) {
      return 'Loading...';
    }

    return clientNames[contactId] || contactId;
  };

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-3 py-3 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
        <div className="col-span-2">Title</div>
        <div className="col-span-2">Client</div>
        <div className="col-span-1">Category</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1">Priority</div>
        <div className="col-span-2">Due Date</div>
        <div className="col-span-2">
          {isAdminOrManager ? 'Assigned To' : 'Assigned By'}
        </div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="grid grid-cols-12 gap-2 px-3 py-3 text-xs transition-colors bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {/* Title */}
            <div className="col-span-2">
              <div className="font-medium text-gray-900 dark:text-white truncate" title={task.title}>
                {task.title}
              </div>
              {task.description && (
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate" title={task.description}>
                  {task.description}
                </div>
              )}
            </div>

            {/* Client */}
            <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">
              <span className="truncate" title={getClientName(task.contactId)}>
                {getClientName(task.contactId)}
              </span>
            </div>

            {/* Category */}
            <div className="col-span-1 text-gray-700 dark:text-gray-300 flex items-center">
              <span className="truncate" title={getCategoryName(task.categoryId || task.category)}>
                {getCategoryName(task.categoryId || task.category)}
              </span>
            </div>

            {/* Status */}
            <div className="col-span-1 flex items-center">
              <Badge className={`${getStatusColor(task.status)} text-xs px-1.5 py-0.5`}>
                {task.status === 'in-progress' ? 'progress' : task.status}
              </Badge>
            </div>

            {/* Priority */}
            <div className="col-span-1 flex items-center">
              <Badge className={`${getPriorityColor(task.priority)} text-xs px-1.5 py-0.5`}>
                {task.priority}
              </Badge>
            </div>

            {/* Due Date */}
            <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">
              <span className="truncate" title={formatDate(task.dueDate)}>
                {formatDate(task.dueDate)}
              </span>
            </div>

            {/* Assigned To / Assigned By */}
            <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">
              {isAdminOrManager ? (
                <span className="truncate" title={getAssignedNames(task.assignedTo)}>
                  {getAssignedNames(task.assignedTo)}
                </span>
              ) : (
                <span className="truncate" title={getCreatorName(task.createdBy, task.assignedTo)}>
                  {getCreatorName(task.createdBy, task.assignedTo)}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center gap-1 justify-end">
              <button
                onClick={() => onToggleComplete(task.id)}
                className={`p-1 ${
                  task.status === 'completed'
                    ? 'text-green-600 hover:text-green-900 dark:text-green-400'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500'
                }`}
                aria-label="Toggle complete"
                title="Toggle complete"
              >
                <CheckCircleIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(task)}
                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                aria-label="Edit task"
                title="Edit task"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              {isAdminOrManager && (
                <button
                  onClick={() => onDelete(task.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                  aria-label="Delete task"
                  title="Delete task"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
