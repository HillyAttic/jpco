'use client';

import React, { useState, useMemo } from 'react';
import { KanbanTask, KanbanStatus, KanbanColumn as KanbanColumnType, KanbanFilters, KanbanSort } from '@/types/kanban.types';
import { KanbanColumn } from './KanbanColumn';
import { AddTaskModal } from './AddTaskModal';
import { FilterSortModal } from './FilterSortModal';
import { Button } from '@/components/ui/button';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface EnhancedKanbanBoardProps {
  tasks: KanbanTask[];
  onTaskUpdate: (task: KanbanTask) => void;
  onTaskAdd: (task: Omit<KanbanTask, 'id' | 'createdAt' | 'businessId'>) => void;
}

const COLUMNS: KanbanColumnType[] = [
  { id: 'todo', title: 'To Do', color: 'bg-yellow-50' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'completed', title: 'Completed', color: 'bg-green-50' },
];

export function EnhancedKanbanBoard({ tasks, onTaskUpdate, onTaskAdd }: EnhancedKanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<KanbanTask | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  
  const [filters, setFilters] = useState<KanbanFilters>({
    dueDate: 'all',
  });
  
  const [sort, setSort] = useState<KanbanSort>({
    field: 'createdAt',
    direction: 'desc',
  });

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply due date filter
    if (filters.dueDate && filters.dueDate !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(task => {
        const dueDate = new Date(task.dueDate);
        
        switch (filters.dueDate) {
          case 'today':
            const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            return taskDate.getTime() === today.getTime();
          
          case 'this-week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return dueDate >= today && dueDate <= weekFromNow;
          
          case 'overdue':
            return dueDate < today;
          
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[a.priority || 'medium'] || 0) - (priorityOrder[b.priority || 'medium'] || 0);
          break;
        
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, filters, sort]);

  const handleDragStart = (e: React.DragEvent, task: KanbanTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: KanbanStatus) => {
    e.preventDefault();
    
    if (draggedTask && draggedTask.status !== newStatus) {
      const updatedTask = { ...draggedTask, status: newStatus };
      onTaskUpdate(updatedTask);
    }
    
    setDraggedTask(null);
  };

  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTask(task);
    // You can open a detail modal here if needed
    console.log('Task clicked:', task);
  };

  const handleAddTask = (taskData: Omit<KanbanTask, 'id' | 'createdAt'>) => {
    onTaskAdd(taskData);
  };

  const handleApplyFilters = (newFilters: KanbanFilters, newSort: KanbanSort) => {
    setFilters(newFilters);
    setSort(newSort);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Board</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredAndSortedTasks.length} task{filteredAndSortedTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowFilterModal(true)}
            variant="outline"
            className="flex items-center gap-2 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
          >
            <FunnelIcon className="w-4 h-4" />
            Filter & Sort
          </Button>
          
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-4 h-4" />
            Add New Task
          </Button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {COLUMNS.map((column) => {
          const columnTasks = filteredAndSortedTasks.filter(
            (task) => task.status === column.id
          );
          
          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={columnTasks}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTaskClick={handleTaskClick}
            />
          );
        })}
      </div>

      {/* Modals */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddTask}
      />

      <FilterSortModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
        currentSort={sort}
      />
    </div>
  );
}
