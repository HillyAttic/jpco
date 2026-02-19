# Leave Service - Quick Reference Guide

## Available Methods

### Leave Types

#### `getLeaveTypes()`
Get all active leave types.

```typescript
const leaveTypes = await leaveService.getLeaveTypes();
// Returns: LeaveType[]
```

**Returns default types if collection is empty:**
- Sick Leave (12 days/year)
- Casual Leave (10 days/year)  
- Vacation Leave (20 days/year)

---

### Leave Balances

#### `getLeaveBalances(employeeId: string)`
Get leave balances for an employee.

```typescript
const balances = await leaveService.getLeaveBalances('emp123');
// Returns: LeaveBalance[]
```

**Auto-creates balances if none exist.**

---

### Leave Requests

#### `getLeaveRequests(filters?)`
Get leave requests with optional filtering.

```typescript
// All requests
const all = await leaveService.getLeaveRequests();

// Employee's requests
const mine = await leaveService.getLeaveRequests({ 
  employeeId: 'emp123' 
});
```

#### `getPendingLeaveRequests(managerId: string)`
Get all pending leave requests.

```typescript
const pending = await leaveService.getPendingLeaveRequests('mgr123');
// Returns: AttendanceLeaveRequest[]
```

#### `createLeaveRequest(data)`
Create a new leave request.

```typescript
const request = await leaveService.createLeaveRequest({
  employeeId: 'emp123',
  employeeName: 'John Doe',
  employeeEmail: 'john@example.com',
  leaveTypeId: 'sick-leave',
  startDate: new Date('2026-03-01'),
  endDate: new Date('2026-03-03'),
  reason: 'Medical appointment'
});
```

**Duration is calculated automatically.**

#### `approveLeaveRequest(id: string, approverId: string)`
Approve a leave request.

```typescript
await leaveService.approveLeaveRequest('req123', 'mgr123');
```

#### `rejectLeaveRequest(id: string, approverId: string, reason: string)`
Reject a leave request.

```typescript
await leaveService.rejectLeaveRequest(
  'req123', 
  'mgr123', 
  'Insufficient leave balance'
);
```

#### `cancelLeaveRequest(id: string)`
Cancel a leave request.

```typescript
await leaveService.cancelLeaveRequest('req123');
```

---

### Legacy Methods (Still Available)

#### `getAll(filters?)`
Get all leave requests (internal format).

```typescript
const requests = await leaveService.getAll({
  status: 'pending',
  employeeId: 'emp123',
  leaveType: 'sick',
  limit: 10
});
```

#### `getById(id: string)`
Get a single leave request.

```typescript
const request = await leaveService.getById('req123');
```

#### `create(data)`
Create leave request (internal format).

```typescript
const request = await leaveService.create({
  employeeId: 'emp123',
  employeeName: 'John Doe',
  employeeEmail: 'john@example.com',
  leaveType: 'sick',
  startDate: new Date(),
  endDate: new Date(),
  reason: 'Sick'
});
```

#### `update(id: string, data)`
Update leave request.

```typescript
await leaveService.update('req123', {
  reason: 'Updated reason'
});
```

#### `approve(id, approverId, approverName)`
Approve with approver name.

```typescript
await leaveService.approve('req123', 'mgr123', 'Manager Name');
```

#### `reject(id, approverId, approverName, reason)`
Reject with approver name.

```typescript
await leaveService.reject(
  'req123', 
  'mgr123', 
  'Manager Name',
  'Reason'
);
```

#### `delete(id: string)`
Delete leave request.

```typescript
await leaveService.delete('req123');
```

#### `getStats(filters?)`
Get leave statistics.

```typescript
const stats = await leaveService.getStats();
// Returns: { totalRequests, pending, approved, rejected }
```

#### `getEmployeeRequests(employeeId: string)`
Get employee's requests (internal format).

```typescript
const requests = await leaveService.getEmployeeRequests('emp123');
```

---

## Data Structures

### LeaveType
```typescript
{
  id: string;
  name: string;
  code: string;
  isPaid: boolean;
  requiresApproval: boolean;
  maxDaysPerYear: number;
  accrualRate: number;
  carryOverAllowed: boolean;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### LeaveBalance
```typescript
{
  leaveTypeId: string;
  leaveTypeName: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  accrualRate: number;
  lastAccrualDate?: Date;
  updatedAt: Date;
}
```

### AttendanceLeaveRequest
```typescript
{
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Common Use Cases

### Display Leave Types in Dropdown
```typescript
const leaveTypes = await leaveService.getLeaveTypes();

<select>
  {leaveTypes.map(type => (
    <option key={type.id} value={type.id}>
      {type.name} ({type.maxDaysPerYear} days)
    </option>
  ))}
</select>
```

### Show Employee Leave Balance
```typescript
const balances = await leaveService.getLeaveBalances(employeeId);

{balances.map(balance => (
  <div key={balance.leaveTypeId}>
    <h3>{balance.leaveTypeName}</h3>
    <p>Remaining: {balance.remainingDays} / {balance.totalDays} days</p>
  </div>
))}
```

### Manager Approval Dashboard
```typescript
const pendingRequests = await leaveService.getPendingLeaveRequests(managerId);

{pendingRequests.map(request => (
  <div key={request.id}>
    <h3>{request.employeeName}</h3>
    <p>{request.leaveTypeName}: {request.duration} days</p>
    <button onClick={() => 
      leaveService.approveLeaveRequest(request.id, managerId)
    }>
      Approve
    </button>
    <button onClick={() => 
      leaveService.rejectLeaveRequest(request.id, managerId, 'Reason')
    }>
      Reject
    </button>
  </div>
))}
```

### Employee Leave Request Form
```typescript
const handleSubmit = async (formData) => {
  await leaveService.createLeaveRequest({
    employeeId: currentUser.id,
    employeeName: currentUser.name,
    employeeEmail: currentUser.email,
    leaveTypeId: formData.leaveTypeId,
    startDate: formData.startDate,
    endDate: formData.endDate,
    reason: formData.reason
  });
};
```

---

## Error Handling

All methods include error handling:

```typescript
try {
  const leaveTypes = await leaveService.getLeaveTypes();
} catch (error) {
  console.error('Failed to fetch leave types:', error);
  // Handle error (show toast, fallback UI, etc.)
}
```

Methods with fallbacks:
- `getLeaveTypes()` - Returns default types
- `getLeaveBalances()` - Returns empty array
- `getLeaveRequests()` - Returns empty array
- `getPendingLeaveRequests()` - Returns empty array

Methods that throw errors:
- `createLeaveRequest()` - Throws on failure
- `approveLeaveRequest()` - Throws on failure
- `rejectLeaveRequest()` - Throws on failure
- `cancelLeaveRequest()` - Throws on failure

---

## Security

### Permissions
- **Leave Types**: All users can read, only managers can write
- **Leave Balances**: Users can read their own, managers can read all
- **Leave Requests**: Users can read their own, managers can read all

### Rules Deployed
Security rules have been deployed to Firestore for:
- `leave-types` collection
- `leave-balances` collection
- `leave-requests` collection (existing)

---

**Last Updated**: February 19, 2026
**Version**: 2.0
