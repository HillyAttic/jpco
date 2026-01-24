import { z } from 'zod';

// User validation schemas
export const signUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val: boolean) => val === true, 'You must accept the terms and conditions')
}).refine((data: any) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmNewPassword: z.string()
}).refine((data: any) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"]
});

// Common validation patterns
const emailPattern = z.string().email({ message: 'Invalid email format' }).refine(
  (email) => {
    // Additional validation: email should not contain special characters except . _ - in local part
    const localPart = email.split('@')[0];
    return /^[a-zA-Z0-9._-]+$/.test(localPart);
  },
  { message: 'Invalid email format' }
);
const phonePattern = z.string()
  .regex(/^\+?[\d\s\-()]+$/, { message: 'Invalid phone format' })
  .refine(
    (phone) => {
      // Remove all non-digit characters and check length
      const digitsOnly = phone.replace(/\D/g, '');
      return digitsOnly.length >= 10 && digitsOnly.length <= 15;
    },
    { message: 'Invalid phone format' }
  );

// Client validation schema
export const clientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: emailPattern,
  phone: phonePattern,
  company: z.string().min(1, 'Company is required').max(100, 'Company must be less than 100 characters'),
  avatar: z.instanceof(File).optional(),
  status: z.enum(['active', 'inactive']).optional().default('active')
});

// Task validation schemas
export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  dueDate: z.date({ message: 'Invalid date format' }).refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Due date must be in the future'
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], { message: 'Invalid priority value' }),
  status: z.enum(['pending', 'in-progress', 'completed']).optional().default('pending'),
  assignedTo: z.array(z.string()).min(1, 'At least one assignee is required'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional()
});

// Recurring Task validation schema
export const recurringTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], { message: 'Invalid priority value' }),
  status: z.enum(['pending', 'in-progress', 'completed']).optional().default('pending'),
  contactIds: z.array(z.string()).min(1, 'At least one contact is required'),
  categoryId: z.string().optional(),
  recurrencePattern: z.enum(['monthly', 'quarterly', 'half-yearly', 'yearly'], { message: 'Invalid recurrence pattern' }),
  startDate: z.date({ message: 'Invalid date format' }),
  endDate: z.date({ message: 'Invalid date format' }).optional(),
  teamId: z.string().optional(),
  isPaused: z.boolean().optional().default(false)
}).refine(
  (data) => !data.endDate || data.endDate > data.startDate,
  { 
    message: 'End date must be after start date', 
    path: ['endDate'] 
  }
);

export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment must be less than 500 characters'),
  taskId: z.string()
});

// Team validation schemas
export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  leaderId: z.string().optional(),
  memberIds: z.array(z.string()).optional().default([]),
  status: z.enum(['active', 'inactive', 'archived']).optional().default('active')
});

// Employee validation schema
export const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: emailPattern,
  phone: phonePattern,
  position: z.string().min(1, 'Position is required').max(100, 'Position must be less than 100 characters'),
  department: z.string().min(1, 'Department is required').max(100, 'Department must be less than 100 characters'),
  hireDate: z.date({ message: 'Invalid date format' }).refine((date) => date <= new Date(), {
    message: 'Hire date cannot be in the future'
  }),
  avatar: z.instanceof(File).optional(),
  managerId: z.string().optional(),
  status: z.enum(['active', 'on-leave', 'terminated']).optional().default('active')
});

// Export types
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type RecurringTaskFormData = z.infer<typeof recurringTaskSchema>;
export type CommentFormData = z.infer<typeof commentSchema>;
export type TeamFormData = z.infer<typeof teamSchema>;
export type EmployeeFormData = z.infer<typeof employeeSchema>;

// ============================================================================
// Attendance System Validation Schemas
// ============================================================================

// Geolocation validation
const geolocationCoordinatesSchema = z.object({
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  accuracy: z.number().positive().optional(),
  timestamp: z.date().optional()
});

// Helper function for geolocation radius validation
export const validateGeolocationRadius = (
  userLocation: { latitude: number; longitude: number },
  allowedLocation: { latitude: number; longitude: number },
  radiusMeters: number
): boolean => {
  // Haversine formula to calculate distance between two points
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (userLocation.latitude * Math.PI) / 180;
  const φ2 = (allowedLocation.latitude * Math.PI) / 180;
  const Δφ = ((allowedLocation.latitude - userLocation.latitude) * Math.PI) / 180;
  const Δλ = ((allowedLocation.longitude - userLocation.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in meters
  return distance <= radiusMeters;
};

// Break record validation
const breakRecordSchema = z.object({
  id: z.string().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().min(0, 'Duration must be non-negative').optional()
}).refine(
  (data) => !data.endTime || data.endTime > data.startTime,
  { message: 'Break end time must be after start time', path: ['endTime'] }
);

// Attendance record validation schema
export const attendanceRecordSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  clockIn: z.date(),
  clockOut: z.date().optional(),
  breaks: z.array(breakRecordSchema).optional().default([]),
  location: z.object({
    clockIn: geolocationCoordinatesSchema.optional(),
    clockOut: geolocationCoordinatesSchema.optional()
  }).optional(),
  notes: z.object({
    clockIn: z.string().max(500, 'Clock in note must be less than 500 characters').optional(),
    clockOut: z.string().max(500, 'Clock out note must be less than 500 characters').optional()
  }).optional(),
  shiftId: z.string().optional()
}).refine(
  (data) => !data.clockOut || data.clockOut > data.clockIn,
  { message: 'Clock out time must be after clock in time', path: ['clockOut'] }
);

// Clock in data validation
export const clockInSchema = z.object({
  timestamp: z.date(),
  location: geolocationCoordinatesSchema.optional(),
  notes: z.string().max(500, 'Note must be less than 500 characters').optional()
});

