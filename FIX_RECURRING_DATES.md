# Fix Recurring Task Dates - Migration Guide

## Problem
Existing recurring tasks have `nextOccurrence` set to the `startDate`, which means the "Due Date" column shows the start date instead of the actual next due date.

## Solution
Run the migration script to update all existing recurring tasks with the correct next occurrence date based on today's date and their recurrence pattern.

## Steps to Fix

### 1. Make sure you have the required environment variables

Ensure your `.env.local` file has these variables:
```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"
```

### 2. Install ts-node if you haven't already

```bash
npm install -D ts-node
```

### 3. Run the migration script

```bash
npx ts-node scripts/fix-recurring-task-dates.ts
```

### 4. Verify the results

The script will:
- Find all recurring tasks where `nextOccurrence` equals `startDate`
- Calculate the correct next occurrence based on today's date and the recurrence pattern
- Update each task with the new next occurrence date
- Show a summary of updated and skipped tasks

### Example Output

```
🔧 Starting migration: Fix recurring task next occurrence dates...

📊 Found 5 recurring tasks

✏️  Updating task: Monthly Report
   Pattern: monthly
   Start Date: 2/16/2026
   Old Next Occurrence: 2/16/2026
   New Next Occurrence: 3/16/2026

✏️  Updating task: Quarterly Review
   Pattern: quarterly
   Start Date: 2/16/2026
   Old Next Occurrence: 2/16/2026
   New Next Occurrence: 5/16/2026

⏭️  Skipping task: Future Task (already has correct next occurrence)

✅ Migration completed!
   Updated: 2 tasks
   Skipped: 3 tasks
   Total: 5 tasks

🎉 Migration script finished successfully!
```

## What Changed

### Before
- New tasks: `nextOccurrence` was set to `startDate`
- Existing tasks: Showed start date in "Due Date" column

### After
- New tasks: `nextOccurrence` is calculated based on today's date and recurrence pattern
- Existing tasks: Updated to show the correct next due date
- "Due Date" column now shows the actual upcoming due date

## Technical Details

The fix includes:

1. **Frontend** (`src/app/tasks/recurring/page.tsx`):
   - Calculates next occurrence when creating new tasks
   - If start date is today or in the past, calculates the next occurrence from today

2. **Backend** (`src/app/api/recurring-tasks/route.ts`):
   - Server-side validation and calculation of next occurrence
   - Ensures consistency even if frontend calculation is bypassed

3. **Migration Script** (`scripts/fix-recurring-task-dates.ts`):
   - One-time fix for existing tasks in the database
   - Updates all tasks where nextOccurrence equals startDate

## Notes

- The migration script is safe to run multiple times (it will skip tasks that already have the correct next occurrence)
- Only tasks where `nextOccurrence` equals `startDate` AND `startDate` is today or in the past will be updated
- Future tasks (where start date is in the future) are not affected
