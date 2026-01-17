# Firebase Service Layer

This directory contains the Firebase service layer implementation for the management pages feature. The service layer provides a clean abstraction over Firebase Firestore operations with support for CRUD operations, pagination, search, and filtering.

## Architecture

The service layer follows a generic pattern with a base `FirebaseService` class that can be instantiated for any entity type. Each entity (Client, Task, Team, Employee) has its own service module that wraps the generic service with entity-specific logic.

### Files

- **firebase.service.ts** - Generic Firebase service with CRUD, pagination, search, and filtering
- **client.service.ts** - Client-specific service operations
- **nonrecurring-task.service.ts** - Non-recurring task service operations
- **recurring-task.service.ts** - Recurring task service with recurrence logic
- **team.service.ts** - Team service with member management
- **employee.service.ts** - Employee service with department and status management
- **index.ts** - Central export point for all services

## Features

### Generic Firebase Service

The `FirebaseService` class provides:

- **CRUD Operations**: Create, Read, Update, Delete
- **Pagination**: Cursor-based pagination with configurable page size
- **Filtering**: Multiple field filters with various operators (==, !=, <, >, <=, >=)
- **Sorting**: Order by any field in ascending or descending order
- **Search**: Client-side text search across single or multiple fields
- **Error Handling**: Consistent error handling with user-friendly messages
- **Timestamp Conversion**: Automatic conversion between Firestore Timestamps and JavaScript Dates
- **Batch Operations**: Batch delete multiple documents

### Entity-Specific Services

Each entity service extends the generic service with:

- Type-safe interfaces
- Entity-specific query methods
- Business logic (e.g., task completion, team member management)
- Statistics and aggregation methods

## Usage Examples

### Client Service

```typescript
import { clientService } from '@/services';

// Get all clients
const clients = await clientService.getAll();

// Get clients with filters
const activeClients = await clientService.getAll({
  status: 'active',
  search: 'john',
  limit: 20,
});

// Get paginated clients
const { data, lastDoc, hasMore } = await clientService.getPaginated(20);

// Create a client
const newClient = await clientService.create({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  company: 'Acme Corp',
  status: 'active',
});

// Update a client
const updated = await clientService.update('client-id', {
  phone: '+0987654321',
});

// Delete a client
await clientService.delete('client-id');

// Search clients
const results = await clientService.search('john');
```

### Task Service

```typescript
import { nonRecurringTaskService } from '@/services';

// Get all tasks with filters
const tasks = await nonRecurringTaskService.getAll({
  status: 'pending',
  priority: 'high',
  search: 'design',
});

// Toggle task completion
const completed = await nonRecurringTaskService.toggleComplete('task-id');

// Get overdue tasks
const overdue = await nonRecurringTaskService.getOverdue();

// Get task statistics
const stats = await nonRecurringTaskService.getStatistics();
// Returns: { total, pending, inProgress, completed, overdue }
```

### Recurring Task Service

```typescript
import { recurringTaskService } from '@/services';

// Create a recurring task
const recurringTask = await recurringTaskService.create({
  title: 'Weekly Report',
  description: 'Submit weekly status report',
  dueDate: new Date(),
  priority: 'medium',
  status: 'pending',
  assignedTo: ['user-id'],
  recurrencePattern: 'weekly',
  nextOccurrence: new Date(),
  startDate: new Date(),
});

// Complete a cycle (schedules next occurrence)
const updated = await recurringTaskService.completeCycle('task-id', 'user-id');

// Pause a recurring task
await recurringTaskService.pause('task-id');

// Resume a recurring task
await recurringTaskService.resume('task-id');

// Get completion rate
const rate = await recurringTaskService.getCompletionRate('task-id');
```

### Team Service

```typescript
import { teamService } from '@/services';

// Create a team
const team = await teamService.create({
  name: 'Engineering',
  description: 'Software development team',
  leaderId: 'leader-id',
  leaderName: 'Jane Smith',
  members: [],
  status: 'active',
});

// Add a member
const updated = await teamService.addMember('team-id', {
  id: 'member-id',
  name: 'John Doe',
  role: 'Developer',
});

// Remove a member
await teamService.removeMember('team-id', 'member-id');

// Update member role
await teamService.updateMemberRole('team-id', 'member-id', 'Senior Developer');

// Get teams by member
const memberTeams = await teamService.getTeamsByMember('member-id');
```

