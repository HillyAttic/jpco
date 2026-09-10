import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RecurringTask, TeamMemberMapping } from '@/services/recurring-task.service';
import { Team, teamService } from '@/services/team.service';
import { Category, categoryService } from '@/services/category.service';
import { Client } from '@/services/client.service';
import { authenticatedFetch } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Select from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { TeamMemberMappingDialog } from './TeamMemberMappingDialog';
import { useModal } from '@/contexts/modal-context';
import { TAR_TEMPLATE, STAT_TEMPLATE, initializeWorkflowSteps } from '@/lib/workflow-templates';

// Form-specific schema matching the design requirements
// Requirement 3.2, 3.8
const recurringTaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], { message: 'Invalid priority value' }),
  status: z.enum(['pending', 'in-progress', 'completed']),
  contactIds: z.string().optional(),
  categoryId: z.string().optional(),
  recurrencePattern: z.enum(['monthly', 'quarterly', 'half-yearly', 'yearly'], {
    message: 'Invalid recurrence pattern'
  }),
  startDate: z.string().min(1, 'Start date is required'),
  dueDate: z.string().optional(),
  teamId: z.string().optional(),
  requiresArn: z.boolean().optional(),
  requiresRemark: z.boolean().optional(),
  tarEnabled: z.boolean().optional(),
  statEnabled: z.boolean().optional(),
  clientFilter: z.enum([
    'all', 'roc', 'gstr1', 'gst3b', 'iff', 'itr',
    'itrAudit', 'taxAudit', 'accounting', 'clientVisit',
    'bank', 'tcs', 'tds', 'statutoryAudit'
  ]).optional(),
  showUnassignedClients: z.boolean().optional(),
});

type RecurringTaskFormData = z.infer<typeof recurringTaskFormSchema>;

interface RecurringTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecurringTaskFormData) => Promise<void>;
  task?: RecurringTask | null;
  isLoading?: boolean;
}

/**
 * RecurringTaskModal Component
 * Form modal for creating and editing recurring tasks with recurrence pattern,
 * start/end dates, and team assignment
 * Validates Requirements: 3.2, 3.8
 */
