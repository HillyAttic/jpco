# Firestore Indexes Guide

This document explains the Firestore indexes created for the four new admin features.

## Overview

Firestore indexes are required for compound queries (queries with multiple filters or ordering). The indexes below optimize query performance for:

1. Leave Approval System
2. Attendance Roster
3. Client-Wise Visit Tracking
4. Manager-Employee Hierarchy

## Indexes Created

### 1. Leave Requests Collection (`leave-requests`)

#### Index 1: Status + CreatedAt
- **Fields**: `status` (ASC), `createdAt` (DESC)
- **Purpose**: Filter leave requests by status and sort by creation date
- **Used by**: Leave approvals page filtering (pending, approved, rejected)

#### Index 2: EmployeeId + CreatedAt
- **Fields**: `employeeId` (ASC), `createdAt` (DESC)
- **Purpose**: Get all leave requests for a specific employee
- **Used by**: Employee leave history view

#### Index 3: Status + EmployeeId + CreatedAt
- **Fields**: `status` (ASC), `employeeId` (ASC), `createdAt` (DESC)
- **Purpose**: Filter employee's leave requests by status
- **Used by**: Employee dashboard showing their pending/approved leaves

#### Index 4: LeaveType + CreatedAt
- **Fields**: `leaveType` (ASC), `createdAt` (DESC)
- **Purpose**: Filter by leave type (sick, casual, vacation, etc.)
- **Used by**: Leave analytics and reporting

### 2. Client Visits Collection (`client-visits`)

#### Index 1: ClientId + VisitDate
- **Fields**: `clientId` (ASC), `visitDate` (DESC)
- **Purpose**: Get all visits for a specific client
- **Used by**: Client visit history and analytics

#### Index 2: EmployeeId + VisitDate
- **Fields**: `employeeId` (ASC), `visitDate` (DESC)
- **Purpose**: Get all visits by a specific employee
- **Used by**: Employee performance tracking

#### Index 3: ClientId + EmployeeId + VisitDate
- **Fields**: `clientId` (ASC), `employeeId` (ASC), `visitDate` (DESC)
- **Purpose**: Get visits for a specific client-employee combination
- **Used by**: Detailed visit tracking and reporting

#### Index 4: TaskType + VisitDate
- **Fields**: `taskType` (ASC), `visitDate` (DESC)
- **Purpose**: Filter visits by task type (recurring vs one-time)
- **Used by**: Visit analytics by task type

### 3. Manager Hierarchies Collection (`manager-hierarchies`)

#### Index 1: ManagerId + CreatedAt
- **Fields**: `managerId` (ASC), `createdAt` (DESC)
- **Purpose**: Get hierarchy for a specific manager
- **Used by**: Manager hierarchy management page

### 4. Attendance Records Collection (`attendance-records`)

#### Index 1: EmployeeId + ClockIn
- **Fields**: `employeeId` (ASC), `clockIn` (DESC)
- **Purpose**: Get attendance records for an employee sorted by clock-in time
- **Used by**: Attendance roster page

#### Index 2: EmployeeId + Date
- **Fields**: `employeeId` (ASC), `date` (DESC)
- **Purpose**: Get attendance records for an employee by date
- **Used by**: Monthly attendance roster view

## Deployment

### Deploy All Indexes

Run one of these commands:

**Windows (CMD):**
```cmd
deploy-indexes.bat
```

**Windows (PowerShell):**
```powershell
.\deploy-indexes.ps1
```

**Manual:**
```bash
firebase deploy --only firestore:indexes
```

### Deploy Everything (Rules + Indexes)

```bash
firebase deploy --only firestore
```

## Index Build Time

- Indexes are built asynchronously by Firestore
- Small collections: Usually complete within minutes
- Large collections: May take hours depending on data volume
- You can monitor index build progress in the Firebase Console

## Monitoring Indexes

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Firestore Database → Indexes
4. Check the status of each index:
   - **Building**: Index is being created
   - **Enabled**: Index is ready to use
   - **Error**: Index creation failed

## Query Performance Tips

1. **Use indexed fields**: Always query using the indexed field combinations
2. **Avoid array-contains with other filters**: These require special composite indexes
3. **Limit result sets**: Use pagination to avoid reading too many documents
4. **Cache results**: Implement client-side caching for frequently accessed data

## Troubleshooting

### Missing Index Error

If you see an error like:
```
The query requires an index. You can create it here: [URL]
```

**Solution:**
1. Click the provided URL to create the index automatically, OR
2. Add the index definition to `firestore.indexes.json` and redeploy

### Index Build Failed

**Common causes:**
- Invalid field paths
- Conflicting index definitions
- Firestore quota exceeded

**Solution:**
1. Check the Firebase Console for error details
2. Verify field names match your Firestore schema
3. Remove duplicate or conflicting indexes

### Slow Queries

If queries are slow even with indexes:
1. Check if you're using the correct index
2. Reduce the number of documents being scanned
3. Implement pagination
4. Consider denormalizing data for faster reads

## Cost Considerations

- **Index storage**: Each index consumes storage space
- **Write operations**: Each write updates all relevant indexes
- **Read operations**: Indexed queries are faster and more efficient

**Best practices:**
- Only create indexes you actually use
- Remove unused indexes to save costs
- Monitor index usage in Firebase Console

## Related Files

- `firestore.indexes.json` - Index definitions
- `firestore.rules` - Security rules
- `firebase.json` - Firebase configuration
- `deploy-indexes.bat` - Windows deployment script
- `deploy-indexes.ps1` - PowerShell deployment script

## Next Steps

1. Deploy the indexes: `.\deploy-indexes.ps1`
2. Wait for indexes to build (check Firebase Console)
3. Test the admin features to verify performance
4. Monitor query performance in Firebase Console
