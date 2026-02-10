# Team Member Mapping - Reports & Calendar Integration

## Overview

This feature enhances the recurring tasks system to properly handle tasks assigned via **Team Member Mapping**. When a recurring task is assigned to specific team members with their own client assignments, the system now:

1. **Reports Page** - Shows team member-specific reports with individual completion rates
2. **Calendar Page** - Filters clients to show only those assigned to the logged-in user
3. **Task Tracking** - Each user sees and marks completion only for their assigned clients

## Feature Details

### 1. Reports Page Enhancement

**Location:** `src/components/reports/ReportsView.tsx`

#### What Changed:

- **Task List View**: Tasks with team member mappings now display a "Team Mapped" badge
- **Client Count**: Shows total mapped clients with "(mapped)" indicator
- **Modal View**: When clicking "View Details" on a team-mapped task, a new modal appears

#### Team Member Report Modal:

The new modal displays:
- **Team Member Cards**: Shows each team member with:
  - Name and user icon
  - Number of assigned clients
  - Completion rate progress bar
  - Click to filter view to that member's clients
  
- **Filtered Client View**: When a team member is selected:
  - Shows only their assigned clients
  - Displays completion status across all months
  - Blue info banner indicates filtering is active

- **All Clients View**: When no team member is selected:
  - Shows all clients across all team members
  - Provides overview of entire task completion

#### Visual Indicators:

```
┌─────────────────────────────────────────────────────┐
│ Task Name                    │ Team Mapped Badge    │
│ test_Review of Financial...  │ [👥 Team Mapped]     │
└─────────────────────────────────────────────────────┘

Team Member Cards:
┌──────────────────────────┐  ┌──────────────────────────┐
│ 👥 Ajay Chaudhary        │  │ 👥 Pradeep Bera          │
│ 2 clients                │  │ 2 clients                │
│ ████████░░ 80%           │  │ ██████░░░░ 60%           │
└──────────────────────────┘  └──────────────────────────┘
```

### 2. Calendar Page Enhancement

**Location:** `src/components/recurring-tasks/RecurringTaskClientModal.tsx`

#### What Changed:

- **Client Filtering**: When a user opens a task modal in the calendar:
  - System checks if task has team member mappings
  - If user is in the mappings, shows only their assigned clients
  - If user is not in mappings (admin/manager), shows all clients
  
- **Visual Feedback**: 
  - Header shows filtered client count
  - Purple badge indicates "Showing only your assigned clients"
  - Empty state message clarifies if no clients are assigned to the user

#### User Experience:

**For Team Members:**
```
┌─────────────────────────────────────────────────────────┐
│ test_Review of Financial Statements_Client Visit        │
│ Track completion for 2 clients • Feb 2026 only          │
│ 🟣 Showing only your assigned clients                   │
└─────────────────────────────────────────────────────────┘

Client List (Filtered):
✓ Client A - Assigned to this user
✓ Client B - Assigned to this user
✗ Client C - NOT shown (assigned to another user)
✗ Client D - NOT shown (assigned to another user)
```

**For Admins/Managers:**
```
┌─────────────────────────────────────────────────────────┐
│ test_Review of Financial Statements_Client Visit        │
│ Track completion for 4 clients • Feb 2026 only          │
└─────────────────────────────────────────────────────────┘

Client List (All):
✓ Client A - Assigned to User 1
✓ Client B - Assigned to User 1
✓ Client C - Assigned to User 2
✓ Client D - Assigned to User 2
```