export function RecurringTaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  isLoading = false,
}: RecurringTaskModalProps) {
  const { openModal, closeModal } = useModal();
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<Client[]>([]);
  const [clientFilter, setClientFilter] = useState<'all' | 'roc' | 'gstr1' | 'gst3b' | 'iff' | 'itr' | 'itrAudit' | 'taxAudit' | 'accounting' | 'clientVisit' | 'bank' | 'tcs' | 'tds' | 'statutoryAudit'>('all');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [teamMemberMappings, setTeamMemberMappings] = useState<TeamMemberMapping[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [tarEnabled, setTarEnabled] = useState(false);
  const [statEnabled, setStatEnabled] = useState(false);
  const [showUnassignedClients, setShowUnassignedClients] = useState(false);
  const [dynamicClientStats, setDynamicClientStats] = useState<{
    totalCount: number;
    mappedCount: number;
    unassignedCount: number;
  } | null>(null);
  const [loadingDynamicStats, setLoadingDynamicStats] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<RecurringTaskFormData>({
    resolver: zodResolver(recurringTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      contactIds: '',
      categoryId: '',
      recurrencePattern: 'monthly',
      startDate: '',
      dueDate: '',
      teamId: '',
      requiresArn: false,
      requiresRemark: false,
    },
  });

  const startDate = watch('startDate');
  const teamId = watch('teamId');

  // Notify global modal context when this modal opens/closes
  useEffect(() => {
    if (isOpen) {
      openModal();
    } else {
      closeModal();
    }
  }, [isOpen, openModal, closeModal]);

  // Clear selected clients when team changes
  useEffect(() => {
    if (task && teamId !== task.teamId) {
      // Team has changed, clear the selected clients
      setSelectedClients([]);
      setValue('contactIds', '');
    }
  }, [teamId, task, setValue]);

  // Load teams for team selection
  useEffect(() => {
    const loadTeams = async () => {
      setLoadingTeams(true);
      try {
        const activeTeams = await teamService.getAll({ status: 'active' });
        setTeams(activeTeams);
      } catch (error) {
        console.error('Error loading teams:', error);
        setTeams([]);
      } finally {
        setLoadingTeams(false);
      }
    };

    if (isOpen) {
      loadTeams();
    }
  }, [isOpen]);

  // Load categories for category selection
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const activeCategories = await categoryService.getFiltered({ isActive: true });
        setCategories(activeCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Load clients for contact selection
  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const response = await authenticatedFetch('/api/clients?status=active&limit=1000');
        if (!response.ok) throw new Error('Failed to fetch clients');
        const result = await response.json();
        setClients(result.data || []);
      } catch (error) {
        console.error('Error loading clients:', error);
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };

    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  // Get filtered clients based on selected filter
  const getFilteredClients = () => {
    let filteredClients = clients;
    
    // Apply field filter (Compliance fields only)
    if (clientFilter !== 'all') {
      filteredClients = filteredClients.filter(client => {
        switch (clientFilter) {
          case 'roc':
            return !!client.compliance?.roc;
          case 'gstr1':
            return !!client.compliance?.gstr1;
          case 'gst3b':
            return !!client.compliance?.gst3b;
          case 'iff':
            return !!client.compliance?.iff;
          case 'itr':
            return !!client.compliance?.itr;
          case 'itrAudit':
            return !!client.compliance?.itrAudit;
          case 'taxAudit':
            return !!client.compliance?.taxAudit;
          case 'accounting':
            return !!client.compliance?.accounting;
          case 'clientVisit':
            return !!client.compliance?.clientVisit;
          case 'bank':
            return !!client.compliance?.bank;
          case 'tcs':
            return !!client.compliance?.tcs;
          case 'tds':
            return !!client.compliance?.tds;
          case 'statutoryAudit':
            return !!client.compliance?.statutoryAudit;
          default:
            return true;
        }
      });
    }

    // Apply search query
    if (clientSearchQuery.trim() !== '') {
      const query = clientSearchQuery.toLowerCase();
      filteredClients = filteredClients.filter(client =>
        client.clientName.toLowerCase().includes(query) ||
        (client.businessName && client.businessName.toLowerCase().includes(query)) ||
        (client.taxIdentifiers?.gstin && client.taxIdentifiers.gstin.toLowerCase().includes(query)) ||
        (client.taxIdentifiers?.tan && client.taxIdentifiers.tan.toLowerCase().includes(query)) ||
        (client.taxIdentifiers?.pan && client.taxIdentifiers.pan.toLowerCase().includes(query))
      );
    }
    
    return filteredClients;
  };

  // Get available clients (not already selected)
  const getAvailableClients = () => {
    const filteredClients = getFilteredClients();
    return filteredClients.filter(client =>
      !selectedClients.some(selected => selected.id === client.id)
    );
  };

  // Fetch dynamic client stats based on compliance filter
  const fetchDynamicClientStats = async () => {
    const filter = watch('clientFilter') || 'all';
    if (!filter || filter === 'all') {
      setDynamicClientStats(null);
      return;
    }

    setLoadingDynamicStats(true);
    try {
      if (task?.id) {
        // For existing tasks, call the API with current filter as query param
        // (may not be saved to Firestore yet when editing)
        const response = await authenticatedFetch(
          `/api/recurring-tasks/${task.id}/unassigned-clients?clientFilter=${encodeURIComponent(filter)}`
        );
        if (response.ok) {
          const data = await response.json();
          setDynamicClientStats({
            totalCount: data.totalCount,
            mappedCount: data.mappedCount,
            unassignedCount: data.unassignedCount,
          });
        }
      } else {
        // For new tasks, calculate client-side using loaded clients
        const filteredClients = clients.filter(client => {
          if (!client.compliance) return false;
          return !!client.compliance[filter as keyof typeof client.compliance];
        });

        const mappedClientIds = new Set<string>();
        teamMemberMappings.forEach(mapping => {
          mapping.clientIds.forEach(clientId => mappedClientIds.add(clientId));
        });

        const mappedCount = filteredClients.filter(c =>
          c.id && mappedClientIds.has(c.id)
        ).length;

        setDynamicClientStats({
          totalCount: filteredClients.length,
          mappedCount,
          unassignedCount: filteredClients.length - mappedCount,
        });
      }
    } catch (error) {
      console.error('Error fetching dynamic client stats:', error);
    } finally {
      setLoadingDynamicStats(false);
    }
  };

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newSelectedClients = [...selectedClients, client];
    setSelectedClients(newSelectedClients);
    setValue('contactIds', newSelectedClients.map(c => c.id!).join(', '));
  };

  // Handle client removal
  const handleClientRemove = (clientId: string) => {
    const newSelectedClients = selectedClients.filter(c => c.id !== clientId);
    setSelectedClients(newSelectedClients);
    setValue('contactIds', newSelectedClients.map(c => c.id!).join(', '));
  };

  // Update form when task prop changes (edit mode)
  useEffect(() => {
    console.log('🔄 [RecurringTaskModal] Task prop changed:', task);
    
    if (task) {
      // Helper function to safely format dates
      const formatDateForInput = (date: any): string => {
        if (!date) return '';
        try {
          // Handle Firestore Timestamp objects
          const dateObj = date.toDate ? date.toDate() : new Date(date);
          // Check if date is valid
          if (isNaN(dateObj.getTime())) return '';
          return dateObj.toISOString().split('T')[0];
        } catch (error) {
          console.error('Error formatting date:', error);
          return '';
        }
      };

      // Format dates for input fields
      const formattedStartDate = formatDateForInput(task.startDate);
      const formattedDueDate = formatDateForInput(task.dueDate);
      
      reset({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        contactIds: task.contactIds?.join(', ') || '',
        categoryId: task.categoryId || '',
        recurrencePattern: task.recurrencePattern,
        startDate: formattedStartDate,
        dueDate: formattedDueDate,
        teamId: task.teamId || '',
        requiresArn: task.requiresArn || false,
        requiresRemark: task.requiresRemark || false,
        tarEnabled: task.tarEnabled || false,
        statEnabled: task.statEnabled || false,
        clientFilter: task.clientFilter || 'all',
      });

      // Set TAR/STAT toggle states
      setTarEnabled(task.tarEnabled || false);
      setStatEnabled(task.statEnabled || false);
      setShowUnassignedClients(task.showUnassignedClients || false);

      // Set selected clients for display
      if (task.contactIds && task.contactIds.length > 0) {
        const taskClients = clients.filter(client => 
          task.contactIds.includes(client.id!)
        );
        setSelectedClients(taskClients);
        console.log('👥 [RecurringTaskModal] Loaded selected clients:', taskClients.length);
      }

      // Set team member mappings
      if (task.teamMemberMappings && task.teamMemberMappings.length > 0) {
        console.log('🗺️ [RecurringTaskModal] Loading team member mappings:', task.teamMemberMappings);
        setTeamMemberMappings(task.teamMemberMappings);
      } else {
        console.log('⚠️ [RecurringTaskModal] No team member mappings found in task');
        setTeamMemberMappings([]);
      }

      // Load dynamic client stats if task has a clientFilter
      if (task.clientFilter && task.clientFilter !== 'all' && task.id) {
        setTimeout(() => fetchDynamicClientStats(), 300);
      }
    } else {
      console.log('➕ [RecurringTaskModal] Creating new task - resetting form');
      // Set default dates for new task
      const today = new Date();
      const formattedToday = today.toISOString().split('T')[0];
      
      reset({
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        contactIds: '',
        categoryId: '',
        recurrencePattern: 'monthly',
        startDate: formattedToday,
        dueDate: '',
        teamId: '',
        requiresArn: false,
        requiresRemark: false,
        tarEnabled: false,
        statEnabled: false,
        clientFilter: 'all',
      });
      setSelectedClients([]);
      setTeamMemberMappings([]);
      setTarEnabled(false);
      setStatEnabled(false);
      setDynamicClientStats(null);
    }
  }, [task, reset, clients]);

  const handleFormSubmit = async (data: RecurringTaskFormData) => {
    try {
      console.log('📋 [RecurringTaskModal] Form data before submission:', data);
      console.log('🗺️ [RecurringTaskModal] Team member mappings state:', teamMemberMappings);

      // Include team member mappings and TAR/STAT settings in the submission
      // Preserve existing workflow steps if task already has them, otherwise initialize new ones
      let tarSteps = undefined;
      let statSteps = undefined;

      if (tarEnabled) {
        // Preserve existing TAR steps if task already has them
        if (task?.tarSteps && task.tarSteps.length > 0) {
          tarSteps = task.tarSteps;
          console.log('📋 [RecurringTaskModal] Preserving existing TAR steps:', tarSteps.length);
        } else {
          tarSteps = initializeWorkflowSteps('TAR');
          console.log('📋 [RecurringTaskModal] Initializing new TAR steps:', tarSteps.length);
        }
      }

      if (statEnabled) {
        // Preserve existing STAT steps if task already has them
        if (task?.statSteps && task.statSteps.length > 0) {
          statSteps = task.statSteps;
          console.log('📋 [RecurringTaskModal] Preserving existing STAT steps:', statSteps.length);
        } else {
          statSteps = initializeWorkflowSteps('STAT');
          console.log('📋 [RecurringTaskModal] Initializing new STAT steps:', statSteps.length);
        }
      }

      const submissionData = {
        ...data,
        tarEnabled,
        statEnabled,
        tarSteps,
        statSteps,
        teamMemberMappings: teamMemberMappings.length > 0 ? teamMemberMappings : undefined,
        clientFilter: data.clientFilter || undefined,
        showUnassignedClients: showUnassignedClients,
      };

      console.log('📤 [RecurringTaskModal] Final submission data:', submissionData);

      await onSubmit(submissionData as any);
      reset();
      setTeamMemberMappings([]);
      setTarEnabled(false);
      setStatEnabled(false);
      setShowUnassignedClients(false);
      setDynamicClientStats(null);
      onClose();
    } catch (error) {
      console.error('❌ [RecurringTaskModal] Error submitting recurring task:', error);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedClients([]);
    setClientFilter('all');
    setClientSearchQuery('');
    setTeamMemberMappings([]);
    setTarEnabled(false);
    setStatEnabled(false);
    setShowUnassignedClients(false);
    setDynamicClientStats(null);
    onClose();
  };

  // Get minimum date (today)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Edit Recurring Task' : 'Create New Recurring Task'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Task Title */}
          <div>
            <Input
              id="title"
              label="Task Title"
              {...register('title')}
              placeholder="Enter task title"
              error={errors.title?.message}
              required
              disabled={isLoading}
            />
          </div>

          {/* Unassigned Clients Info - Dynamic Client Filter */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
            <div>
              <Label htmlFor="clientFilter" className="font-medium text-gray-900 dark:text-white">
                Client Filter (Optional)
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-2">
                Select a compliance filter to automatically track total, mapped, and unassigned clients. New clients with matching filters will be included automatically.
              </p>
              <Select
                id="clientFilter"
                {...register('clientFilter')}
                disabled={isLoading}
                className="mt-1"
                onChange={(e) => {
                  register('clientFilter').onChange(e);
                  // Reset stats when filter changes
                  setDynamicClientStats(null);
                  if (e.target.value && e.target.value !== 'all') {
                    // Trigger fetch after a short delay for state to settle
                    setTimeout(() => fetchDynamicClientStats(), 100);
                  }
                }}
              >
                <option value="all">All Clients (No Filter)</option>
                <option value="roc">Only with ROC</option>
                <option value="gstr1">Only with GSTR1</option>
                <option value="gst3b">Only with GST3B</option>
                <option value="iff">Only with IFF</option>
                <option value="itr">Only with ITR</option>
                <option value="itrAudit">Only with ITR Audit</option>
                <option value="taxAudit">Only with Tax Audit</option>
                <option value="accounting">Only with Accounting</option>
                <option value="clientVisit">Only with Client Visit</option>
                <option value="bank">Only with Bank</option>
                <option value="tcs">Only with TCS</option>
                <option value="tds">Only with TDS</option>
                <option value="statutoryAudit">Only with Statutory Audit</option>
              </Select>
            </div>

            {/* Live Stats Preview */}
            {dynamicClientStats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-2xl font-bold text-blue-600">{dynamicClientStats.totalCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Clients</p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-2xl font-bold text-green-600">{dynamicClientStats.mappedCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mapped</p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-2xl font-bold text-orange-600">{dynamicClientStats.unassignedCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unassigned</p>
                </div>
              </div>
            )}

            {loadingDynamicStats && (
              <div className="flex items-center justify-center py-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-gray-500">Calculating clients...</span>
              </div>
            )}

            {watch('clientFilter') && watch('clientFilter') !== 'all' && !dynamicClientStats && !loadingDynamicStats && (
              <div className="flex items-center justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchDynamicClientStats}
                  disabled={loadingDynamicStats}
                  className="text-xs"
                >
                  Calculate Unassigned Clients
                </Button>
              </div>
            )}

            {/* Show Unassigned Clients Toggle */}
            {watch('clientFilter') && watch('clientFilter') !== 'all' && (
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-orange-600 dark:text-orange-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <Label className="text-sm font-medium text-orange-900 dark:text-orange-200">
                    Show Unassigned Clients in Reports
                  </Label>
                </div>
                <Switch
                  checked={showUnassignedClients}
                  onCheckedChange={setShowUnassignedClients}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter task description"
              rows={4}
              className="mt-1"
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Recurrence Pattern Selector - Requirement 3.2 */}
          <div>
            <Label htmlFor="recurrencePattern">Recurring Type</Label>
            <select
              id="recurrencePattern"
              {...register('recurrencePattern')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half-yearly">Half Yearly</option>
              <option value="yearly">Yearly</option>
            </select>
            {errors.recurrencePattern && (
              <p className="text-sm text-red-600 mt-1">{errors.recurrencePattern.message}</p>
            )}
          </div>

          {/* Team Assignment - Requirement 3.8 */}
          <div>
            <Label htmlFor="teamId">Team</Label>
            <Select
              id="teamId"
              {...register('teamId')}
              disabled={isLoading || loadingTeams}
              className="mt-1"
            >
              <option value="">Select a team (optional)</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} {team.leaderName ? `- Led by ${team.leaderName}` : ''}
                </option>
              ))}
            </Select>
            {errors.teamId && (
              <p className="text-sm text-red-600 mt-1">{errors.teamId.message}</p>
            )}
            {loadingTeams && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading teams...</p>
            )}
            {!loadingTeams && teams.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No teams available</p>
            )}
          </div>

          {/* Team Member Mapping */}
          <div>
            <Label htmlFor="teamMemberMapping" className="mb-2 block">Team Member Mapping</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMappingDialog(true)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2"
            >
              <UserGroupIcon className="w-5 h-5" />
              <span>
                {teamMemberMappings.length === 0
                  ? 'Configure Team Member Mapping'
                  : `${teamMemberMappings.length} Team Member${teamMemberMappings.length !== 1 ? 's' : ''} Mapped`}
              </span>
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Assign specific clients to individual team members. If configured, team members will only see tasks for their assigned clients.
            </p>
            
            {/* Display current mappings summary */}
            {teamMemberMappings.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Current Mappings:</p>
                <div className="space-y-1">
                  {teamMemberMappings.map((mapping) => (
                    <div key={mapping.userId} className="text-xs text-blue-800">
                      <span className="font-medium">{mapping.userName}</span>: {mapping.clientIds.length} client{mapping.clientIds.length !== 1 ? 's' : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Category ID */}
          <div>
            <Label htmlFor="categoryId">Category ID</Label>
            <Select
              id="categoryId"
              {...register('categoryId')}
              disabled={isLoading || loadingCategories}
              className="mt-1"
            >
              <option value="">Select a category (optional)</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} {category.description ? `- ${category.description}` : ''}
                </option>
              ))}
            </Select>
            {errors.categoryId && (
              <p className="text-sm text-red-600 mt-1">{errors.categoryId.message}</p>
            )}
            {loadingCategories && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading categories...</p>
            )}
            {!loadingCategories && categories.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No categories available</p>
            )}
          </div>

          {/* Assign Contacts */}
          <div>
            <Label htmlFor="contactIds">Assign Contacts (Optional)</Label>
            
            {/* Client Filter */}
            <div className="mt-2 mb-3">
              <Label htmlFor="client-filter" className="text-xs">Filter Clients By</Label>
              <Select
                id="client-filter"
                value={clientFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClientFilter(e.target.value as any)}
                disabled={isLoading || loadingClients}
                className="mt-1"
              >
                <option value="all">All Clients</option>
                <option value="roc">Only with ROC</option>
                <option value="gstr1">Only with GSTR1</option>
                <option value="gst3b">Only with GST3B</option>
                <option value="iff">Only with IFF</option>
                <option value="itr">Only with ITR</option>
                <option value="itrAudit">Only with ITR Audit</option>
                <option value="taxAudit">Only with Tax Audit</option>
                <option value="accounting">Only with Accounting</option>
                <option value="clientVisit">Only with Client Visit</option>
                <option value="bank">Only with Bank</option>
                <option value="tcs">Only with TCS</option>
                <option value="tds">Only with TDS</option>
                <option value="statutoryAudit">Only with Statutory Audit</option>
              </Select>
            </div>

            {/* Search Input */}
            <div className="mb-3">
              <Label htmlFor="client-search" className="text-xs">Search Clients</Label>
              <Input
                id="client-search"
                type="text"
                placeholder="Search by name, business name, GSTIN, TAN, or PAN..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                disabled={isLoading || loadingClients}
                className="mt-1"
              />
            </div>

            {/* Select All Button */}
            {getAvailableClients().length > 0 && (
              <div className="mb-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const availableClients = getAvailableClients();
                    const newSelectedClients = [...selectedClients, ...availableClients];
                    setSelectedClients(newSelectedClients);
                    setValue('contactIds', newSelectedClients.map(c => c.id!).join(', '));
                  }}
                  disabled={isLoading || loadingClients}
                  className="w-full"
                >
                  Select All Filtered Clients ({getAvailableClients().length})
                </Button>
              </div>
            )}

            {/* Multi-Select Client List */}
            <div className="mb-3">
              <Label className="text-xs mb-2 block">Select Clients (Click to add multiple)</Label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-md max-h-60 overflow-y-auto">
                {loadingClients ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading clients...</div>
                ) : getAvailableClients().length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {clientSearchQuery.trim() !== '' 
                      ? 'No clients match your search'
                      : clientFilter !== 'all' 
                        ? `No clients with ${clientFilter.toUpperCase()} available to add` 
                        : selectedClients.length > 0 
                          ? 'All clients have been selected'
                        : 'No clients available'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {getAvailableClients().map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleClientSelect(client.id!)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors focus:bg-blue-100 focus:outline-none"
                        disabled={isLoading}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{client.clientName}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {client.businessName || 'No Business Name'}
                            {client.taxIdentifiers?.gstin ? ` • GSTIN: ${client.taxIdentifiers.gstin}` :
                             client.taxIdentifiers?.tan ? ` • TAN: ${client.taxIdentifiers.tan}` :
                             client.taxIdentifiers?.pan ? ` • PAN: ${client.taxIdentifiers.pan}` : ''}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Clients Display */}
            {selectedClients.length > 0 && (
              <div className="mt-2 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Selected Clients ({selectedClients.length})</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedClients([]);
                      setValue('contactIds', '');
                    }}
                    disabled={isLoading}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-2 bg-white dark:bg-gray-dark border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{client.clientName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {client.taxIdentifiers?.gstin ? `GSTIN: ${client.taxIdentifiers.gstin}` :
                           client.taxIdentifiers?.tan ? `TAN: ${client.taxIdentifiers.tan}` :
                           client.taxIdentifiers?.pan ? `PAN: ${client.taxIdentifiers.pan}` :
                           client.businessName || 'No ID'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleClientRemove(client.id!)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 ml-1 transition-colors"
                        disabled={isLoading}
                        aria-label={`Remove ${client.clientName}`}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Optional: Use search and filters to find specific clients, then click "Select All" or click individual clients to add them.
            </p>
            
            {errors.contactIds && (
              <p className="text-sm text-red-600 mt-1">{errors.contactIds.message}</p>
            )}

            {/* Hidden input to store contact IDs */}
            <input type="hidden" {...register('contactIds')} />
          </div>

          {/* Date Fields Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date - Requirement 3.2 */}
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <input
                id="startDate"
                type="date"
                {...register('startDate')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
                required
              />
              {errors.startDate && (
                <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>
              )}
            </div>

            {/* Due Date - Optional */}
            <div>
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <input
                id="dueDate"
                type="date"
                {...register('dueDate')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              />
              {errors.dueDate && (
                <p className="text-sm text-red-600 mt-1">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          {/* Priority Selector */}
          <div>
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              {...register('priority')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            {errors.priority && (
              <p className="text-sm text-red-600 mt-1">{errors.priority.message}</p>
            )}
          </div>

          {/* Enable ARN / Remark Checkboxes */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="requiresArn"
                {...register('requiresArn')}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Require ARN on completion</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="requiresRemark"
                {...register('requiresRemark')}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Require Remark on completion</span>
            </label>
          </div>

          {/* TAR/STAT Workflow Toggles */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Report Types</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enable workflow tracking for compliance reports</p>
            </div>

            {/* TAR Toggle */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="tarEnabled" className="font-medium text-gray-900 dark:text-white cursor-pointer">
                    TAR Reports
                  </Label>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    TAX
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Tax Audit Report · {TAR_TEMPLATE.steps.length} steps
                </p>
              </div>
              <Switch
                id="tarEnabled"
                checked={tarEnabled}
                onCheckedChange={setTarEnabled}
                disabled={isLoading}
              />
            </div>

            {/* STAT Toggle */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="statEnabled" className="font-medium text-gray-900 dark:text-white cursor-pointer">
                    Statutory Reports
                  </Label>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                    STAT
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Statutory Audit · {STAT_TEMPLATE.steps.length} steps
                </p>
              </div>
              <Switch
                id="statEnabled"
                checked={statEnabled}
                onCheckedChange={setStatEnabled}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} disabled={isLoading} className="text-white">
              {task ? 'Update Recurring Task' : 'Create Recurring Task'}
            </Button>
          </DialogFooter>
        </form>

        {/* Team Member Mapping Dialog */}
        <TeamMemberMappingDialog
          isOpen={showMappingDialog}
          onClose={() => setShowMappingDialog(false)}
          onSave={(mappings) => {
            setTeamMemberMappings(mappings);
            // Re-fetch dynamic stats if filter is set
            if (watch('clientFilter') && watch('clientFilter') !== 'all') {
              setTimeout(() => fetchDynamicClientStats(), 200);
            }
          }}
          initialMappings={teamMemberMappings}
          defaultClientFilter={watch('clientFilter') || 'all'}
        />
      </DialogContent>
    </Dialog>
  );
}
