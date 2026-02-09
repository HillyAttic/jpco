# Plan Task Feature - Implementation Guide

## 📋 Overview

The **Plan Task** feature allows employees to schedule client visits directly from their assigned recurring tasks in the dashboard. This feature integrates with the Team Member Mapping system and the Roster/Schedule management system.

## 🎯 Key Features

### For Employees

1. **Plan Task Button**: Appears on recurring tasks in the dashboard
2. **Client Visit Scheduling**: Schedule visits for assigned clients
3. **Multiple Visits**: Add multiple visits in one session
4. **Auto-populated Clients**: Only shows clients assigned via Team Member Mapping
5. **Calendar Integration**: Visits appear in both admin and personal calendars

### For Admins/Managers

1. **View All Schedules**: See all employee visits at `/roster/view-schedule`
2. **Color-coded Display**: Yellow (<8hrs), Orange (≥8hrs)
3. **Excel-style View**: Monthly grid view of all employees
4. **Detailed Task View**: Click on any day to see task details

## 🏗️ Architecture

### Components Created

```
src/components/dashboard/PlanTaskModal.tsx
├── Client Visit Form
├── Scheduled Visits Table
├── Add More Visit Button
└── Save All Button
```

### Files Modified

```
src/app/dashboard/page.tsx
├── Added PlanTaskModal import
├── Added state for modal
├── Added "Plan Task" button
└── Added modal component
```

## 📊 Data Flow

```
1. Employee clicks "Plan Task" on recurring task
   ↓
2. Modal opens with assigned clients
   ↓
3. Employee schedules visits (date + time)
   ↓
4. Visits saved to Firestore (rosters collection)
   ↓
5. Appears in:
   - Admin view (/roster/view-schedule)
   - Employee view (/roster/update-schedule)
```

## 🔧 Technical Implementation

### PlanTaskModal Component

**Props**:
```typescript
interface PlanTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedClientIds: string[];  // From team member mapping
  userId: string;               // Current user ID
  userName: string;             // Current user name
  taskTitle: string;            // Recurring task title
}
```

**State**:
```typescript
- clients: Client[]                    // Assigned clients
- visits: ClientVisit[]                // Scheduled visits
- currentVisit: Partial<ClientVisit>   // Current form data
- loading/saving states
```

**Key Functions**:
- `loadClients()`: Loads only assigned clients
- `handleAddVisit()`: Adds visit to list
- `handleRemoveVisit()`: Removes visit from list
- `handleSaveAll()`: Saves all visits to roster

### Dashboard Integration

**New State**:
```typescript
const [showPlanTaskModal, setShowPlanTaskModal] = useState(false);
const [selectedTaskForPlanning, setSelectedTaskForPlanning] = useState<DashboardTask | null>(null);
```

**Plan Task Button**:
- Only shows for recurring tasks
- Only shows for employees (not admin/manager)
- Only shows when task has assigned clients
- Indigo color to distinguish from other buttons

## 📝 Data Structure

### ClientVisit Interface

```typescript
interface ClientVisit {
  clientId: string;
  clientName: string;
  scheduleDate: string;      // YYYY-MM-DD
  startTime: string;         // HH:MM (24-hour)
  endTime: string;           // HH:MM (24-hour)
}
```

### RosterEntry (Saved to Firestore)

```typescript
{
  taskType: 'single',
  userId: string,
  userName: string,
  clientId: string,
  clientName: string,
  taskDetail: string,        // Task title
  timeStart: Date,           // Full datetime
  timeEnd: Date,             // Full datetime
  taskDate: string,          // YYYY-MM-DD
  durationHours: number,     // Calculated
}
```

## 🎨 UI/UX Features

### Modal Layout