### 3. Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Manager Creates Recurring Task                       │
│    - Assigns clients to team members via mapping        │
│    - Saves teamMemberMappings array                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Task Stored in Firestore                             │
│    teamMemberMappings: [                                │
│      { userId: "user1", clientIds: ["c1", "c2"] },      │
│      { userId: "user2", clientIds: ["c3", "c4"] }       │
│    ]                                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. User Opens Calendar                                  │
│    - Fetches recurring tasks via API                    │
│    - API filters tasks based on user's mappings         │
│    - Generates calendar occurrences                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. User Clicks Task in Calendar                         │
│    - Modal opens with task details                      │
│    - getFilteredClients() checks mappings               │
│    - Shows only user's assigned clients                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. User Marks Completions                               │
│    - Checkboxes for assigned clients only               │
│    - Saves to task-completions collection               │
│    - Updates completion history                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Admin/Manager Views Reports                          │
│    - Sees "Team Mapped" badge on task                   │
│    - Opens team member report modal                     │
│    - Views individual member completion rates           │
│    - Can filter by specific team member                 │
└─────────────────────────────────────────────────────────┘
```

## Technical Implementation

### Key Functions

#### 1. `getFilteredClients()` - Calendar Modal
```typescript
const getFilteredClients = (): Client[] => {
  if (!task || !user) return clients;
  
  // Check if task has team member mappings
  if (task.teamMemberMappings && task.teamMemberMappings.length > 0) {
    // Find the mapping for current user
    const userMapping = task.teamMemberMappings.find(
      mapping => mapping.userId === user.uid
    );
    
    if (userMapping) {
      // Filter clients to only show those assigned to this user
      return clients.filter(client => 
        client.id && userMapping.clientIds.includes(client.id)
      );
    }
  }
  
  // No mappings or user not in mappings - show all clients
  return clients;
};
```

#### 2. `TeamMemberReportModal` - Reports View
```typescript
// Build team member reports
const teamMemberReports = (task.teamMemberMappings || []).map(mapping => {
  const memberClients = clients.filter(c => 
    c.id && mapping.clientIds.includes(c.id)
  );
  const memberCompletions = completions.filter(comp => 
    comp.isCompleted && mapping.clientIds.includes(comp.clientId)
  );
  
  const totalExpected = memberClients.length * months.length;
  const completionRate = totalExpected > 0 
    ? Math.round((memberCompletions.length / totalExpected) * 100) 
    : 0;
  
  return {
    userId: mapping.userId,
    userName: mapping.userName,
    clientIds: mapping.clientIds,
    clients: memberClients,
    completionRate,
  };
});
```

### Data Structures

#### RecurringTask with Team Member Mappings
```typescript
interface RecurringTask {
  id: string;
  title: string;
  // ... other fields
  teamMemberMappings?: TeamMemberMapping[];
}

interface TeamMemberMapping {
  userId: string;
  userName: string;
  clientIds: string[];
}
```

#### Team Member Report
```typescript
interface TeamMemberReport {
  userId: string;
  userName: string;
  clientIds: string[];
  clients: Client[];
  completionRate: number;
}
```

## User Scenarios

### Scenario 1: Team Member Views Calendar

**Given:** Ajay is assigned 2 clients (Client A, Client B) for a recurring task

**When:** Ajay opens the calendar and clicks on the task

**Then:**
- Modal shows "Track completion for 2 clients"
- Only Client A and Client B are visible
- Purple badge shows "Showing only your assigned clients"
- Ajay can mark completion only for his assigned clients

### Scenario 2: Manager Views Reports

**Given:** A recurring task has 2 team members with 2 clients each

**When:** Manager opens Reports page and clicks "View Details"

**Then:**
- Modal shows team member cards for both members
- Each card shows completion rate (e.g., 80%, 60%)
- Manager can click a card to filter view to that member's clients
- Manager sees all 4 clients when no filter is applied

### Scenario 3: Admin Views All Clients

**Given:** Admin is not in team member mappings

**When:** Admin opens calendar task modal

**Then:**
- Modal shows all clients (no filtering)
- No purple badge appears
- Admin can mark completion for any client

## Benefits

1. **Role-Based Access**: Team members see only their assigned work
2. **Clear Accountability**: Reports show individual team member performance
3. **Simplified UI**: Users aren't overwhelmed with clients not assigned to them
4. **Manager Oversight**: Admins/managers can view all data and individual reports
5. **Accurate Tracking**: Completion rates calculated per team member

## Testing Checklist

- [ ] Create recurring task with team member mappings
- [ ] Assign different clients to different team members
- [ ] Login as team member and verify calendar shows only assigned clients
- [ ] Mark completions and verify they save correctly
- [ ] Login as manager and verify reports show team member cards
- [ ] Click team member card and verify filtering works
- [ ] Verify completion rates calculate correctly per team member
- [ ] Test with task that has no team member mappings (should work as before)
- [ ] Test as admin (should see all clients regardless of mappings)

## Future Enhancements

1. **Bulk Assignment**: Allow managers to quickly assign clients in bulk
2. **Workload Balancing**: Show workload distribution across team members
3. **Performance Analytics**: Track individual team member performance over time
4. **Notifications**: Alert team members when new clients are assigned
5. **Export Reports**: Download team member reports as PDF/Excel
