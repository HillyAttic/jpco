'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { TaskListView } from '@/components/TaskManagement/TaskListView';
import { TaskKanbanView } from '@/components/TaskManagement/TaskKanbanView';
import { Filters } from '@/components/TaskManagement/Filters';
import { SortComponent } from '@/components/TaskManagement/SortComponent';
import { TaskCreationModal } from '@/components/TaskManagement/TaskCreationModal';
import { taskApi } from '@/services/task.api';
import { NotificationProvider, useNotification } from '@/contexts/notification.context';
import { NotificationToast } from '@/components/NotificationToast';

// Wrap the main component to handle notifications
const TasksPageContent = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'kanban'>('kanban');
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [filters, setFilters] = useState<{
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    category?: string;
  }>({
    status: undefined,
    priority: undefined,
    search: undefined,
    category: undefined,
  });
  const { addNotification } = useNotification();

  // Fetch tasks from API
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const fetchedTasks = await taskApi.getTasks();
        setTasks(fetchedTasks);
        setFilteredTasks(fetchedTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        addNotification({ type: 'error', message: 'Failed to fetch tasks' });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [addNotification]);

  // Apply filters whenever tasks or filters change
  useEffect(() => {
    let result = [...tasks];
    
    if (filters.status) {
      result = result.filter(task => task.status === filters.status);
    }
    
    if (filters.priority) {
      result = result.filter(task => task.priority === filters.priority);
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(
        task =>
          task.title.toLowerCase().includes(searchTerm) ||
          task.description?.toLowerCase().includes(searchTerm) ||
          task.category?.toLowerCase().includes(searchTerm) ||
          task.assignedUsers.some(user => user.toLowerCase().includes(searchTerm))
      );
    }
    
    if (filters.category) {
      result = result.filter(task => task.category === filters.category);
    }
    
    setFilteredTasks(result);
  }, [tasks, filters]);

  const handleFilterChange = (newFilters: {
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    category?: string;
  }) => {
    setFilters(newFilters);
  };

  const handleSortChange = (sortOption: 'dueDate' | 'priority' | 'title' | 'status' | 'createdAt', sortOrder: 'asc' | 'desc') => {
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      let valueA: any = a[sortOption];
      let valueB: any = b[sortOption];
      
      // Handle date comparison
      if (sortOption === 'dueDate' || sortOption === 'createdAt') {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }
      
      // Handle string comparison
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
    
    setFilteredTasks(sortedTasks);
  };

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'commentCount'>) => {
    try {
      const newTask = await taskApi.createTask(taskData);
      setTasks([...tasks, newTask]);
      setFilteredTasks([...filteredTasks, newTask]);
      setShowCreationModal(false);
      addNotification({ type: 'success', message: 'Task created successfully!' });
    } catch (error) {
      console.error('Error creating task:', error);
      addNotification({ type: 'error', message: 'Failed to create task' });
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const task = await taskApi.updateTask(updatedTask.id, updatedTask);
      
      setTasks(tasks.map(t => t.id === task.id ? task : t));
      setFilteredTasks(filteredTasks.map(t => t.id === task.id ? task : t));
      addNotification({ type: 'success', message: 'Task updated successfully!' });
    } catch (error) {
      console.error('Error updating task:', error);
      addNotification({ type: 'error', message: 'Failed to update task' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskApi.deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      setFilteredTasks(filteredTasks.filter(t => t.id !== taskId));
      addNotification({ type: 'success', message: 'Task deleted successfully!' });
    } catch (error) {
      console.error('Error deleting task:', error);
      addNotification({ type: 'error', message: 'Failed to delete task' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-7 2xl:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">Task Management</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your tasks efficiently</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-lg ${
              activeView === 'list'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-boxdark-2 text-black dark:text-white'
            }`}
            onClick={() => setActiveView('list')}
          >
            List View
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              activeView === 'kanban'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-boxdark-2 text-black dark:text-white'
            }`}
            onClick={() => setActiveView('kanban')}
          >
            Kanban View
          </button>
        </div>
        
        <button
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
          onClick={() => setShowCreationModal(true)}
        >
          + Add Task
        </button>
      </div>

      {/* Filters and Sort */}
      <Filters onFilterChange={handleFilterChange} />
      <SortComponent onSortChange={handleSortChange} />

      {/* Task View */}
      {activeView === 'list' ? (
        <TaskListView 
          initialTasks={filteredTasks} 
          onTaskUpdate={handleUpdateTask}
          onTaskDelete={handleDeleteTask}
        />
      ) : (
        <TaskKanbanView 
          initialTasks={filteredTasks} 
          onTaskUpdate={handleUpdateTask}
          onTaskDelete={handleDeleteTask}
        />
      )}

      {/* Task Creation Modal */}
      {showCreationModal && (
        <TaskCreationModal
          isOpen={showCreationModal}
          onClose={() => setShowCreationModal(false)}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
};

const TasksPage = () => {
  return (
    <NotificationProvider>
      <TasksPageContent />
      <NotificationToast />
    </NotificationProvider>
  );
};

export default TasksPage;