```
┌─────────────────────────────────────────────┐
│ Plan Task - Monthly Financial Review        │
├─────────────────────────────────────────────┤
│                                              │
│ Scheduled Visits (2)                        │
│ ┌──────────────────────────────────────┐   │
│ │ Client | Date | Start | End | Action │   │
│ │ ABC    | Feb 6| 09:00 | 17:00 | [X]  │   │
│ │ XYZ    | Feb 7| 09:00 | 17:00 | [X]  │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ Add More Visit                              │
│ ┌──────────────────────────────────────┐   │
│ │ Client Name: [Dropdown ▼]            │   │
│ │ Schedule Date: [Calendar 📅]         │   │
│ │ Start Time: [09:00 🕐]               │   │
│ │ End Time: [17:00 🕐]                 │   │
│ │                                       │   │
│ │ [+ Add Visit to Schedule]            │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ [Cancel] [Save 2 Visits]                    │
└─────────────────────────────────────────────┘
```

### Visual Indicators

**Plan Task Button**:
- Color: Indigo (`bg-indigo-600`)
- Icon: Calendar
- Text: "Plan Task"
- Position: After team/client badges

**Visit Table**:
- Formatted dates: "Feb 6, 2026"
- Formatted times: "09:00 AM"
- Remove button: Red X icon
- Hover effects on rows

## 🔐 Security & Access Control

### Employee Access
- ✅ Can only schedule for assigned clients
- ✅ Can only see their own assigned clients
- ✅ Cannot see other employees' clients
- ✅ Button only shows for their tasks

### Admin/Manager Access
- ✅ Can view all scheduled visits
- ✅ Can see all employees' schedules
- ✅ Excel-style grid view
- ✅ Color-coded by duration

## 📍 Integration Points

### 1. Team Member Mapping
- Uses `assignedClientIds` from task
- Filters clients based on mapping
- Shows only user's assigned clients

### 2. Roster Service
- Creates `single` type roster entries
- Calculates duration automatically
- Validates time ranges
- Bulk creates multiple visits

### 3. Calendar Views
- **Admin View**: `/roster/view-schedule`
  - Excel-style grid
  - All employees
  - Color-coded cells
  
- **Employee View**: `/roster/update-schedule`
  - Personal calendar
  - Only own visits
  - Calendar format

## 🎯 User Flow

### Employee Scheduling Flow

1. **View Dashboard**
   - See recurring tasks
   - Tasks show assigned client count
   - "Plan Task" button visible

2. **Click Plan Task**
   - Modal opens
   - Assigned clients loaded
   - Form ready for input

3. **Schedule First Visit**
   - Select client from dropdown
   - Pick date from calendar
   - Set start/end times
   - Click "Add Visit to Schedule"

4. **Schedule More Visits**
   - Visit added to table
   - Form resets for next visit
   - Can add multiple visits
   - Can remove visits

5. **Save All Visits**
   - Click "Save X Visits"
   - All visits saved to roster
   - Success message shown
   - Modal closes

6. **View Scheduled Visits**
   - Go to `/roster/update-schedule`
   - See visits in personal calendar
   - Color-coded by duration

### Admin Viewing Flow

1. **View All Schedules**
   - Go to `/roster/view-schedule`
   - See Excel-style grid
   - All employees visible

2. **Check Employee Schedule**
   - Click employee name
   - See their full calendar
   - View all visits

3. **View Day Details**
   - Click on any day cell
   - See all tasks for that day
   - View client names and times

## 🎨 Color Coding

### Task Duration Colors

```
Green:  No task assigned (empty day)
Yellow: Task < 8 hours
Orange: Task ≥ 8 hours
```

### Button Colors

```
Blue:    Client count
Green:   Team name
Purple:  Individual assignment
Indigo:  Plan Task
```

## 📊 Example Scenarios

### Scenario 1: Single Day Visit

**Employee**: Balram
**Task**: Monthly Financial Review
**Assigned Clients**: 10 clients

**Action**:
1. Click "Plan Task"
2. Select "ABC Corp"
3. Date: Feb 6, 2026
4. Time: 09:00 AM - 05:00 PM
5. Click "Add Visit"
6. Click "Save 1 Visit"

**Result**:
- Visit appears in admin view (orange - 8 hours)
- Visit appears in Balram's calendar
- Duration: 8 hours

