import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RecurringTask } from '@/services/recurring-task.service';
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

// Form-specific schema matching the design requirements
// Requirement 3.2, 3.8
const recurringTaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], { message: 'Invalid priority value' }),
  status: z.enum(['pending', 'in-progress', 'completed']),
  assignedTo: z.string().min(1, 'At least one assignee is required'),
  category: z.string().optional(),
  recurrencePattern: z.enum(['daily', 'weekly', 'monthly', 'quarterly'], { 
    message: 'Invalid recurrence pattern' 
  }),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  teamId: z.string().optional(),
}).refine(
  (data) => {
    // Validate end date is after start date
    if (!data.endDate) return true;
    return new Date(data.endDate) > new Date(data.startDate);
  },
  { 
    message: 'End date must be after start date', 
    path: ['endDate'] 
  }
);

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
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<RecurringTaskFormData>({
    resolver: zodResolver(recurringTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      status: 'pending',
      assignedTo: '',
      category: '',
      recurrencePattern: 'weekly',
      startDate: '',
      endDate: '',
      teamId: '',
    },
  });

  // Watch startDate to set minimum for endDate
  const startDate = watch('startDate');

  // Update form when task prop changes (edit mode)
  useEffect(() => {
    if (task) {
      // Format dates for input fields
      const formattedDueDate = task.dueDate 
        ? new Date(task.dueDate).toISOString().split('T')[0]
        : '';
      const formattedStartDate = task.startDate
        ? new Date(task.startDate).toISOString().split('T')[0]
        : '';
      const formattedEndDate = task.endDate
        ? new Date(task.endDate).toISOString().split('T')[0]
        : '';
      
      reset({
        title: task.title,
        description: task.description || '',
        dueDate: formattedDueDate,
        priority: task.priority,
        status: task.status,
        assignedTo: task.assignedTo?.join(', ') || '',
        category: task.category || '',
        recurrencePattern: task.recurrencePattern,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        teamId: task.teamId || '',
      });
    } else {
      // Set default dates for new task
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const formattedToday = today.toISOString().split('T')[0];
      const formattedTomorrow = tomorrow.toISOString().split('T')[0];
      
      reset({
        title: '',
        description: '',
        dueDate: formattedTomorrow,
        priority: 'medium',
        status: 'pending',
        assignedTo: '',
        category: '',
        recurrencePattern: 'weekly',
        startDate: formattedToday,
        endDate: '',
        teamId: '',
      });
    }
  }, [task, reset]);

  const handleFormSubmit = async (data: RecurringTaskFormData) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting recurring task:', error);
    }
  };

  const handleClose = () => {
    reset();
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
            <Label htmlFor="recurrencePattern">Recurrence Pattern</Label>
            <select
              id="recurrencePattern"
              {...register('recurrencePattern')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
            {errors.recurrencePattern && (
              <p className="text-sm text-red-600 mt-1">{errors.recurrencePattern.message}</p>
            )}
          </div>

          {/* Date Fields Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Start Date - Requirement 3.2 */}
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <input
                id="startDate"
                type="date"
                {...register('startDate')}
                min={getMinDate()}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
                required
              />
              {errors.startDate && (
                <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>
              )}
            </div>

            {/* End Date - Requirement 3.2 */}
            <div>
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <input
                id="endDate"
                type="date"
                {...register('endDate')}
                min={startDate || getMinDate()}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              />
              {errors.endDate && (
                <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <Label htmlFor="dueDate">First Due Date</Label>
              <input
                id="dueDate"
                type="date"
                {...register('dueDate')}
                min={startDate || getMinDate()}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
                required
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
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              {...register('status')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            {errors.status && (
              <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
            )}
          </div>

          {/* Assignee Multi-Select */}
          <div>
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Input
              id="assignedTo"
              {...register('assignedTo')}
              placeholder="Enter assignee names (comma-separated)"
              helperText="Enter multiple names separated by commas"
              error={errors.assignedTo?.message}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: John Doe, Jane Smith, Bob Johnson
            </p>
          </div>

          {/* Team Assignment Selector - Requirement 3.8 */}
          <div>
            <Label htmlFor="teamId">Team Assignment (Optional)</Label>
            <Input
              id="teamId"
              {...register('teamId')}
              placeholder="Enter team ID or name"
              helperText="Assign this recurring task to a team"
              disabled={isLoading}
            />
            {errors.teamId && (
              <p className="text-sm text-red-600 mt-1">{errors.teamId.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Team assignment will apply to all future occurrences
            </p>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category (Optional)</Label>
            <Input
              id="category"
              {...register('category')}
              placeholder="Enter task category"
              disabled={isLoading}
            />
            {errors.category && (
              <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
            )}
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
      </DialogContent>
    </Dialog>
  );
}
