'use client';

import { useState, useEffect, useMemo } from 'react';
import { KanbanTask, Business } from '@/types/kanban.types';
import { EnhancedKanbanBoard } from '@/components/kanban/EnhancedKanbanBoard';
import { BusinessManager } from '@/components/kanban/BusinessManager';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { kanbanService } from '@/services/kanban.service';
import { useRouter } from 'next/navigation';

export default function KanbanPage() {
  const { user, loading: authLoading } = useEnhancedAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<KanbanTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load user's businesses and tasks from Firestore
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load businesses
        const userBusinesses = await kanbanService.getUserBusinesses(user.uid);
        
        // If no businesses exist, create a default one
        if (userBusinesses.length === 0) {
          const defaultBusiness = await kanbanService.createBusiness(user.uid, {
            name: 'My First Business',
            description: 'Default business workspace',
            color: '#3B82F6',
          });
          setBusinesses([defaultBusiness]);
          setSelectedBusinessId(defaultBusiness.id);
        } else {
          setBusinesses(userBusinesses);
          setSelectedBusinessId(userBusinesses[0].id);
        }

        // Load all tasks
        const userTasks = await kanbanService.getAllUserTasks(user.uid);
        setAllTasks(userTasks);
      } catch (err) {
        console.error('Error loading Kanban data:', err);
        setError('Failed to load your data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Filter tasks for selected business
  const currentTasks = useMemo(() => {
    if (!selectedBusinessId) return [];
    return allTasks.filter(task => task.businessId === selectedBusinessId);
  }, [allTasks, selectedBusinessId]);

  const handleTaskUpdate = async (updatedTask: KanbanTask) => {
    try {
      await kanbanService.updateTask(updatedTask.id, updatedTask);
      setAllTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        )
      );
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Failed to update task. Please try again.');
    }
  };

  const handleTaskAdd = async (taskData: Omit<KanbanTask, 'id' | 'createdAt' | 'businessId'>) => {
    if (!selectedBusinessId) return;

    try {
      const newTask = await kanbanService.createTask({
        ...taskData,
        businessId: selectedBusinessId,
      });
      
      setAllTasks(prevTasks => [newTask, ...prevTasks]);
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Failed to create task. Please try again.');
    }
  };

  const handleAddBusiness = async (businessData: Omit<Business, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      const newBusiness = await kanbanService.createBusiness(user.uid, businessData);
      setBusinesses(prev => [...prev, newBusiness]);
      setSelectedBusinessId(newBusiness.id);
    } catch (err) {
      console.error('Error creating business:', err);
      alert('Failed to create business. Please try again.');
    }
  };

  const handleUpdateBusiness = async (updatedBusiness: Business) => {
    try {
      await kanbanService.updateBusiness(updatedBusiness.id, updatedBusiness);
      setBusinesses(prev =>
        prev.map(business =>
          business.id === updatedBusiness.id ? updatedBusiness : business
        )
      );
    } catch (err) {
      console.error('Error updating business:', err);
      alert('Failed to update business. Please try again.');
    }
  };

  const handleDeleteBusiness = async (businessId: string) => {
    try {
      await kanbanService.deleteBusiness(businessId);
      
      // Remove business and its tasks from state
      const updatedBusinesses = businesses.filter(b => b.id !== businessId);
      setBusinesses(updatedBusinesses);
      setAllTasks(prev => prev.filter(task => task.businessId !== businessId));
      
      // Select another business
      if (selectedBusinessId === businessId && updatedBusinesses.length > 0) {
        setSelectedBusinessId(updatedBusinesses[0].id);
      }
    } catch (err) {
      console.error('Error deleting business:', err);
      alert('Failed to delete business. Please try again.');
    }
  };

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your Kanban board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-4 md:px-0">
      {/* Page Header */}
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kanban Board</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage tasks across multiple businesses</p>
      </div>

      {/* Business Manager */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
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
        <div 
          className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 sm:p-4 border-l-4" 
          style={{ borderLeftColor: selectedBusiness.color }}
        >
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{selectedBusiness.name}</h2>
          {selectedBusiness.description && (
            <p className="text-sm sm:text-base text-gray-600 mt-1">{selectedBusiness.description}</p>
          )}
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            {currentTasks.length} task{currentTasks.length !== 1 ? 's' : ''} in this business
          </p>
        </div>
      )}

      {/* Kanban Board */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
        <EnhancedKanbanBoard
          tasks={currentTasks}
          onTaskUpdate={handleTaskUpdate}
          onTaskAdd={handleTaskAdd}
        />
      </div>
    </div>
  );
}