// Clock out data validation
export const clockOutSchema = z.object({
  timestamp: z.date(),
  location: geolocationCoordinatesSchema.optional(),
  notes: z.string().max(500, 'Note must be less than 500 characters').optional()
});

// Leave request validation schema
export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be less than 1000 characters'),
  halfDay: z.boolean().optional()
}).refine(
  (data) => data.endDate >= data.startDate,
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

// Leave type validation schema
export const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Leave type name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string()
    .min(2, 'Code must be at least 2 characters')
    .max(10, 'Code must be less than 10 characters')
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores'),
  isPaid: z.boolean(),
  requiresApproval: z.boolean(),
  maxDaysPerYear: z.number()
    .min(0, 'Maximum days must be non-negative')
    .max(365, 'Maximum days cannot exceed 365'),
  accrualRate: z.number().min(0, 'Accrual rate must be non-negative'),
  carryOverAllowed: z.boolean(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format. Use hex format (e.g., #FF5733)')
});

// Shift validation schema
export const shiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required').max(100, 'Name must be less than 100 characters'),
  startTime: z.string().regex(
    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    'Invalid time format. Use HH:mm format (e.g., 09:00)'
  ),
  endTime: z.string().regex(
    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    'Invalid time format. Use HH:mm format (e.g., 17:00)'
  ),
  daysOfWeek: z.array(z.number().min(0).max(6))
    .min(1, 'Select at least one day')
    .refine(
      (days) => {
        // Check for duplicates
        const uniqueDays = new Set(days);
        return uniqueDays.size === days.length;
      },
      { message: 'Duplicate days are not allowed' }
    ),
  breakDuration: z.number()
    .min(0, 'Break duration must be non-negative')
    .max(480, 'Break duration cannot exceed 8 hours (480 minutes)'),
  overtimeThreshold: z.number().min(0, 'Overtime threshold must be non-negative'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format. Use hex format (e.g., #FF5733)')
});

// Date range validation helper
export const dateRangeSchema = z.object({
  start: z.date(),
  end: z.date()
}).refine(
  (data) => data.end >= data.start,
  { message: 'End date must be on or after start date', path: ['end'] }
);

// Attendance filters validation
export const attendanceFiltersSchema = z.object({
  employeeId: z.string().optional(),
  teamId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(['active', 'completed', 'incomplete', 'edited']).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional()
}).refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

// Leave filters validation
export const leaveFiltersSchema = z.object({
  employeeId: z.string().optional(),
  managerId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  leaveTypeId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional()
}).refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

// Report configuration validation
export const reportConfigSchema = z.object({
  reportType: z.enum(['daily', 'weekly', 'monthly', 'custom', 'leave-summary']),
  startDate: z.date(),
  endDate: z.date(),
  filters: z.object({
    employeeIds: z.array(z.string()).optional(),
    departmentIds: z.array(z.string()).optional(),
    teamIds: z.array(z.string()).optional()
  }),
  format: z.enum(['pdf', 'csv', 'excel']),
  includeCharts: z.boolean()
}).refine(
  (data) => data.endDate >= data.startDate,
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

// Attendance policy validation
export const attendancePolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required').max(100, 'Name must be less than 100 characters'),
  graceMinutes: z.number()
    .int('Grace minutes must be a whole number')
    .min(0, 'Grace minutes must be non-negative')
    .max(60, 'Grace minutes cannot exceed 60'),
  maxBreakMinutes: z.number()
    .int('Max break minutes must be a whole number')
    .min(0, 'Max break minutes must be non-negative')
    .max(480, 'Max break minutes cannot exceed 8 hours (480 minutes)'),
  autoClockOutTime: z.string().regex(
    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    'Invalid time format. Use HH:mm format (e.g., 23:59)'
  ),
  geolocationRequired: z.boolean(),
  geolocationRadius: z.number()
    .min(0, 'Geolocation radius must be non-negative')
    .max(10000, 'Geolocation radius cannot exceed 10km (10000 meters)'),
  overtimeMultiplier: z.number()
    .min(1, 'Overtime multiplier must be at least 1')
    .max(3, 'Overtime multiplier cannot exceed 3'),
  minDailyHours: z.number()
    .min(0, 'Minimum daily hours must be non-negative')
    .max(24, 'Minimum daily hours cannot exceed 24'),
  maxDailyHours: z.number()
    .min(0, 'Maximum daily hours must be non-negative')
    .max(24, 'Maximum daily hours cannot exceed 24')
}).refine(
  (data) => data.maxDailyHours >= data.minDailyHours,
  { message: 'Maximum daily hours must be greater than or equal to minimum daily hours', path: ['maxDailyHours'] }
);

// Export attendance validation types
export type AttendanceRecordFormData = z.infer<typeof attendanceRecordSchema>;
export type ClockInFormData = z.infer<typeof clockInSchema>;
export type ClockOutFormData = z.infer<typeof clockOutSchema>;
export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;
export type LeaveTypeFormData = z.infer<typeof leaveTypeSchema>;
export type ShiftFormData = z.infer<typeof shiftSchema>;
export type DateRangeFormData = z.infer<typeof dateRangeSchema>;
export type AttendanceFiltersFormData = z.infer<typeof attendanceFiltersSchema>;
export type LeaveFiltersFormData = z.infer<typeof leaveFiltersSchema>;
export type ReportConfigFormData = z.infer<typeof reportConfigSchema>;
export type AttendancePolicyFormData = z.infer<typeof attendancePolicySchema>;
export type GeolocationCoordinatesFormData = z.infer<typeof geolocationCoordinatesSchema>;
export type BreakRecordFormData = z.infer<typeof breakRecordSchema>;
