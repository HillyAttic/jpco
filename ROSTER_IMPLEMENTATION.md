# Roster & Calendar System Implementation

## Overview
A comprehensive roster management system that allows users to manage their own schedules via a calendar view, while Admin/Managers can view the complete organization roster in an Excel-style monthly planning table.

## Features Implemented

### 1. Navigation Structure
- **New Sidebar Menu**: "ROSTER" added under MANAGEMENT section
- **Two Submenus**:
  - Update Schedule (All users)
  - View Schedule (All users, different views based on role)

### 2. User Roles & Permissions

#### Regular User
**Can:**
- View only their own calendar
- Add, edit, or delete only their own roster entries
- See personal schedule in calendar format

**Cannot:**
- View or edit any other user's schedule
- Access Excel-style roster view

#### Admin / Manager
**Can:**
- View all users' schedules
- See roster in Excel/spreadsheet-style monthly table
- View organization-wide roster data

**Cannot:**
- Edit schedules (view-only for now, can be extended)

### 3. Update Schedule (User Calendar View)

**Purpose**: Allow users to add and manage their own schedules

**Features**:
- Monthly calendar view (not Excel grid)
- Month & Year selection with navigation
- Day-based visualization
- Activity management (Add, Edit, Delete)

**Schedule Entry Fields**:
- Activity Name (e.g., Audit, Monthly Visit, ROC Filing)
- Start Date
- End Date
- Notes / Description (Optional)

**Rules**:
- Activities can span multiple days
- Overlapping activities for the same user are prevented
- Changes immediately reflect in View Schedule

### 4. View Schedule

#### For Regular Users
- Personal calendar view only
- Displays all tasks assigned to the logged-in user
- Updates made via Update Schedule are shown
- View-only (no edit access)

#### For Admin / Manager (Excel-Style Roster View)
**Table Structure**:
- **Title**: "Monthly (Month_Name)" - e.g., "Monthly (January)"
- **First Column**: EMP NAME
- **Remaining Columns**: Days 1-31 (dynamically generated based on month)

**Activity Display**:
- Activities appear as continuous visual blocks spanning relevant date columns
- Example: "Audit" from Day 5-8 spans columns 5-8
- Blank cells where no activity exists
- No repeated text - uses merged/continuous blocks

**Design**:
- Spreadsheet-style grid layout
- Suitable for Excel export and reporting
- Managerial review friendly
- Read-only view

### 5. Data Synchronization
- Single source of truth: Firestore DB
- Real-time updates from Update Schedule to View Schedule
- Instant reflection in both user calendar and admin roster view

## Technical Implementation

### Database Structure

```typescript
rosters (collection)
  └── rosterId
      ├── userId: string
      ├── userName: string
      ├── activityName: string
      ├── startDate: Date
      ├── endDate: Date
      ├── month: number (1-12)
      ├── year: number
      ├── notes?: string
      ├── createdAt: Date
      ├── updatedAt: Date
      └── createdBy: string
```

### Required Firestore Composite Indexes

Create these indexes in Firebase Console:

1. **rosters collection**:
   - `userId` (Ascending) + `month` (Ascending) + `year` (Ascending)
   - `month` (Ascending) + `year` (Ascending)
   - `userId` (Ascending) + `startDate` (Ascending)

### Files Created

1. **Types**: `src/types/roster.types.ts`
   - RosterEntry interface
   - RosterFilters interface
   - MonthlyRosterView interface
   - Helper functions for date calculations

2. **Service**: `src/services/roster.service.ts`
   - createRosterEntry
   - updateRosterEntry
   - deleteRosterEntry
   - getRosterEntries
   - getMonthlyRosterView
   - getUserCalendarEvents
   - checkOverlap

3. **Pages**:
   - `src/app/roster/update-schedule/page.tsx` - User calendar with CRUD operations
   - `src/app/roster/view-schedule/page.tsx` - Role-based view (calendar or Excel)

