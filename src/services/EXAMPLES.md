# Firebase Service Layer - Usage Examples

This document provides practical examples of using the Firebase service layer.

## Table of Contents

1. [Basic CRUD Operations](#basic-crud-operations)
2. [Filtering and Search](#filtering-and-search)
3. [Pagination](#pagination)
4. [Entity-Specific Operations](#entity-specific-operations)
5. [Error Handling](#error-handling)

## Basic CRUD Operations

### Creating Records

```typescript
import { clientService, nonRecurringTaskService, teamService } from '@/services';

// Create a client
async function createClient() {
  try {
    const newClient = await clientService.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      company: 'Acme Corporation',
      status: 'active',
    });
    
    console.log('Client created:', newClient.id);
    return newClient;
  } catch (error) {
    console.error('Failed to create client:', error);
    throw error;
  }
}

// Create a task
async function createTask() {
  const newTask = await nonRecurringTaskService.create({
    title: 'Design Homepage',
    description: 'Create wireframes and mockups for the new homepage',
    dueDate: new Date('2026-02-01'),
    priority: 'high',
    status: 'pending',
    assignedTo: ['user-id-1', 'user-id-2'],
    category: 'Design',
  });
  
  return newTask;
}

// Create a team
async function createTeam() {
  const newTeam = await teamService.create({
    name: 'Engineering Team',
    description: 'Core software development team',
    leaderId: 'leader-id',
    leaderName: 'Jane Smith',
    members: [
      {
        id: 'member-1',
        name: 'John Doe',
        role: 'Senior Developer',
      },
      {
        id: 'member-2',
        name: 'Alice Johnson',
        role: 'Developer',
      },
    ],
    department: 'Engineering',
    status: 'active',
  });
  
  return newTeam;
}
```

### Reading Records

```typescript
// Get a single record by ID
async function getClient(clientId: string) {
  const client = await clientService.getById(clientId);
  
  if (!client) {
    console.log('Client not found');
    return null;
  }
  
  console.log('Client:', client.name);
  return client;
}

// Get all records
async function getAllClients() {
  const clients = await clientService.getAll();
  console.log(`Found ${clients.length} clients`);
  return clients;
}

// Get records with filters
async function getActiveClients() {
  const activeClients = await clientService.getAll({
    status: 'active',
    limit: 50,
  });
  
  return activeClients;
}
```

### Updating Records

```typescript
// Update a client
async function updateClientPhone(clientId: string, newPhone: string) {
  const updatedClient = await clientService.update(clientId, {
    phone: newPhone,
  });
  
  console.log('Client updated:', updatedClient.id);
  return updatedClient;
}

// Update multiple fields
async function updateTask(taskId: string) {
  const updatedTask = await nonRecurringTaskService.update(taskId, {
    status: 'in-progress',
    priority: 'urgent',
  });
  
  return updatedTask;
}
```

### Deleting Records

```typescript
// Delete a record
async function deleteClient(clientId: string) {
  await clientService.delete(clientId);
  console.log('Client deleted');
}

// Soft delete (for employees)
async function deactivateEmployee(employeeId: string) {
  const deactivated = await employeeService.deactivate(employeeId);
  console.log('Employee deactivated:', deactivated.status); // 'terminated'
  return deactivated;
}
```

## Filtering and Search

### Single Field Filter

```typescript
// Get tasks by status
async function getPendingTasks() {
  const tasks = await nonRecurringTaskService.getAll({
    status: 'pending',
  });
  
  return tasks;
}

// Get employees by department
async function getEngineeringEmployees() {
  const employees = await employeeService.getAll({
    department: 'Engineering',
  });
  
  return employees;
}
```

### Multiple Filters

```typescript
// Get high priority pending tasks
async function getUrgentPendingTasks() {
  const tasks = await nonRecurringTaskService.getAll({
    status: 'pending',
    priority: 'high',
  });
  
  return tasks;
}

// Get active clients with search
async function searchActiveClients(searchTerm: string) {
  const clients = await clientService.getAll({
    status: 'active',
    search: searchTerm,
  });
  
  return clients;
}
```

### Text Search

```typescript
// Search clients by name, email, or company
async function searchClients(query: string) {
  const results = await clientService.search(query);
  console.log(`Found ${results.length} matching clients`);
  return results;
}

// Search employees
async function searchEmployees(query: string) {
  const results = await employeeService.search(query);
  return results;
}
```

## Pagination

### Basic Pagination

```typescript
// Get first page
async function getFirstPageOfClients() {
  const { data, lastDoc, hasMore } = await clientService.getPaginated(20);
  
  console.log(`Page 1: ${data.length} clients`);
  console.log(`Has more pages: ${hasMore}`);
  
  return { data, lastDoc, hasMore };
}

// Get next page
async function getNextPageOfClients(lastDoc: any) {
  const { data, lastDoc: newLastDoc, hasMore } = await clientService.getPaginated(20, lastDoc);
  
  console.log(`Next page: ${data.length} clients`);
  console.log(`Has more pages: ${hasMore}`);
  
  return { data, lastDoc: newLastDoc, hasMore };
}
```

### Pagination with Filters

```typescript
import { createFirebaseService, QueryOptions } from '@/services';

async function getPaginatedActiveClients(pageSize: number = 20, lastDoc?: any) {
  const clientFirebaseService = createFirebaseService('clients');
  
  const options: QueryOptions = {
    filters: [
      { field: 'status', operator: '==', value: 'active' },
    ],
    orderByField: 'createdAt',
    orderDirection: 'desc',
    pagination: {
      pageSize,
      lastDoc,
    },
  };
  
  return clientFirebaseService.getPaginated(options);
}
```

### Infinite Scroll Implementation

```typescript
import { useState, useEffect } from 'react';
import { clientService } from '@/services';

function useInfiniteClients() {
  const [clients, setClients] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const { data, lastDoc: newLastDoc, hasMore: more } = 
        await clientService.getPaginated(20, lastDoc);
      
      setClients(prev => [...prev, ...data]);
      setLastDoc(newLastDoc);
      setHasMore(more);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMore();
  }, []);

  return { clients, loadMore, hasMore, loading };
}
```

## Entity-Specific Operations

### Task Operations

```typescript
// Toggle task completion
async function toggleTaskCompletion(taskId: string) {
  const task = await nonRecurringTaskService.toggleComplete(taskId);
  console.log('Task status:', task.status);
  return task;
}

// Get overdue tasks
async function getOverdueTasks() {
  const overdue = await nonRecurringTaskService.getOverdue();
  console.log(`${overdue.length} overdue tasks`);
  return overdue;
}

// Get task statistics
async function getTaskStats() {
  const stats = await nonRecurringTaskService.getStatistics();
  console.log('Task Statistics:', stats);
  // { total: 50, pending: 20, inProgress: 15, completed: 10, overdue: 5 }
  return stats;
}
```

### Recurring Task Operations

```typescript
import { recurringTaskService } from '@/services';

// Create a weekly recurring task
async function createWeeklyTask() {
  const task = await recurringTaskService.create({
    title: 'Weekly Team Meeting',
    description: 'Discuss progress and blockers',
    dueDate: new Date(),
    priority: 'medium',
    status: 'pending',
    assignedTo: ['team-lead-id'],
    recurrencePattern: 'weekly',
    nextOccurrence: new Date('2026-01-20'),
    startDate: new Date('2026-01-13'),
  });
  
  return task;
}

// Complete a cycle
async function completeRecurringTask(taskId: string, userId: string) {
  const task = await recurringTaskService.completeCycle(taskId, userId);
  console.log('Next occurrence:', task.nextOccurrence);
  return task;
}

// Pause a recurring task
async function pauseTask(taskId: string) {
  await recurringTaskService.pause(taskId);
  console.log('Task paused');
}

// Resume a recurring task
async function resumeTask(taskId: string) {
  await recurringTaskService.resume(taskId);
  console.log('Task resumed');
}

// Get completion rate
async function getTaskCompletionRate(taskId: string) {
  const rate = await recurringTaskService.getCompletionRate(taskId);
  console.log(`Completion rate: ${rate.toFixed(1)}%`);
  return rate;
}
```

### Team Operations

```typescript
import { teamService } from '@/services';

// Add a member to a team
async function addTeamMember(teamId: string) {
  const team = await teamService.addMember(teamId, {
    id: 'new-member-id',
    name: 'Bob Wilson',
    role: 'Junior Developer',
  });
  
  console.log(`Team now has ${team.members.length} members`);
  return team;
}

// Remove a member from a team
async function removeTeamMember(teamId: string, memberId: string) {
  const team = await teamService.removeMember(teamId, memberId);
  console.log(`Member removed. Team now has ${team.members.length} members`);
  return team;
}

// Update member role
async function promoteMember(teamId: string, memberId: string) {
  const team = await teamService.updateMemberRole(
    teamId,
    memberId,
    'Senior Developer'
  );
  
  return team;
}

// Get all teams for a member
async function getMemberTeams(memberId: string) {
  const teams = await teamService.getTeamsByMember(memberId);
  console.log(`Member is in ${teams.length} teams`);
  return teams;
}
```

### Employee Operations

```typescript
import { employeeService } from '@/services';

// Get employees by department
async function getDepartmentEmployees(department: string) {
  const employees = await employeeService.getByDepartment(department);
  return employees;
}

// Get employees by manager
async function getManagerDirectReports(managerId: string) {
  const reports = await employeeService.getByManager(managerId);
  console.log(`Manager has ${reports.length} direct reports`);
  return reports;
}

// Get employee statistics
async function getEmployeeStats() {
  const stats = await employeeService.getStatistics();
  console.log('Employee Statistics:', stats);
  // {
  //   total: 100,
  //   active: 85,
  //   onLeave: 10,
  //   terminated: 5,
  //   departmentDistribution: { Engineering: 40, Sales: 30, HR: 15, ... }
  // }
  return stats;
}
```

## Error Handling

### Basic Error Handling

```typescript
import { FirebaseServiceError } from '@/services';

async function createClientWithErrorHandling(data: any) {
  try {
    const client = await clientService.create(data);
    return { success: true, data: client };
  } catch (error) {
    const serviceError = error as FirebaseServiceError;
    
    console.error('Error code:', serviceError.code);
    console.error('Error message:', serviceError.message);
    
    return { success: false, error: serviceError.message };
  }
}
```

### Specific Error Handling

```typescript
async function handleSpecificErrors(clientId: string) {
  try {
    const client = await clientService.getById(clientId);
    return client;
  } catch (error) {
    const serviceError = error as FirebaseServiceError;
    
    switch (serviceError.code) {
      case 'permission-denied':
        console.error('You do not have permission to access this client');
        break;
      case 'not-found':
        console.error('Client not found');
        break;
      case 'unauthenticated':
        console.error('Please sign in to continue');
        break;
      default:
        console.error('An unexpected error occurred:', serviceError.message);
    }
    
    throw error;
  }
}
```

### Retry Logic

```typescript
async function createClientWithRetry(data: any, maxRetries: number = 3) {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await clientService.create(data);
      return client;
    } catch (error) {
      const serviceError = error as FirebaseServiceError;
      lastError = serviceError;
      
      // Only retry on transient errors
      if (serviceError.code === 'unavailable' && attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}
```

### User-Friendly Error Messages

```typescript
function getErrorMessage(error: any): string {
  const serviceError = error as FirebaseServiceError;
  
  const errorMessages: Record<string, string> = {
    'permission-denied': 'You do not have permission to perform this action.',
    'not-found': 'The requested item could not be found.',
    'already-exists': 'An item with this information already exists.',
    'unauthenticated': 'Please sign in to continue.',
    'unavailable': 'The service is temporarily unavailable. Please try again later.',
  };
  
  return errorMessages[serviceError.code] || 'An unexpected error occurred. Please try again.';
}

// Usage
async function createClientWithFriendlyError(data: any) {
  try {
    return await clientService.create(data);
  } catch (error) {
    const message = getErrorMessage(error);
    alert(message); // Or use a toast notification
    throw error;
  }
}
```

## Complete Example: Client Management Component

```typescript
import { useState, useEffect } from 'react';
import { clientService, Client, FirebaseServiceError } from '@/services';

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load clients
  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      setError(null);
      const data = await clientService.getAll();
      setClients(data);
    } catch (err) {
      const serviceError = err as FirebaseServiceError;
      setError(serviceError.message);
    } finally {
      setLoading(false);
    }
  }

  // Search clients
  async function handleSearch(term: string) {
    setSearchTerm(term);
    
    if (!term) {
      loadClients();
      return;
    }

    try {
      setLoading(true);
      const results = await clientService.search(term);
      setClients(results);
    } catch (err) {
      const serviceError = err as FirebaseServiceError;
      setError(serviceError.message);
    } finally {
      setLoading(false);
    }
  }

  // Create client
  async function handleCreate(data: Omit<Client, 'id'>) {
    try {
      const newClient = await clientService.create(data);
      setClients(prev => [newClient, ...prev]);
      return newClient;
    } catch (err) {
      const serviceError = err as FirebaseServiceError;
      setError(serviceError.message);
      throw err;
    }
  }

  // Update client
  async function handleUpdate(id: string, data: Partial<Client>) {
    try {
      const updated = await clientService.update(id, data);
      setClients(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err) {
      const serviceError = err as FirebaseServiceError;
      setError(serviceError.message);
      throw err;
    }
  }

  // Delete client
  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this client?')) {
      return;
    }

    try {
      await clientService.delete(id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      const serviceError = err as FirebaseServiceError;
      setError(serviceError.message);
      throw err;
    }
  }

  return (
    <div>
      {/* Component UI */}
    </div>
  );
}
```

This examples file demonstrates the most common use cases for the Firebase service layer. For more details, see the README.md file.
