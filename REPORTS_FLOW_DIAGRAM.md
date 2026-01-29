# Reports Feature - Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │   Sidebar    │────────▶│ Reports Page │                    │
│  │  (Admin/Mgr) │         │  /reports    │                    │
│  └──────────────┘         └──────┬───────┘                    │
│                                   │                             │
│                                   ▼                             │
│                          ┌────────────────┐                    │
│                          │  ReportsView   │                    │
│                          │   Component    │                    │
│                          └────────┬───────┘                    │
│                                   │                             │
│                    ┌──────────────┼──────────────┐            │
│                    ▼              ▼              ▼             │
│            ┌──────────┐   ┌──────────┐   ┌──────────┐        │
│            │Task List │   │ Progress │   │  Detail  │        │
│            │  Table   │   │   Bars   │   │  Modal   │        │
│            └──────────┘   └──────────┘   └──────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ Recurring Task   │  │  Client Service  │  │ Completion  │ │
│  │    Service       │  │                  │  │  Service    │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬──────┘ │
│           │                     │                     │         │
│           │                     │                     │         │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FIRESTORE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ recurring-   │  │   clients    │  │  task-completions    │ │
│  │   tasks      │  │              │  │                      │ │
│  │              │  │              │  │  - recurringTaskId   │ │
│  │ - title      │  │ - name       │  │  - clientId          │ │
│  │ - pattern    │  │ - email      │  │  - monthKey          │ │
│  │ - contactIds │  │ - status     │  │  - isCompleted       │ │
│  │ - status     │  │              │  │  - completedAt       │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Loading Reports Page

```
User (Admin/Manager)
    │
    ├─▶ Click "Reports" in Sidebar
    │
    ▼
Reports Page (/reports)
    │
    ├─▶ Check user role (isManager)
    │   └─▶ If not manager → Redirect to Dashboard
    │
    ├─▶ Load Data:
    │   ├─▶ recurringTaskService.getAll()
    │   ├─▶ clientService.getAll()
    │   └─▶ taskCompletionService.getByTaskId() (for each task)
    │
    ▼
Display Reports Table
    │
    ├─▶ Task Name
    ├─▶ Recurrence Pattern
    ├─▶ Client Count
    ├─▶ Completion Rate (calculated)
    └─▶ "View Details" Button
```

### 2. Viewing Task Details

```
User clicks "View Details"
    │
    ▼
Task Report Modal Opens
    │
    ├─▶ Load task data
    ├─▶ Load assigned clients
    ├─▶ Load completion records
    │
    ▼
Generate Month Grid
    │
    ├─▶ Financial Year: April to March
    ├─▶ Filter by recurrence pattern:
    │   ├─▶ Monthly: All 12 months
    │   ├─▶ Quarterly: Every 3rd month
    │   ├─▶ Half-yearly: Every 6th month
    │   └─▶ Yearly: Only April
    │
    ▼
Display Grid
    │
    ├─▶ Rows: Clients
    ├─▶ Columns: Months
    │
    └─▶ For each cell:
        ├─▶ If future month → Show "-"
        ├─▶ If completed → Show "✓" (green)
        └─▶ If incomplete → Show "✗" (red)
```

### 3. Marking Completions (from Calendar)

```
User in Calendar View
    │
    ├─▶ Click Recurring Task
    │
    ▼
RecurringTaskClientModal Opens
    │
    ├─▶ Load task data
    ├─▶ Load assigned clients
    ├─▶ Load existing completions from Firestore
    │
    ▼
Display Checkbox Grid
    │
    ├─▶ User checks/unchecks boxes
    │
    ├─▶ Click "Save Changes"
    │
    ▼
taskCompletionService.bulkUpdate()
    │
    ├─▶ For each client/month:
    │   ├─▶ If checked → Create/Update completion record
    │   └─▶ If unchecked → Delete completion record
    │
    ▼
Save to Firestore (task-completions collection)
    │
    ▼
Close Modal
    │
    ▼
Reports Page reflects new data
```

## Status Determination Logic

```
For each Client/Month cell:

┌─────────────────────────────────┐
│ Is month in the future?         │
│ (after current month)            │
└────────┬────────────────────────┘
         │
    Yes  │  No
         │
    ┌────▼────┐
    │ Show "-"│
    │ (Dash)  │
    └─────────┘
         │
         │
    ┌────▼────────────────────────┐
    │ Check completion record in   │
    │ task-completions collection  │
    └────────┬────────────────────┘
             │
        ┌────┴────┐
        │         │
    Found    Not Found
        │         │
    ┌───▼──┐  ┌──▼───┐
    │ Show │  │ Show │
    │  "✓" │  │  "✗" │
    │(Green)│ │ (Red)│
    └──────┘  └──────┘
```

## Role-Based Access Flow

```
User attempts to access Reports
    │
    ▼
┌─────────────────────────┐
│ Check user.role         │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
Admin/Mgr  Employee
    │         │
    │    ┌────▼────────────────┐
    │    │ Sidebar: Hide menu  │
    │    │ Route: Redirect to  │
    │    │ /dashboard          │
    │    └─────────────────────┘
    │
    ▼
┌─────────────────────────┐
│ Show Reports menu       │
│ Allow access to /reports│
│ Display full data       │
└─────────────────────────┘
```

## Completion Rate Calculation

```
For each Task:

1. Get assigned clients count (N)
2. Get visible months based on pattern (M)
3. Filter out future months (M')
4. Total expected = N × M'

5. Get completion records from Firestore
6. Count completed = records where isCompleted = true

7. Completion Rate = (completed / total expected) × 100%

Example:
- Task: GSTR1 (Monthly)
- Clients: 630
- Current Month: July 2025
- Months: Apr, May, Jun, Jul (4 past/current months)
- Total Expected: 630 × 4 = 2,520
- Completed: 1,890
- Rate: (1,890 / 2,520) × 100 = 75%
```

## Month Display Logic

```
Financial Year: April 2025 to March 2026

All Months Generated:
[Apr-25, May-25, Jun-25, Jul-25, Aug-25, Sep-25, 
 Oct-25, Nov-25, Dec-25, Jan-26, Feb-26, Mar-26]

Filter by Recurrence Pattern:

Monthly:
  → Show all 12 months

Quarterly:
  → Show every 3rd month
  → [Apr-25, Jul-25, Oct-25, Jan-26]

Half-Yearly:
  → Show every 6th month
  → [Apr-25, Oct-25]

Yearly:
  → Show only first month
  → [Apr-25]
```

## Component Hierarchy

```
ReportsPage
  │
  └─▶ ReportsView
       │
       ├─▶ Reports Table
       │    │
       │    └─▶ Task Rows
       │         ├─▶ Task Name
       │         ├─▶ Recurrence Badge
       │         ├─▶ Client Count
       │         ├─▶ Progress Bar
       │         └─▶ View Details Button
       │
       └─▶ TaskReportModal (when opened)
            │
            ├─▶ Modal Header
            │    ├─▶ Task Title
            │    ├─▶ Client Count
            │    └─▶ Close Button
            │
            ├─▶ Completion Grid
            │    │
            │    ├─▶ Table Header
            │    │    ├─▶ Client Name Column
            │    │    └─▶ Month Columns
            │    │
            │    └─▶ Table Body
            │         └─▶ Client Rows
            │              └─▶ Status Cells
            │                   ├─▶ ✓ (Completed)
            │                   ├─▶ ✗ (Incomplete)
            │                   └─▶ - (Future)
            │
            └─▶ Modal Footer
                 ├─▶ Legend
                 └─▶ Close Button
```

This visual guide should help you understand how all the pieces fit together!
