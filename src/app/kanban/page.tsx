'use client';

import { useState, useEffect, useMemo } from 'react';
import { KanbanTask, Business } from '@/types/kanban.types';
import { EnhancedKanbanBoard } from '@/components/kanban/EnhancedKanbanBoard';
import { BusinessManager } from '@/components/kanban/BusinessManager';

// Initial sample business
const INITIAL_BUSINESS: Business = {
  id: 'business-1',
  name: 'My First Business',
  description: 'Default business workspace',
  color: '#3B82F6',
  createdAt: new Date(),
};

// Sample tasks for the first business
const getSampleTasks = (businessId: string): KanbanTask[] => [
  {
    id: '1',
    businessId,
    title: 'Design new landing page',
    description: 'Create mockups for the new product landing page with modern UI',
    status: 'todo',
    dueDate: new Date(2026, 0, 30),
    priority: 'high',
    commentsCount: 3,
    attachmentsCount: 2,
    assignee: {
      name: 'Sarah Johnson',
      role: 'UI Designer',
      avatarColor: '#3B82F6',
    },
    tags: ['design', 'frontend'],
    createdAt: new Date(2026, 0, 25),
  },
  {
    id: '2',
    businessId,
    title: 'Implement authentication',
    description: 'Add JWT-based authentication with refresh tokens',
    status: 'in-progress',
    dueDate: new Date(2026, 0, 28),
    priority: 'high',
    commentsCount: 5,
    attachmentsCount: 1,
    assignee: {
      name: 'Mike Chen',
      role: 'Backend Developer',
      avatarColor: '#10B981',
    },
    tags: ['backend', 'security'],
    createdAt: new Date(2026, 0, 20),
  },
  {
    id: '3',
    businessId,
    title: 'Fix mobile responsive issues',
    description: 'Address layout problems on mobile devices',
    status: 'in-progress',
    dueDate: new Date(2026, 0, 27),
    priority: 'medium',
    commentsCount: 2,
    assignee: {
      name: 'Emma Davis',
      role: 'Frontend Developer',
      avatarColor: '#F59E0B',
    },
    tags: ['frontend', 'bug'],
    createdAt: new Date(2026, 0, 22),
  },
  {
    id: '4',
    businessId,
    title: 'Update documentation',
    description: 'Update API documentation with new endpoints',
    status: 'completed',
    dueDate: new Date(2026, 0, 26),
    priority: 'low',
    commentsCount: 1,
    attachmentsCount: 3,
    assignee: {
      name: 'John Smith',
      role: 'Technical Writer',
      avatarColor: '#EF4444',
    },
    tags: ['documentation'],
    createdAt: new Date(2026, 0, 18),
  },
  {
    id: '5',
    businessId,
    title: 'Database optimization',
    description: 'Optimize slow queries and add indexes',
    status: 'todo',
    dueDate: new Date(2026, 1, 2),
    priority: 'medium',
    commentsCount: 0,
    assignee: {
      name: 'Alex Kumar',
      role: 'Database Admin',
      avatarColor: '#8B5CF6',
    },
    tags: ['backend', 'performance'],
    createdAt: new Date(2026, 0, 24),
  },
  {
    id: '6',
    businessId,
    title: 'Setup CI/CD pipeline',
    description: 'Configure automated testing and deployment',
    status: 'completed',
    dueDate: new Date(2026, 0, 25),
    priority: 'high',
    commentsCount: 4,
    attachmentsCount: 1,
    assignee: {
      name: 'Lisa Wong',
      role: 'DevOps Engineer',
      avatarColor: '#EC4899',
    },
    tags: ['devops', 'automation'],
    createdAt: new Date(2026, 0, 15),
  },
];