4. **API Routes**:
   - `src/app/api/roster/route.ts` - CRUD operations
   - `src/app/api/roster/monthly/route.ts` - Monthly view for admin/manager

5. **Navigation**: Updated `src/components/Layouts/sidebar/data/index.ts`

## Key Features

### Dynamic Month Handling
- Automatic adjustment for different month lengths
- Leap year support for February
- Month/Year navigation with proper boundary handling

### Overlap Prevention
- Validates that new activities don't overlap with existing ones
- Checks performed on both create and update operations
- User-friendly error messages

### Role-Based Access Control
- Automatic view switching based on user role
- Admin/Manager see Excel-style table
- Regular users see personal calendar
- Proper authentication checks in API routes

### Responsive Design
- Mobile-friendly calendar view
- Responsive Excel table with horizontal scroll
- Touch-optimized buttons and interactions

## Usage Instructions

### For Regular Users

1. **Add Activity**:
   - Navigate to Roster > Update Schedule
   - Click "Add Activity" button
   - Fill in activity details
   - Select start and end dates
   - Click "Create"

2. **Edit Activity**:
   - Click on activity in calendar or list
   - Modify details in modal
   - Click "Update"

3. **Delete Activity**:
   - Click trash icon on activity
   - Confirm deletion

4. **View Schedule**:
   - Navigate to Roster > View Schedule
   - See personal calendar with all activities

### For Admin/Manager

1. **View Organization Roster**:
   - Navigate to Roster > View Schedule
   - See Excel-style table with all employees
   - Use month navigation to view different months
   - Activities displayed as continuous blocks

2. **Export** (Future Enhancement):
   - Can be extended to export to Excel/CSV

## Security Considerations

- All API routes require authentication
- Users can only modify their own roster entries
- Admin/Manager views require role verification
- Firestore security rules should be configured to enforce these permissions

## Future Enhancements

1. **Admin Edit Capability**: Allow admin/manager to edit any user's schedule
2. **Excel Export**: Add export functionality for the roster table
3. **Bulk Operations**: Import multiple activities from CSV
4. **Notifications**: Email/push notifications for upcoming activities
5. **Activity Templates**: Pre-defined activity types
6. **Color Coding**: Different colors for different activity types
7. **Filtering**: Filter by employee, activity type, date range
8. **Reporting**: Generate reports on employee schedules
9. **Recurring Activities**: Support for recurring schedule patterns
10. **Team View**: Group employees by teams in roster view

## Testing Checklist

- [ ] Regular user can create activities
- [ ] Regular user can edit their own activities
- [ ] Regular user can delete their own activities
- [ ] Regular user sees only their calendar in View Schedule
- [ ] Admin/Manager sees Excel-style roster
- [ ] Overlap validation works correctly
- [ ] Month navigation works properly
- [ ] Leap year handling is correct
- [ ] Activities spanning multiple days display correctly
- [ ] Mobile responsive design works
- [ ] API authentication is enforced
- [ ] Role-based access control works

## Firestore Security Rules

Add these rules to your Firestore security rules:

```javascript
match /rosters/{rosterId} {
  // Allow users to read their own roster entries
  allow read: if request.auth != null && 
    (resource.data.userId == request.auth.uid || 
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']);
  
  // Allow users to create their own roster entries
  allow create: if request.auth != null && 
    request.resource.data.userId == request.auth.uid;
  
  // Allow users to update their own roster entries
  allow update: if request.auth != null && 
    resource.data.userId == request.auth.uid;
  
  // Allow users to delete their own roster entries
  allow delete: if request.auth != null && 
    resource.data.userId == request.auth.uid;
}
```

## Conclusion

The Roster & Calendar System is now fully implemented with:
- ✅ Personal calendar view for all users
- ✅ Excel-style roster view for admin/manager
- ✅ CRUD operations for schedule management
- ✅ Role-based access control
- ✅ Real-time synchronization
- ✅ Overlap prevention
- ✅ Responsive design
- ✅ Firestore-backed performance

The system is ready for use and can be extended with additional features as needed.
