'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  PlusCircleIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { recurringTaskService, RecurringTask } from '@/services/recurring-task.service';
import { dashboardService } from '@/services/dashboard.service';
import { activityService } from '@/services/activity.service';
import { clientService } from '@/services/client.service';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useModal } from '@/contexts/modal-context';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { StatCard } from '@/components/dashboard/StatCard';
import { TaskOverview } from '@/components/dashboard/TaskOverview';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { TaskDistributionChart } from '@/components/Charts/TaskDistributionChart';
import { WeeklyProgressChart } from '@/components/Charts/WeeklyProgressChart';
import { TeamPerformanceChart } from '@/components/Charts/TeamPerformanceChart';
import { useRouter } from 'next/navigation';

// Extended task type to include recurring tasks
interface DashboardTask extends Task {
  isRecurring?: boolean;
  recurrencePattern?: string;
  teamId?: string;
}

// Helper function to get user name from Firestore
async function getUserName(userId: string): Promise<string> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.name || userData.displayName || userData.email || 'Unknown User';
    }
  } catch (error) {
    console.error('Error fetching user name:', error);
  }
  return 'Unknown User';
}

// Helper function to get client name from Firestore
async function getClientName(clientId: string): Promise<string> {
  try {
    const client = await clientService.getById(clientId);
    if (client) {
      return client.name || client.businessName || 'Unknown Client';
    }
  } catch (error) {
    console.error('Error fetching client name:', error);
  }
  return 'Unknown Client';
}

// Helper function to get multiple user names
async function getUserNames(userIds: string[]): Promise<string[]> {
  const names = await Promise.all(userIds.map(id => getUserName(id)));
  return names;
}

// Helper function to get multiple client names
async function getClientNames(clientIds: string[]): Promise<string[]> {
  const names = await Promise.all(clientIds.map(id => getClientName(id)));
  return names;
}

