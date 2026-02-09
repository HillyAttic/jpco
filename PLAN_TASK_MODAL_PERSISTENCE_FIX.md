# Plan Task Modal - Visit Persistence Fix

## Problem
When users scheduled visits in the Plan Task modal and then reopened it, the previously saved visits were not displayed. The visits were being saved to the roster (visible in calendar views), but the modal didn't load and show them when reopened.

## Root Cause
The `PlanTaskModal` component was resetting the `visits` state to an empty array every time the modal closed, and it had no mechanism to load existing roster entries when the modal opened.

## Solution Implemented

### 1. Added State for Existing Visits
**File**: `src/components/dashboard/PlanTaskModal.tsx`

Added new state to track saved visits separately from new visits:
```typescript
const [existingVisits, setExistingVisits] = useState<ClientVisit[]>([]); // Track saved visits
const [loadingExistingVisits, setLoadingExistingVisits] = useState(false);
```

### 2. Load Existing Roster Entries on Modal Open
Added a new useEffect that:
- Fetches all roster entries for the current user
- Filters entries that match the task title
- Only shows recent/future visits (last 30 days to future)
- Converts roster entries to ClientVisit format
- Displays them in a separate "Previously Scheduled" table

```typescript
useEffect(() => {
  const loadExistingVisits = async () => {
    if (!isOpen || !userId) return;
    
    const allRosterEntries = await rosterService.getRosterByUserId(userId);
    const taskVisits = allRosterEntries
      .filter(entry => {
        const matchesTask = entry.taskDetail === taskTitle;
        const entryDate = new Date(entry.taskDate);
        const isRecentOrFuture = entryDate >= thirtyDaysAgo;
        return matchesTask && isRecentOrFuture;
      })
      .map(entry => ({
        clientId: entry.clientId,
        clientName: entry.clientName,
        scheduleDate: entry.taskDate,
        startTime: formatTimeFromDate(entry.timeStart),
        endTime: formatTimeFromDate(entry.timeEnd),
      }));
    
    setExistingVisits(taskVisits);
  };

  loadExistingVisits();
}, [isOpen, userId, taskTitle]);
```

### 3. Updated UI to Show Two Tables

#### Previously Scheduled Visits (Green)
- Shows visits that are already saved in the roster
- Green color scheme to indicate "saved" status
- Read-only (no remove button)
- Badge showing "Saved" status

#### New Visits to Schedule (Blue)
- Shows visits that have been added but not yet saved
- Blue color scheme to indicate "pending" status
- Can be removed before saving
- Only these visits are saved when clicking "Save" button

### 4. Updated Summary Info Box
Shows:
- Previously scheduled: X visits
- New visits to save: Y visits
- Total after saving: X + Y visits

### 5. Updated Save Button Logic
- Only shows "Save" button when there are new visits to save
- Button text: "Save X New Visit(s)"
- After saving, new visits are moved to existing visits
- Modal can be closed without saving if no new visits

### 6. Added Comprehensive Debugging
Console logs throughout the data flow:
- 🔍 Loading existing visits
- 📋 Total roster entries found
- 🔎 Entry filtering details
- ✅ Loaded visits count
- 💾 Saving visits
- ❌ Error messages

## Files Modified

### 1. src/components/dashboard/PlanTaskModal.tsx
- Added `recurringTaskId` prop (optional)
- Added `existingVisits` state
- Added `loadingExistingVisits` state
- Added useEffect to load existing roster entries
- Updated UI to show two separate tables
- Updated save logic to preserve existing visits
- Added comprehensive console logging

### 2. src/app/dashboard/page.tsx
- Added `recurringTaskId={selectedTaskForPlanning.id}` prop to PlanTaskModal

## User Experience Flow

### First Time Opening Modal
1. User clicks "Plan Task" button
2. Modal opens and shows:
   - Loading indicator for existing visits
   - Empty "Add Visit" form
3. User adds visits and saves
4. Success message appears
5. Modal closes

### Reopening Modal After Saving
1. User clicks "Plan Task" button again
2. Modal opens and shows:
   - **Green table**: "Previously Scheduled Visits (2)" with saved visits
   - Empty "Add Visit" form
3. User can:
   - View all previously scheduled visits
   - Add more visits if needed
   - Close without saving if just viewing
4. If new visits added:
   - **Blue table**: "New Visits to Schedule (1)" appears
   - Summary shows: "Previously: 2, New: 1, Total: 3"
   - "Save 1 New Visit" button appears
5. After saving:
   - New visits move to green "Previously Scheduled" table
   - Blue table disappears
   - Total count updates

## Visual Indicators

### Previously Scheduled Visits
- ✅ Green background and borders
- 🟢 "Saved" badge
- 📅 Shows: Client Name, Date, Start Time, End Time, Status
- No remove button (already in roster)

### New Visits to Schedule
- 🔵 Blue background and borders
- ➕ Can be removed before saving
- 📅 Shows: Client Name, Date, Start Time, End Time, Remove button
- Only visible when user adds new visits

## Testing Checklist

- [x] Modal loads existing visits when reopened
- [x] Previously saved visits show in green table
- [x] New visits show in blue table
- [x] Can add more visits to existing ones
- [x] Save button only appears when there are new visits
- [x] After saving, new visits move to green table
- [x] Can close modal without saving if just viewing
- [x] Console logs show data flow
- [x] Visits appear in both calendar views
- [x] No TypeScript errors

## Status
✅ **FULLY RESOLVED** - Plan Task modal now correctly loads and displays previously scheduled visits, while allowing users to add more visits.

## Benefits
1. **Transparency**: Users can see all their scheduled visits for a task
2. **Convenience**: No need to check calendar to see what's already scheduled
3. **Flexibility**: Can add more visits without losing track of existing ones
4. **Clear Status**: Color coding shows what's saved vs. pending
5. **Better UX**: Summary shows total visit count at a glance