### Scenario 2: Multiple Visits

**Employee**: Ajay
**Task**: Quarterly Review
**Assigned Clients**: 5 clients

**Action**:
1. Click "Plan Task"
2. Add Visit 1:
   - Client: TechCorp
   - Date: Feb 6, 2026
   - Time: 09:00 AM - 05:00 PM
3. Add Visit 2:
   - Client: Global Exports
   - Date: Feb 7, 2026
   - Time: 10:00 AM - 03:00 PM
4. Add Visit 3:
   - Client: TechCorp (again)
   - Date: Feb 8, 2026
   - Time: 09:00 AM - 12:00 PM
5. Click "Save 3 Visits"

**Result**:
- 3 visits saved
- Feb 6: Orange (8 hours)
- Feb 7: Yellow (5 hours)
- Feb 8: Yellow (3 hours)
- All appear in calendars

## 🧪 Testing Checklist

### Functional Tests
- [ ] Plan Task button appears for recurring tasks
- [ ] Plan Task button only shows for employees
- [ ] Modal opens with correct clients
- [ ] Can add single visit
- [ ] Can add multiple visits
- [ ] Can remove visits
- [ ] Can save all visits
- [ ] Visits appear in admin view
- [ ] Visits appear in employee view
- [ ] Color coding is correct

### Edge Cases
- [ ] No clients assigned
- [ ] Single client assigned
- [ ] Many clients assigned
- [ ] Same client multiple times
- [ ] Same date multiple times
- [ ] Past dates (should be prevented)
- [ ] Invalid time ranges

### Integration Tests
- [ ] Works with team member mapping
- [ ] Works with roster service
- [ ] Works with calendar views
- [ ] Works with admin view
- [ ] Works with employee view

## 🐛 Known Limitations

1. **No Overlap Detection**: Can schedule overlapping visits
2. **No Edit Feature**: Cannot edit saved visits (must delete and recreate)
3. **No Bulk Delete**: Cannot delete multiple visits at once
4. **No Recurring Visits**: Each visit must be scheduled individually

## 🔮 Future Enhancements

### Phase 2
- Edit scheduled visits
- Delete scheduled visits
- Overlap detection and warnings
- Suggested time slots

### Phase 3
- Recurring visit patterns
- Bulk scheduling
- Calendar sync (Google Calendar, Outlook)
- Mobile app support

### Phase 4
- AI-powered scheduling suggestions
- Route optimization
- Travel time calculation
- Client availability integration

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Plan Task button not showing
**Solution**: 
- Check if task is recurring
- Check if user is employee (not admin)
- Check if task has assigned clients

**Issue**: No clients in dropdown
**Solution**:
- Verify team member mapping is configured
- Check if clients are assigned to user
- Verify clients are active

**Issue**: Visits not appearing in calendar
**Solution**:
- Check if visits were saved successfully
- Refresh the calendar page
- Verify correct month/year selected

## 📚 Related Documentation

- [Team Member Mapping Implementation](TEAM_MEMBER_MAPPING_IMPLEMENTATION.md)
- [Roster System Documentation](ROSTER_README.md)
- [Dashboard Documentation](DASHBOARD_SETUP_COMPLETE.md)

## ✅ Implementation Checklist

- [x] PlanTaskModal component created
- [x] Dashboard integration complete
- [x] Plan Task button added
- [x] Modal state management
- [x] Client filtering logic
- [x] Visit scheduling logic
- [x] Roster service integration
- [x] TypeScript compilation successful
- [x] No diagnostic errors

## 🎉 Summary

The Plan Task feature successfully integrates:
- ✅ Team Member Mapping
- ✅ Roster/Schedule System
- ✅ Dashboard
- ✅ Calendar Views

Employees can now easily schedule client visits directly from their assigned recurring tasks, with visits automatically appearing in both admin and personal calendars with appropriate color coding.

---

**Feature Version**: 1.0.0
**Implementation Date**: February 2026
**Status**: ✅ COMPLETE