export default function DashboardPage() {
  const { user, loading: authLoading, userProfile, isAdmin, isManager } = useEnhancedAuth();
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamPerformance, setTeamPerformance] = useState<any[]>([]);
  const [showTaskTypeDialog, setShowTaskTypeDialog] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showAllTasksModal, setShowAllTasksModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showInProgressModal, setShowInProgressModal] = useState(false);
  const [userNamesCache, setUserNamesCache] = useState<Record<string, string>>({});
  const [clientNamesCache, setClientNamesCache] = useState<Record<string, string>>({});

  // Check if user is admin or manager
  const canViewAllTasks = isAdmin || isManager;

  // Helper to get user name from cache or fetch it
  const getCachedUserName = async (userId: string): Promise<string> => {
    if (userNamesCache[userId]) {
      return userNamesCache[userId];
    }
    const name = await getUserName(userId);
    setUserNamesCache(prev => ({ ...prev, [userId]: name }));
    return name;
  };

  // Helper to get client name from cache or fetch it
  const getCachedClientName = async (clientId: string): Promise<string> => {
    if (clientNamesCache[clientId]) {
      return clientNamesCache[clientId];
    }
    const name = await getClientName(clientId);
    setClientNamesCache(prev => ({ ...prev, [clientId]: name }));
    return name;
  };

  // Component to display task assignment info
  const TaskAssignmentInfo = ({ task }: { task: DashboardTask }) => {
    const [assignedByName, setAssignedByName] = useState<string>('');
    const [assignedToNames, setAssignedToNames] = useState<string[]>([]);
    const [showClientsModal, setShowClientsModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [teamName, setTeamName] = useState<string>('');
    const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; role: string }>>([]);

    useEffect(() => {
      const fetchNames = async () => {
        // Fetch creator name
        if (task.createdBy) {
          const name = await getCachedUserName(task.createdBy);
          setAssignedByName(name);
        }
        
        // Fetch team info for recurring tasks
        if (task.isRecurring && task.teamId) {
          try {
            const { teamService } = await import('@/services/team.service');
            const team = await teamService.getById(task.teamId);
            if (team) {
              setTeamName(team.name);
              setTeamMembers(team.members || []);
            }
          } catch (error) {
            console.error('Error fetching team:', error);
          }
        }
        
        // Fetch assigned to names
        if (task.assignedTo && task.assignedTo.length > 0) {
          if (task.isRecurring) {
            // Recurring tasks: assignedTo contains client IDs
            const names = await Promise.all(
              task.assignedTo.map(id => getCachedClientName(id))
            );
            setAssignedToNames(names);
          } else {
            // Non-recurring tasks: assignedTo contains user IDs
            const names = await Promise.all(
              task.assignedTo.map(id => getCachedUserName(id))
            );
            setAssignedToNames(names);
          }
        }
      };
      fetchNames();
    }, [task.createdBy, task.assignedTo, task.isRecurring, task.teamId]);

    const handleShowClients = () => {
      setShowClientsModal(true);
      openModal();
    };

    const handleCloseClients = () => {
      setShowClientsModal(false);
      closeModal();
    };

    const handleShowTeam = () => {
      setShowTeamModal(true);
      openModal();
    };

    const handleCloseTeam = () => {
      setShowTeamModal(false);
      closeModal();
    };

    return (
      <>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
          {assignedByName && (
            <span className="flex items-center gap-1">
              <span className="font-medium">Assigned By:</span>
              <span className="text-gray-900">{assignedByName}</span>
            </span>
          )}
          {assignedToNames.length > 0 && (
            <>
              {task.isRecurring ? (
                // For recurring tasks, show buttons to view clients and team
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShowClients}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    View {assignedToNames.length} Client{assignedToNames.length !== 1 ? 's' : ''}
                  </button>
                  {teamName && (
                    <button
                      onClick={handleShowTeam}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      Team: {teamName}
                    </button>
                  )}
                </div>
              ) : (
                // For non-recurring tasks, show names inline
                <span className="flex items-center gap-1">
                  <span className="font-medium">Assigned To:</span>
                  <span className="text-gray-900">{assignedToNames.join(', ')}</span>
                </span>
              )}
            </>
          )}
        </div>

        {/* Clients Modal */}
        {showClientsModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
            onClick={handleCloseClients}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[70vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Clients for: {task.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {assignedToNames.length} client{assignedToNames.length !== 1 ? 's' : ''} assigned
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseClients}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(70vh-140px)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignedToNames.map((clientName, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-sm">
                            {clientName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {clientName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <Button
                  onClick={handleCloseClients}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Team Members Modal */}
        {showTeamModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
            onClick={handleCloseTeam}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[70vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-green-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Team: {teamName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseTeam}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(70vh-140px)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 font-semibold">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {member.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <Button
                  onClick={handleCloseTeam}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Handle task type selection
  const handleCreateTask = () => {
    setShowTaskTypeDialog(true);
    openModal();
  };

  const handleTaskTypeSelect = (type: 'recurring' | 'non-recurring') => {
    setShowTaskTypeDialog(false);
    closeModal();
    if (type === 'recurring') {
      router.push('/tasks/recurring');
    } else {
      router.push('/tasks/non-recurring');
    }
  };

  const handleCancelDialog = () => {
    setShowTaskTypeDialog(false);
    closeModal();
  };

  const handleShowOverdue = () => {
    setShowOverdueModal(true);
    openModal();
  };

  const handleCloseOverdue = () => {
    setShowOverdueModal(false);
    closeModal();
  };

  const handleShowTodo = () => {
    setShowTodoModal(true);
    openModal();
  };

  const handleCloseTodo = () => {
    setShowTodoModal(false);
    closeModal();
  };

  const handleShowAllTasks = () => {
    setShowAllTasksModal(true);
    openModal();
  };

  const handleCloseAllTasks = () => {
    setShowAllTasksModal(false);
    closeModal();
  };

  const handleShowCompleted = () => {
    setShowCompletedModal(true);
    openModal();
  };

  const handleCloseCompleted = () => {
    setShowCompletedModal(false);
    closeModal();
  };

  const handleShowInProgress = () => {
    setShowInProgressModal(true);
    openModal();
  };

  const handleCloseInProgress = () => {
    setShowInProgressModal(false);
    closeModal();
  };

  // Get overdue tasks
  const overdueTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      task.status !== 'completed'
    ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [tasks]);

  // Get todo tasks
  const todoTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'pending')
      .sort((a, b) => {
        // Sort by due date if available, otherwise by created date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tasks]);

  // Get completed tasks
  const completedTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tasks]);

  // Get in-progress tasks
  const inProgressTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'in-progress')
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [tasks]);

  // Get all tasks sorted
  const allTasksSorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Sort by status priority: in-progress > pending > completed
      const statusPriority: Record<string, number> = {
        'in-progress': 1,
        'pending': 2,
        'completed': 3
      };
      const aPriority = statusPriority[a.status] || 4;
      const bPriority = statusPriority[b.status] || 4;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Within same status, sort by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks]);

  useEffect(() => {
    if (user && !authLoading) {
      // Small delay to ensure Firebase auth is fully initialized
      const timer = setTimeout(() => {
        loadDashboardData();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Wait for Firebase auth to be ready and ensure we have a valid token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('User not authenticated yet, waiting...');
        return;
      }
      
      // Force token refresh to ensure we have a valid token
      try {
        await currentUser.getIdToken(true);
      } catch (tokenError) {
        console.error('Error refreshing token:', tokenError);
        // Retry after a short delay
        setTimeout(() => loadDashboardData(), 500);
        return;
      }
      
      // Fetch non-recurring tasks
      const nonRecurringTasks = await taskApi.getTasks();
      
      // Fetch recurring tasks using API (which handles team-based filtering)
      const token = await currentUser.getIdToken();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      
      const recurringResponse = await fetch('/api/recurring-tasks', { headers });
      if (!recurringResponse.ok) {
        throw new Error('Failed to fetch recurring tasks');
      }
      const recurringTasks = await recurringResponse.json();
      
      // Convert recurring tasks to dashboard tasks format
      const recurringDashboardTasks: DashboardTask[] = recurringTasks.map((task: RecurringTask) => ({
        id: task.id!,
        title: task.title,
        description: task.description,
        dueDate: task.nextOccurrence,
        priority: task.priority as TaskPriority,
        status: task.status as TaskStatus,
        assignedTo: task.contactIds || [],
        createdBy: task.createdBy,
        category: task.categoryId,
        createdAt: task.createdAt || new Date(),
        updatedAt: task.updatedAt || new Date(),
        isRecurring: true,
        recurrencePattern: task.recurrencePattern,
        teamId: task.teamId,
      }));
      
      // Combine both types of tasks
      // Note: Recurring tasks are already filtered by the API based on team membership
      let allTasks = [
        ...nonRecurringTasks.map(task => ({ ...task, isRecurring: false })),
        ...recurringDashboardTasks
      ];
      
      // For employees, filter non-recurring tasks to show only their assigned tasks
      // Recurring tasks are already filtered by the API
      if (!canViewAllTasks) {
        allTasks = allTasks.filter(task => {
          // Keep all recurring tasks (already filtered by API)
          if (task.isRecurring) return true;
          // Filter non-recurring tasks by assignedTo
          return task.assignedTo && task.assignedTo.includes(user.uid);
        });
      }
      
      setTasks(allTasks);

      // Fetch real team performance data (only for admin/manager)
      if (canViewAllTasks) {
        const performance = await dashboardService.getTeamPerformance(user.uid);
        
        // Only set team members who actually have tasks
        const filteredPerformance = performance.filter(p => p.totalTasks > 0);
        setTeamPerformance(filteredPerformance);
        
        // Fetch real activities
        const recentActivities = await activityService.getRecentActivities(10);
        setActivities(recentActivities.map(activity => ({
          id: activity.id,
          type: activity.type,
          taskTitle: activity.entityTitle,
          user: activity.userName,
          timestamp: activity.timestamp
        })));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'pending').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter((t) => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;

    return { total, todo, inProgress, completed, overdue };
  }, [tasks]);

  // Weekly progress data - now using real data
  const weeklyData = useMemo(() => {
    const today = new Date();
    const labels = [];
    const created: number[] = [];
    const completed: number[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      
      // Count tasks created on this day
      const createdCount = tasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === date.getTime();
      }).length;
      
      // Count tasks completed on this day
      const completedCount = tasks.filter(task => {
        if (task.status !== 'completed') return false;
        const taskDate = new Date(task.updatedAt);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === date.getTime();
      }).length;
      
      created.push(createdCount);
      completed.push(completedCount);
    }
    
    return { labels, created, completed };
  }, [tasks]);

  // Team performance data - now using real data
  const teamData = useMemo(() => {
    return teamPerformance.map(perf => ({
      name: perf.name,
      tasksCompleted: perf.tasksCompleted,
      tasksInProgress: perf.tasksInProgress,
    }));
  }, [teamPerformance]);

  // Recent activities - now using real data from activity service
  const displayActivities = useMemo(() => {
    return activities;
  }, [activities]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            {canViewAllTasks 
              ? "Welcome back! Here's what's happening with your team today."
              : "Welcome back! Here's an overview of your tasks."}
          </p>
        </div>
        {canViewAllTasks && (
          <Button onClick={handleCreateTask} className="text-white w-full sm:w-auto">
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            Create Task
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard
          title="Total Tasks"
          value={stats.total}
          subtitle="All tasks"
          icon={<ClipboardDocumentListIcon className="w-5 h-5" />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          onClick={stats.total > 0 ? handleShowAllTasks : undefined}
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          subtitle="Tasks done"
          icon={<CheckCircleIcon className="w-5 h-5" />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          trend={{ value: 12, isPositive: true }}
          onClick={stats.completed > 0 ? handleShowCompleted : undefined}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          subtitle="Active tasks"
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
          onClick={stats.inProgress > 0 ? handleShowInProgress : undefined}
        />
        <StatCard
          title="To Do"
          value={stats.todo}
          subtitle="Pending tasks"
          icon={<ClockIcon className="w-5 h-5" />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          onClick={stats.todo > 0 ? handleShowTodo : undefined}
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          subtitle="Past due"
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          trend={{ value: 5, isPositive: false }}
          onClick={stats.overdue > 0 ? handleShowOverdue : undefined}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Task Overview & Upcoming Deadlines (Admin/Manager Only) */}
        {canViewAllTasks && (
          <div className="space-y-4 md:space-y-6">
            <TaskOverview tasks={tasks} />
            <UpcomingDeadlines tasks={tasks} />
          </div>
        )}

        {/* Middle Column - Charts */}
        <div className={`space-y-4 md:space-y-6 ${!canViewAllTasks ? 'lg:col-span-2' : ''}`}>
          <TaskDistributionChart
            completed={stats.completed}
            inProgress={stats.inProgress}
            todo={stats.todo}
            total={stats.total}
          />
          {canViewAllTasks && (
            <QuickActions
              onCreateTask={handleCreateTask}
              onViewTeam={() => router.push('/employees')}
              onViewAnalytics={() => router.push('/dashboard')}
              onManageProjects={() => router.push('/kanban')}
              onViewRoster={() => router.push('/roster/view-schedule')}
              onViewReports={() => router.push('/reports')}
              onViewAttendance={() => router.push('/attendance/tray')}
              isAdminOrManager={canViewAllTasks}
            />
          )}
        </div>

        {/* Right Column - Activity (Admin/Manager Only) */}
        {canViewAllTasks && (
          <div className="space-y-4 md:space-y-6">
            <ActivityFeed activities={displayActivities} />
          </div>
        )}
        
        {/* For Employees - Show personal stats or other relevant info */}
        {!canViewAllTasks && (
          <div className="space-y-4 md:space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-xl font-semibold mb-4">My Tasks</h3>
              <p className="text-gray-600 mb-4">
                You have {stats.total} task{stats.total !== 1 ? 's' : ''} assigned to you.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-green-600">{stats.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">In Progress:</span>
                  <span className="font-medium text-orange-600">{stats.inProgress}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">To Do:</span>
                  <span className="font-medium text-blue-600">{stats.todo}</span>
                </div>
                {stats.overdue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Overdue:</span>
                    <span className="font-medium text-red-600">{stats.overdue}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section - Analytics (Admin/Manager Only) */}
      {canViewAllTasks && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <WeeklyProgressChart data={weeklyData} />
          <TeamPerformanceChart teamMembers={teamData} />
        </div>
      )}

      {/* Task Type Selection Dialog */}
      {showTaskTypeDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCancelDialog}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Choose Task Type
            </h3>
            <p className="text-gray-600 mb-6">
              Select the type of task you want to create:
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleTaskTypeSelect('non-recurring')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Non-Recurring Task</h4>
                    <p className="text-sm text-gray-600">
                      One-time task with a single due date
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleTaskTypeSelect('recurring')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <ClockIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Recurring Task</h4>
                    <p className="text-sm text-gray-600">
                      Task that repeats on a schedule (daily, weekly, monthly)
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6">
              <Button
                onClick={handleCancelDialog}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Tasks Modal */}
      {showOverdueModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseOverdue}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Overdue Tasks
                    </h3>
                    <p className="text-sm text-gray-600">
                      {overdueTasks.length} task{overdueTasks.length !== 1 ? 's' : ''} past due date
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseOverdue}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-3">
                {overdueTasks.map((task) => {
                  const daysOverdue = Math.ceil((new Date().getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={task.id}
                      className="p-4 border-2 border-red-100 bg-red-50 rounded-lg hover:border-red-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3.5 h-3.5" />
                              Due: {new Date(task.dueDate!).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="px-2 py-0.5 bg-white rounded-full font-medium">
                              Priority: {task.priority}
                            </span>
                            <span className="px-2 py-0.5 bg-white rounded-full font-medium">
                              Status: {task.status}
                            </span>
                          </div>
                          <TaskAssignmentInfo task={task} />
                        </div>
                        <div className="flex-shrink-0">
                          <div className="px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-semibold whitespace-nowrap">
                            {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={handleCloseOverdue}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* To Do Tasks Modal */}
      {showTodoModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseTodo}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <ClockIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      To Do Tasks
                    </h3>
                    <p className="text-sm text-gray-600">
                      {todoTasks.length} pending task{todoTasks.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseTodo}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-3">
                {todoTasks.map((task) => {
                  const now = new Date();
                  const hasDueDate = task.dueDate;
                  const dueDate = hasDueDate ? new Date(task.dueDate!) : null;
                  const isOverdue = dueDate && dueDate < now;
                  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  
                  return (
                    <div
                      key={task.id}
                      className={`p-4 border-2 rounded-lg hover:border-yellow-400 transition-colors ${
                        isOverdue ? 'border-red-100 bg-red-50' : 'border-yellow-100 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {hasDueDate && (
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3.5 h-3.5" />
                                Due: {dueDate!.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: dueDate!.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                                })}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-white rounded-full font-medium">
                              Priority: {task.priority}
                            </span>
                            {task.isRecurring && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                Recurring
                              </span>
                            )}
                          </div>
                          <TaskAssignmentInfo task={task} />
                        </div>
                        <div className="flex-shrink-0">
                          {hasDueDate && daysUntilDue !== null && (
                            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                              isOverdue 
                                ? 'bg-red-600 text-white' 
                                : daysUntilDue <= 3 
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-yellow-600 text-white'
                            }`}>
                              {isOverdue 
                                ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue`
                                : daysUntilDue === 0 
                                  ? 'Due today'
                                  : daysUntilDue === 1
                                    ? 'Due tomorrow'
                                    : `${daysUntilDue} days left`
                              }
                            </div>
                          )}
                          {!hasDueDate && (
                            <div className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-full text-xs font-semibold whitespace-nowrap">
                              No due date
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={handleCloseTodo}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* All Tasks Modal */}
      {showAllTasksModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseAllTasks}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      All Tasks
                    </h3>
                    <p className="text-sm text-gray-600">
                      {stats.total} total task{stats.total !== 1 ? 's' : ''} • {stats.completed} completed • {stats.inProgress} in progress • {stats.todo} pending
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseAllTasks}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-3">
                {allTasksSorted.map((task) => {
                  const now = new Date();
                  const hasDueDate = task.dueDate;
                  const dueDate = hasDueDate ? new Date(task.dueDate!) : null;
                  const isOverdue = dueDate && dueDate < now && task.status !== 'completed';
                  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  
                  const statusColors: Record<string, string> = {
                    'pending': 'border-yellow-200 bg-yellow-50',
                    'in-progress': 'border-orange-200 bg-orange-50',
                    'completed': 'border-green-200 bg-green-50'
                  };
                  
                  const statusBadgeColors: Record<string, string> = {
                    'pending': 'bg-yellow-100 text-yellow-700',
                    'in-progress': 'bg-orange-100 text-orange-700',
                    'completed': 'bg-green-100 text-green-700'
                  };
                  
                  return (
                    <div
                      key={task.id}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        isOverdue 
                          ? 'border-red-200 bg-red-50 hover:border-red-300' 
                          : `${statusColors[task.status] || 'border-gray-200 bg-gray-50'} hover:border-blue-300`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{task.title}</h4>
                            {task.status === 'completed' && (
                              <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-medium ${statusBadgeColors[task.status] || 'bg-gray-100 text-gray-700'}`}>
                              {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                            </span>
                            <span className="px-2 py-0.5 bg-white rounded-full font-medium text-gray-600">
                              {task.priority}
                            </span>
                            {hasDueDate && (
                              <span className="flex items-center gap-1 text-gray-500">
                                <ClockIcon className="w-3.5 h-3.5" />
                                {dueDate!.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: dueDate!.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                                })}
                              </span>
                            )}
                            {task.isRecurring && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                Recurring
                              </span>
                            )}
                          </div>
                          <TaskAssignmentInfo task={task} />
                        </div>
                        <div className="flex-shrink-0">
                          {isOverdue && (
                            <div className="px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-semibold whitespace-nowrap">
                              {Math.abs(daysUntilDue!)} day{Math.abs(daysUntilDue!) !== 1 ? 's' : ''} overdue
                            </div>
                          )}
                          {!isOverdue && hasDueDate && task.status !== 'completed' && daysUntilDue !== null && (
                            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                              daysUntilDue <= 1 
                                ? 'bg-red-600 text-white' 
                                : daysUntilDue <= 3 
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-blue-600 text-white'
                            }`}>
                              {daysUntilDue === 0 
                                ? 'Due today'
                                : daysUntilDue === 1
                                  ? 'Due tomorrow'
                                  : `${daysUntilDue} days`
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={handleCloseAllTasks}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Tasks Modal */}
      {showCompletedModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseCompleted}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Completed Tasks
                    </h3>
                    <p className="text-sm text-gray-600">
                      {completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''} completed
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseCompleted}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-3">
                {completedTasks.map((task) => {
                  const completedDate = new Date(task.updatedAt);
                  const now = new Date();
                  
                  return (
                    <div
                      key={task.id}
                      className="p-4 border-2 border-green-100 bg-green-50 rounded-lg hover:border-green-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <h4 className="font-semibold text-gray-900">{task.title}</h4>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3.5 h-3.5" />
                              Completed: {completedDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: completedDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                              })}
                            </span>
                            {task.dueDate && (
                              <span className="text-gray-400">
                                Due: {new Date(task.dueDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric'
                                })}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-white rounded-full font-medium">
                              {task.priority}
                            </span>
                            {task.isRecurring && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                Recurring
                              </span>
                            )}
                          </div>
                          <TaskAssignmentInfo task={task} />
                        </div>
                        <div className="flex-shrink-0">
                          <div className="px-3 py-1.5 bg-green-600 text-white rounded-full text-xs font-semibold whitespace-nowrap">
                            ✓ Done
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={handleCloseCompleted}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* In Progress Tasks Modal */}
      {showInProgressModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseInProgress}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      In Progress Tasks
                    </h3>
                    <p className="text-sm text-gray-600">
                      {inProgressTasks.length} task{inProgressTasks.length !== 1 ? 's' : ''} currently active
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseInProgress}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-3">
                {inProgressTasks.map((task) => {
                  const now = new Date();
                  const hasDueDate = task.dueDate;
                  const dueDate = hasDueDate ? new Date(task.dueDate!) : null;
                  const isOverdue = dueDate && dueDate < now;
                  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  
                  return (
                    <div
                      key={task.id}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        isOverdue 
                          ? 'border-red-200 bg-red-50 hover:border-red-300' 
                          : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 flex-shrink-0">
                              <svg className="w-5 h-5 text-orange-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="4 4" />
                              </svg>
                            </div>
                            <h4 className="font-semibold text-gray-900">{task.title}</h4>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {hasDueDate && (
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3.5 h-3.5" />
                                Due: {dueDate!.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: dueDate!.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                                })}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-white rounded-full font-medium">
                              {task.priority}
                            </span>
                            {task.isRecurring && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                Recurring
                              </span>
                            )}
                          </div>
                          <TaskAssignmentInfo task={task} />
                        </div>
                        <div className="flex-shrink-0">
                          {isOverdue && daysUntilDue !== null && (
                            <div className="px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-semibold whitespace-nowrap">
                              {Math.abs(daysUntilDue)} day{Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue
                            </div>
                          )}
                          {!isOverdue && hasDueDate && daysUntilDue !== null && (
                            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                              daysUntilDue <= 1 
                                ? 'bg-red-600 text-white' 
                                : daysUntilDue <= 3 
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-orange-500 text-white'
                            }`}>
                              {daysUntilDue === 0 
                                ? 'Due today'
                                : daysUntilDue === 1
                                  ? 'Due tomorrow'
                                  : `${daysUntilDue} days left`
                              }
                            </div>
                          )}
                          {!hasDueDate && (
                            <div className="px-3 py-1.5 bg-orange-600 text-white rounded-full text-xs font-semibold whitespace-nowrap">
                              ⟳ Active
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={handleCloseInProgress}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}