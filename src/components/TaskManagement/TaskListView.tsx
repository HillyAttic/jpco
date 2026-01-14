'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/types/task.types';
import { StatusSection } from './StatusSection';
import { TaskDetailsModal } from './TaskDetailsModal';

interface TaskListViewProps {
  initialTasks?: Task[];
  onTaskUpdate?: (updatedTask: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({ 
  initialTasks = [], 
  onTaskUpdate,
  onTaskDelete,
}) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // In a real app, you would fetch tasks from an API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTasks(initialTasks);
      setLoading(false);
    }, 500);
  }, [initialTasks]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
    setSelectedTask(updatedTask);
    
    if (onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    setSelectedTask(null);
    
    if (onTaskDelete) {
      onTaskDelete(taskId);
    }
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  // Group tasks by status
  const tasksByStatus = {
    [TaskStatus.TODO]: tasks.filter(task => task.status === TaskStatus.TODO),
    [TaskStatus.IN_PROGRESS]: tasks.filter(task => task.status === TaskStatus.IN_PROGRESS),
    [TaskStatus.COMPLETED]: tasks.filter(task => task.status === TaskStatus.COMPLETED),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
        <StatusSection
          key={status}
          status={status as TaskStatus}
          tasks={statusTasks}
          onTaskClick={handleTaskClick}
        />
      ))}
      
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={handleCloseModal}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
};