### Employee Service

```typescript
import { employeeService } from '@/services';

// Create an employee
const employee = await employeeService.create({
  employeeId: 'EMP001',
  name: 'John Doe',
  email: 'john@company.com',
  phone: '+1234567890',
  position: 'Software Engineer',
  department: 'Engineering',
  hireDate: new Date(),
  status: 'active',
  teamIds: [],
});

// Deactivate an employee (soft delete)
await employeeService.deactivate('employee-id');

// Get employees by department
const engineers = await employeeService.getByDepartment('Engineering');

// Get employee statistics
const stats = await employeeService.getStatistics();
// Returns: { total, active, onLeave, terminated, departmentDistribution }
```

## Advanced Usage

### Custom Filters

```typescript
import { createFirebaseService, QueryOptions } from '@/services';

const customService = createFirebaseService<MyEntity>('my-collection');

const options: QueryOptions = {
  filters: [
    { field: 'status', operator: '==', value: 'active' },
    { field: 'priority', operator: '>=', value: 'medium' },
  ],
  orderByField: 'createdAt',
  orderDirection: 'desc',
  pagination: {
    pageSize: 10,
  },
};

const results = await customService.getAll(options);
```

### Pagination

```typescript
// First page
const page1 = await clientService.getPaginated(20);

// Next page
const page2 = await clientService.getPaginated(20, page1.lastDoc);

// Check if more pages exist
if (page2.hasMore) {
  const page3 = await clientService.getPaginated(20, page2.lastDoc);
}
```

## Error Handling

All service methods throw `FirebaseServiceError` objects with consistent structure:

```typescript
try {
  await clientService.create(data);
} catch (error) {
  const serviceError = error as FirebaseServiceError;
  console.error(serviceError.code); // e.g., 'permission-denied'
  console.error(serviceError.message); // User-friendly message
}
```

Common error codes:
- `permission-denied` - User lacks permission
- `not-found` - Resource doesn't exist
- `already-exists` - Duplicate resource
- `unauthenticated` - User not authenticated
- `unavailable` - Service temporarily unavailable

## Firestore Collections

The service layer uses the following Firestore collections:

- `/clients` - Client records
- `/tasks` - Non-recurring tasks
- `/recurring-tasks` - Recurring tasks
- `/teams` - Team records
- `/employees` - Employee records

## Performance Considerations

### Search Limitations

The current implementation uses client-side filtering for text search. For production applications with large datasets, consider:

- Firebase Extensions for full-text search
- Algolia integration
- Elasticsearch integration
- Cloud Functions for server-side search

### Pagination

Always use pagination for large datasets to improve performance and reduce costs:

```typescript
// Good: Paginated query
const { data } = await clientService.getPaginated(20);

// Avoid: Loading all records
const allClients = await clientService.getAll(); // Can be expensive
```

### Indexing

Ensure Firestore indexes are created for:
- Filtered fields
- Sorted fields
- Combined filter + sort queries

Firebase will prompt you to create indexes when needed.

## Security

### Firestore Rules

Implement appropriate Firestore security rules for each collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Clients collection
    match /clients/{clientId} {
      allow read, write: if request.auth != null;
    }
    
    // Tasks collection
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    
    // Add rules for other collections...
  }
}
```

### Input Validation

Always validate input data before calling service methods:

```typescript
import { z } from 'zod';

const clientSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/),
  company: z.string().min(1).max(100),
  status: z.enum(['active', 'inactive']),
});

// Validate before creating
const validatedData = clientSchema.parse(formData);
await clientService.create(validatedData);
```

## Testing

The service layer is designed to be testable. Use Firebase Emulator for testing:

```typescript
import { connectFirestoreEmulator } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// In test setup
if (process.env.NODE_ENV === 'test') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 1.3**: Client CRUD operations with Firebase persistence
- **Requirement 1.7**: Client search functionality
- **Requirement 1.10**: Client pagination (>20 items)
- **Requirement 2.3**: Task CRUD operations with Firebase persistence

The service layer provides the foundation for all management pages to interact with Firebase Firestore in a consistent, type-safe, and maintainable way.
