import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Task } from '@/types/task.types';
import { Employee, employeeService } from '@/services/employee.service';
import { Category, categoryService } from '@/services/category.service';
import { Client, clientService } from '@/services/client.service';
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
import { XMarkIcon } from '@heroicons/react/24/outline';

// Form-specific schema matching the design requirements
const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], { message: 'Invalid priority value' }),
  status: z.enum(['pending', 'in-progress', 'completed']),
  assignedTo: z.string().min(1, 'At least one assignee is required'),
  categoryId: z.string().optional(),
  contactId: z.string().optional(),
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [clientFilter, setClientFilter] = useState<'all' | 'gstin' | 'tan' | 'pan'>('all');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      status: 'pending',
      assignedTo: '',
      categoryId: '',
      contactId: '',
    },
  });

  // Load employees for assignment
  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const activeEmployees = await employeeService.getAll({ status: 'active', limit: 1000 });
        setEmployees(activeEmployees);
      } catch (error) {
        console.error('Error loading employees:', error);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    if (isOpen) {
      loadEmployees();
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
        const activeClients = await clientService.getAll({ status: 'active', limit: 1000 });
        setClients(activeClients);
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
    if (clientFilter === 'all') {
      return clients;
    }
    
    return clients.filter(client => {
      switch (clientFilter) {
        case 'gstin':
          return client.gstin && client.gstin.trim() !== '';
        case 'tan':
          return client.tan && client.tan.trim() !== '';
        case 'pan':
          return client.pan && client.pan.trim() !== '';
        default:
          return true;
      }
    });
  };

  // Handle employee selection
  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee || selectedEmployees.some(e => e.id === employeeId)) return;

    const newSelectedEmployees = [...selectedEmployees, employee];
    setSelectedEmployees(newSelectedEmployees);
    setValue('assignedTo', newSelectedEmployees.map(e => e.id!).join(', '));
  };

  // Handle employee removal
  const handleEmployeeRemove = (employeeId: string) => {
    const newSelectedEmployees = selectedEmployees.filter(e => e.id !== employeeId);
    setSelectedEmployees(newSelectedEmployees);
    setValue('assignedTo', newSelectedEmployees.map(e => e.id!).join(', '));
  };

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
        categoryId: task.category || '',
        contactId: '',
      });

      // Set selected employees for display
      if (task.assignedTo && task.assignedTo.length > 0) {
        const taskEmployees = employees.filter(emp => 
          task.assignedTo.includes(emp.id!)
        );
        setSelectedEmployees(taskEmployees);
      }
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
        categoryId: '',
        contactId: '',
      });
      setSelectedEmployees([]);
    }
  }, [task, reset, employees]);

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
    setSelectedEmployees([]);
    setClientFilter('all');
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

          {/* Assign Users - Requirement 2.2 */}
          <div>
            <Label htmlFor="assignedTo">Assign Users</Label>
            
            {/* Multi-Select Employee List */}
            <div className="mb-3 mt-2">
              <Label className="text-xs mb-2 block">Select Employees (Click to add multiple)</Label>
              <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                {loadingEmployees ? (
                  <div className="p-4 text-center text-gray-500">Loading employees...</div>
                ) : employees.filter(emp => !selectedEmployees.some(sel => sel.id === emp.id)).length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {selectedEmployees.length > 0 
                      ? 'All employees have been selected'
                      : 'No employees available'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {employees.filter(emp => !selectedEmployees.some(sel => sel.id === emp.id)).map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => handleEmployeeSelect(employee.id!)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors focus:bg-blue-100 focus:outline-none"
                        disabled={isLoading}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                          <span className="text-xs text-gray-600">
                            {employee.email} • {employee.role}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Employees Display */}
            {selectedEmployees.length > 0 && (
              <div className="mt-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600">Selected Employees ({selectedEmployees.length})</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployees([]);
                      setValue('assignedTo', '');
                    }}
                    disabled={isLoading}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-2.5 py-1.5 shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                        <span className="text-xs text-gray-500">{employee.role}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEmployeeRemove(employee.id!)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 ml-1 transition-colors"
                        disabled={isLoading}
                        aria-label={`Remove ${employee.name}`}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {errors.assignedTo && (
              <p className="text-sm text-red-600 mt-1">{errors.assignedTo.message}</p>
            )}

            {/* Hidden input to store employee IDs */}
            <input type="hidden" {...register('assignedTo')} />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="categoryId">Category</Label>
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
              <p className="text-sm text-gray-500 mt-1">Loading categories...</p>
            )}
            {!loadingCategories && categories.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">No categories available</p>
            )}
          </div>

          {/* Contact ID */}
          <div>
            <Label htmlFor="contactId">Contact ID</Label>
            
            {/* Client Filter */}
            <div className="mt-2 mb-2">
              <Label htmlFor="client-filter" className="text-xs">Filter Clients By</Label>
              <Select
                id="client-filter"
                value={clientFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClientFilter(e.target.value as any)}
                disabled={isLoading || loadingClients}
                className="mt-1"
              >
                <option value="all">All Clients</option>
                <option value="gstin">Only with GSTIN</option>
                <option value="tan">Only with T.A.N.</option>
                <option value="pan">Only with P.A.N.</option>
              </Select>
            </div>

            <Select
              id="contactId"
              {...register('contactId')}
              disabled={isLoading || loadingClients}
              className="mt-1"
            >
              <option value="">Select a client (optional)</option>
              {getFilteredClients().map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.businessName ? ` - ${client.businessName}` : ''}
                  {client.gstin ? ` • GSTIN: ${client.gstin}` : 
                   client.tan ? ` • TAN: ${client.tan}` : 
                   client.pan ? ` • PAN: ${client.pan}` : ''}
                </option>
              ))}
            </Select>
            {errors.contactId && (
              <p className="text-sm text-red-600 mt-1">{errors.contactId.message}</p>
            )}
            {loadingClients && (
              <p className="text-sm text-gray-500 mt-1">Loading clients...</p>
            )}
            {!loadingClients && getFilteredClients().length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {clientFilter !== 'all' 
                  ? `No clients with ${clientFilter.toUpperCase()} available` 
                  : 'No clients available'}
              </p>
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
