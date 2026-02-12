'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { TaskList } from '@/components/task-list';
import { TaskCreationModal } from '@/components/task-creation-modal';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { TaskFilter } from '@/components/task-filter';

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  assignee?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await taskApi.getTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
      );
    }
    
    if (filters.status) {
      filtered = filtered.filter(task => task.status === filters.status);
    }
    
    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }
    
    if (filters.assignee) {
      const assigneeTerm = filters.assignee.toLowerCase();
      filtered = filtered.filter(task => 
        task.assignedTo.some(user => user.toLowerCase().includes(assigneeTerm))
      );
    }
    
    setFilteredTasks(filtered);
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks(prev => [...prev, newTask]);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    setSelectedTask(updatedTask);
  };

  const handleFiltersChange = (newFilters: TaskFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TaskFilter 
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Task List */}
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : (
            <TaskList 
              tasks={filteredTasks} 
              onTaskClick={handleTaskClick}
              showStatus={true}
            />
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      <TaskCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={handleTaskCreated}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        task={selectedTask}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
}