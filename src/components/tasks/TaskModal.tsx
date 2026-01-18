import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Task } from '@/types/task.types';
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
const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], { message: 'Invalid priority value' }),
  status: z.enum(['pending', 'in-progress', 'completed']),
  assignedTo: z.string().min(1, 'At least one assignee is required'),
  category: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  task?: Task | null;
  isLoading?: boolean;
}

/**
 * TaskModal Component
 * Form modal for creating and editing tasks with validation
 * Validates Requirements: 2.2, 2.3
 */
export function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  isLoading = false,
}: TaskModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      status: 'pending',
      assignedTo: '',
      category: '',
    },
  });

  // Update form when task prop changes (edit mode)
  useEffect(() => {
    if (task) {
      // Format date for input field
      const formattedDate = task.dueDate 
        ? new Date(task.dueDate).toISOString().split('T')[0]
        : '';
      
      reset({
        title: task.title,
        description: task.description || '',
        dueDate: formattedDate,
        priority: task.priority,
        status: task.status === 'todo' ? 'pending' : task.status,
        assignedTo: task.assignedTo?.join(', ') || '',
        category: task.category || '',
      });
    } else {
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formattedTomorrow = tomorrow.toISOString().split('T')[0];
      
      reset({
        title: '',
        description: '',
        dueDate: formattedTomorrow,
        priority: 'medium',
        status: 'pending',
        assignedTo: '',
        category: '',
      });
    }
  }, [task, reset]);

  const handleFormSubmit = async (data: TaskFormData) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Edit Task' : 'Create New Task'}
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

          {/* Due Date - Requirement 2.2 */}
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <input
              id="dueDate"
              type="date"
              {...register('dueDate')}
              min={getMinDate()}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              required
            />
            {errors.dueDate && (
              <p className="text-sm text-red-600 mt-1">{errors.dueDate.message}</p>
            )}
          </div>

          {/* Priority Selector - Requirement 2.2 */}
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

          {/* Assignee Multi-Select - Requirement 2.2 */}
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
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
