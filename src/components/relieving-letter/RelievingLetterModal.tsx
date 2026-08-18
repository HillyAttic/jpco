/**
 * Relieving Letter Modal
 * Create/Edit form for relieving letters
 */

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { relievingLetterService } from '@/services/relieving-letter.service';
import { validateDateRelationships } from '@/lib/relieving-letter-validation';
import { RelievingLetter, RelievingLetterSettings } from '@/types/relieving-letter.types';
import { authenticatedFetch } from '@/lib/api-client';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  doj?: string;
}

interface RelievingLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  letter?: RelievingLetter | null;
}

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  employeeName: z.string().min(1, 'Employee name is required'),
  employeeDesignation: z.string().min(1, 'Designation is required'),
  employeeDepartment: z.string().min(1, 'Department is required'),
  dateOfJoining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  dateOfLeaving: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  signatoryName: z.string().min(1, 'Signatory name is required'),
  signatoryDesignation: z.string().min(1, 'Signatory designation is required'),
  accessGranted: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export function RelievingLetterModal({
  isOpen,
  onClose,
  onSave,
  letter,
}: RelievingLetterModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<RelievingLetterSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState<string>('');

  const isEditMode = !!letter?.id;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: '',
      employeeName: '',
      employeeDesignation: '',
      employeeDepartment: '',
      dateOfJoining: '',
      dateOfLeaving: '',
      issueDate: new Date().toISOString().split('T')[0],
      signatoryName: '',
      signatoryDesignation: '',
      accessGranted: false,
    },
  });

  // Fetch employees and settings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchSettings();
    }
  }, [isOpen]);

  // Populate form when editing or when settings are loaded
  useEffect(() => {
    if (isOpen && letter) {
      reset({
        employeeId: letter.employeeId,
        employeeName: letter.employeeName,
        employeeDesignation: letter.employeeDesignation,
        employeeDepartment: letter.employeeDepartment,
        dateOfJoining: letter.dateOfJoining,
        dateOfLeaving: letter.dateOfLeaving,
        issueDate: letter.issueDate,
        signatoryName: letter.signatoryName,
        signatoryDesignation: letter.signatoryDesignation,
        accessGranted: letter.accessGranted,
      });
    } else if (isOpen && settings) {
      // Pre-fill signatory from settings in create mode
      setValue('signatoryName', settings.defaultSignatoryName);
      setValue('signatoryDesignation', settings.defaultSignatoryDesignation);
    }
  }, [isOpen, letter, settings, reset, setValue]);

  const fetchEmployees = async () => {
    try {
      const response = await authenticatedFetch('/api/employees');
      if (response.ok) {
        const json = await response.json();
        const list = Array.isArray(json) ? json : json.data ?? [];
        setEmployees(list);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchSettings = async () => {
    const data = await relievingLetterService.getSettings();
    if (data) {
      setSettings(data);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.employeeId === employeeId || e.id === employeeId);
    if (employee) {
      // Store the Firestore user doc id (Auth UID), NOT the employee number.
      // Notifications, FCM tokens, and the employee self-service query all key
      // off the uid (see RelievingLetter type: employeeId = Firebase Auth UID).
      setValue('employeeId', employee.id);
      setValue('employeeName', employee.name);
      setValue('employeeDesignation', employee.designation || '');
      setValue('employeeDepartment', employee.department || '');
      if (employee.doj) {
        setValue('dateOfJoining', employee.doj);
      }
    }
  };

  const validateDates = (data: FormData): boolean => {
    const result = validateDateRelationships(
      data.dateOfJoining,
      data.dateOfLeaving,
      data.issueDate
    );

    if (!result.isValid) {
      setDateError(result.error || 'Invalid date relationship');
      return false;
    }

    setDateError('');
    return true;
  };

  const onSubmit = async (data: FormData) => {
    if (!validateDates(data)) {
      return;
    }

    setLoading(true);
    try {
      // Get company name from settings
      const currentSettings = settings || await relievingLetterService.getSettings();
      const companyName = currentSettings?.companyName || '';

      const letterData = {
        ...data,
        companyName,
      };

      if (isEditMode && letter?.id) {
        const success = await relievingLetterService.updateLetter(letter.id, letterData);
        if (success) {
          toast.success('Letter updated successfully');
          onSave();
          onClose();
        } else {
          toast.error('Failed to update letter');
        }
      } else {
        const created = await relievingLetterService.createLetter(letterData);
        if (created) {
          toast.success(`Letter created: ${created.letterNumber}`);
          onSave();
          onClose();
        } else {
          toast.error('Failed to create letter');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save letter';
      toast.error(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setDateError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Relieving Letter' : 'Create Relieving Letter'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Employee Selector */}
          {!isEditMode && (
            <div>
              <Label htmlFor="employeeSelect">Select Employee</Label>
              <select
                id="employeeSelect"
                className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Choose an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.employeeId || emp.id}>
                    {emp.name} - {emp.designation || 'No designation'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Employee Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employeeName">Employee Name</Label>
              <Input
                id="employeeName"
                {...register('employeeName')}
                disabled={loading}
              />
              {errors.employeeName && (
                <p className="text-red-500 text-xs mt-1">{errors.employeeName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="employeeDesignation">Designation</Label>
              <Input
                id="employeeDesignation"
                {...register('employeeDesignation')}
                disabled={loading}
              />
              {errors.employeeDesignation && (
                <p className="text-red-500 text-xs mt-1">{errors.employeeDesignation.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="employeeDepartment">Department</Label>
            <Input
              id="employeeDepartment"
              {...register('employeeDepartment')}
              disabled={loading}
            />
            {errors.employeeDepartment && (
              <p className="text-red-500 text-xs mt-1">{errors.employeeDepartment.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfJoining">Date of Joining</Label>
              <Input
                id="dateOfJoining"
                type="date"
                {...register('dateOfJoining')}
                disabled={loading}
              />
              {errors.dateOfJoining && (
                <p className="text-red-500 text-xs mt-1">{errors.dateOfJoining.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="dateOfLeaving">Date of Leaving</Label>
              <Input
                id="dateOfLeaving"
                type="date"
                {...register('dateOfLeaving')}
                disabled={loading}
              />
              {errors.dateOfLeaving && (
                <p className="text-red-500 text-xs mt-1">{errors.dateOfLeaving.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                {...register('issueDate')}
                disabled={loading}
              />
              {errors.issueDate && (
                <p className="text-red-500 text-xs mt-1">{errors.issueDate.message}</p>
              )}
            </div>
          </div>

          {dateError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{dateError}</p>
            </div>
          )}

          {/* Signatory */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="signatoryName">Signatory Name</Label>
              <Input
                id="signatoryName"
                {...register('signatoryName')}
                disabled={loading}
              />
              {errors.signatoryName && (
                <p className="text-red-500 text-xs mt-1">{errors.signatoryName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="signatoryDesignation">Signatory Designation</Label>
              <Input
                id="signatoryDesignation"
                {...register('signatoryDesignation')}
                disabled={loading}
              />
              {errors.signatoryDesignation && (
                <p className="text-red-500 text-xs mt-1">{errors.signatoryDesignation.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditMode ? 'Update Letter' : 'Create Letter')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
