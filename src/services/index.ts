/**
 * Services Index
 * Central export point for all service modules
 */

// Firebase base service
export {
  FirebaseService,
  createFirebaseService,
  type FilterParams,
  type PaginationParams,
  type QueryOptions,
  type PaginatedResult,
  type FirebaseServiceError,
} from './firebase.service';

// Client service
export {
  clientService,
  type Client,
  type ClientFormData,
} from './client.service';

// Non-recurring task service
export {
  nonRecurringTaskService,
  type NonRecurringTask,
} from './nonrecurring-task.service';

// Recurring task service
export {
  recurringTaskService,
  type RecurringTask,
  type CompletionRecord,
} from './recurring-task.service';

// Team service
export {
  teamService,
  type Team,
  type TeamMember,
} from './team.service';

// Employee service
export {
  employeeService,
  type Employee,
} from './employee.service';