export default function KanbanPage() {
  const [businesses, setBusinesses] = useState<Business[]>([INITIAL_BUSINESS]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(INITIAL_BUSINESS.id);
  const [allTasks, setAllTasks] = useState<KanbanTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedBusinesses = localStorage.getItem('kanban-businesses');
    const savedTasks = localStorage.getItem('kanban-tasks');
    const savedSelectedId = localStorage.getItem('kanban-selected-business');

    if (savedBusinesses) {
      const parsedBusinesses = JSON.parse(savedBusinesses, (key, value) => {
        if (key === 'createdAt') return new Date(value);
        return value;
      });
      setBusinesses(parsedBusinesses);
      
      if (savedSelectedId && parsedBusinesses.some((b: Business) => b.id === savedSelectedId)) {
        setSelectedBusinessId(savedSelectedId);
      } else {
        setSelectedBusinessId(parsedBusinesses[0]?.id || INITIAL_BUSINESS.id);
      }
    }

    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks, (key, value) => {
        if (key === 'dueDate' || key === 'createdAt') return new Date(value);
        return value;
      });
      setAllTasks(parsedTasks);
    } else {
      // Initialize with sample tasks for the first business
      setAllTasks(getSampleTasks(INITIAL_BUSINESS.id));
    }

    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('kanban-businesses', JSON.stringify(businesses));
      localStorage.setItem('kanban-tasks', JSON.stringify(allTasks));
      localStorage.setItem('kanban-selected-business', selectedBusinessId);
    }
  }, [businesses, allTasks, selectedBusinessId, isLoaded]);

  // Filter tasks for selected business
  const currentTasks = useMemo(() => {
    return allTasks.filter(task => task.businessId === selectedBusinessId);
  }, [allTasks, selectedBusinessId]);

  const handleTaskUpdate = (updatedTask: KanbanTask) => {
    setAllTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };

  const handleTaskAdd = (taskData: Omit<KanbanTask, 'id' | 'createdAt' | 'businessId'>) => {
    const newTask: KanbanTask = {
      ...taskData,
      id: `task-${Date.now()}`,
      businessId: selectedBusinessId,
      createdAt: new Date(),
    };
    
    setAllTasks(prevTasks => [newTask, ...prevTasks]);
  };

  const handleAddBusiness = (businessData: Omit<Business, 'id' | 'createdAt'>) => {
    const newBusiness: Business = {
      ...businessData,
      id: `business-${Date.now()}`,
      createdAt: new Date(),
    };
    
    setBusinesses(prev => [...prev, newBusiness]);
    setSelectedBusinessId(newBusiness.id);
  };

  const handleUpdateBusiness = (updatedBusiness: Business) => {
    setBusinesses(prev =>
      prev.map(business =>
        business.id === updatedBusiness.id ? updatedBusiness : business
      )
    );
  };

  const handleDeleteBusiness = (businessId: string) => {
    // Remove business
    const updatedBusinesses = businesses.filter(b => b.id !== businessId);
    setBusinesses(updatedBusinesses);
    
    // Remove all tasks for this business
    setAllTasks(prev => prev.filter(task => task.businessId !== businessId));
    
    // Select another business
    if (selectedBusinessId === businessId && updatedBusinesses.length > 0) {
      setSelectedBusinessId(updatedBusinesses[0].id);
    }
  };

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kanban Board</h1>
        <p className="text-gray-600 mt-2">Manage tasks across multiple businesses</p>
      </div>

      {/* Business Manager */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <BusinessManager
          businesses={businesses}
          selectedBusinessId={selectedBusinessId}
          onSelectBusiness={setSelectedBusinessId}
          onAddBusiness={handleAddBusiness}
          onUpdateBusiness={handleUpdateBusiness}
          onDeleteBusiness={handleDeleteBusiness}
        />
      </div>

      {/* Current Business Info */}
      {selectedBusiness && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border-l-4" style={{ borderLeftColor: selectedBusiness.color }}>
          <h2 className="text-xl font-bold text-gray-900">{selectedBusiness.name}</h2>
          {selectedBusiness.description && (
            <p className="text-gray-600 mt-1">{selectedBusiness.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {currentTasks.length} task{currentTasks.length !== 1 ? 's' : ''} in this business
          </p>
        </div>
      )}

      {/* Kanban Board */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <EnhancedKanbanBoard
          tasks={currentTasks}
          onTaskUpdate={handleTaskUpdate}
          onTaskAdd={handleTaskAdd}
        />
      </div>
    </div>
  );
}