'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { KanbanBoard } from '@/components/kanban-board';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { TaskCreationModal } from '@/components/task-creation-modal';

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

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

  const handleTaskCreated = (newTask: Task) => {
    setTasks(prev => [...prev, newTask]);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prev => 
      prev.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
    setSelectedTask(updatedTask);
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleTaskStatusChange = (updatedTask: Task) => {
    setTasks(prev => 
      prev.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
  };

  const handleTaskEdit = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kanban Board</h1>
          <p className="text-gray-600 mt-2">Visualize your workflow and manage tasks</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusCircleIcon className="w-5 h-5 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <KanbanBoard
            tasks={tasks}
            onTaskUpdate={handleTaskStatusChange}
            onTaskDelete={handleTaskDeleted}
            onTaskEdit={handleTaskEdit}
          />
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
        onUpdate={handleTaskUpdated}
      />
    </div>
  );
}