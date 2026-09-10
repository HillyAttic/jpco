# TAR & STAT Reports Implementation Plan

## Overview

Add two independent toggle buttons (**TAR Reports** and **Statutory Reports**) to the recurring task edit modal. When enabled, they change the UI flow for both admin and user views:

- **Admin**: Reports page shows workflow tracking (7 steps for TAR, 10 steps for STAT)
- **User**: Calendar/Compliance page shows step-by-step workflow cards with drawer

---

## Phase 1: Data Model & Schema Changes

### 1.1 Update RecurringTask Interface
**File:** `src/services/recurring-task.service.ts`

Add new fields to the `RecurringTask` interface:
```typescript
interface RecurringTask {
  // ... existing fields
  tarEnabled?: boolean;
  statEnabled?: boolean;
  tarSteps?: WorkflowStep[];
  statSteps?: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  name: string;
  shortName: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
}
```

### 1.2 Create Workflow Templates
**New File:** `src/lib/workflow-templates.ts`

```typescript
export const TAR_STEPS = [
  { name: 'Statutory Reconciliation', shortName: 'Stat Recon' },
  { name: 'Financial Review', shortName: 'Fin Review' },
  { name: 'Profit Evaluation', shortName: 'Profit Eval' },
  { name: 'Supervisor Sign-off', shortName: 'Sign-off' },
  { name: 'Financials Ready', shortName: 'Fins Ready' },
  { name: 'TAR Ready', shortName: 'TAR Ready' },
  { name: 'TAR Filed', shortName: 'TAR Filed' },
];

export const STAT_STEPS = [
  ...TAR_STEPS,
  { name: 'Audit Report Ready', shortName: 'Audit Rep' },
  { name: 'AOC-4 Ready', shortName: 'AOC-4 Rdy' },
  { name: 'AOC-4 Filed', shortName: 'AOC-4 Filed' },
  { name: 'MGT-7 Ready', shortName: 'MGT-7 Rdy' },
  { name: 'MGT-7 Filed', shortName: 'MGT-7 Filed' },
];
```

### 1.3 Update Admin Service
**File:** `src/services/recurring-task-admin.service.ts`

Add same fields to server-side interface for consistency.

---

## Phase 2: API Layer

### 2.1 Create Workflow API Endpoints
**New File:** `src/app/api/workflow/[taskId]/route.ts`

```typescript
// GET - Fetch workflow steps for a task
// PUT - Update step completion status
// POST - Initialize workflow steps when toggled ON
```

### 2.2 Update Recurring Task API
**File:** `src/app/api/recurring-tasks/[id]/route.ts`

Add handling for `tarEnabled` and `statEnabled` fields in PUT handler.

### 2.3 Add Workflow Reports API
**New File:** `src/app/api/reports/workflow/route.ts`

```typescript
// GET - Fetch all workflow data for admin reports
// Query params: type (TAR/STAT), status, assignee
```

---

## Phase 3: UI Components

### 3.1 Update RecurringTaskModal
**File:** `src/components/recurring-tasks/RecurringTaskModal.tsx`

Add two toggle switches after the existing checkboxes (ARN/Remark):

```tsx
{/* TAR Toggle */}
<div className="flex items-center justify-between p-3 border rounded-lg">
  <div>
    <Label className="font-medium">TAR Reports</Label>
    <p className="text-sm text-muted-foreground">
      Tax Audit Report · 7 steps
    </p>
  </div>
  <Switch 
    checked={formData.tarEnabled}
    onCheckedChange={(checked) => {
      setFormData(prev => ({ ...prev, tarEnabled: checked }));
    }}
  />
</div>

{/* STAT Toggle */}
<div className="flex items-center justify-between p-3 border rounded-lg">
  <div>
    <Label className="font-medium">Statutory Reports</Label>
    <p className="text-sm text-muted-foreground">
      Statutory Audit · 10 steps
    </p>
  </div>
  <Switch 
    checked={formData.statEnabled}
    onCheckedChange={(checked) => {
      setFormData(prev => ({ ...prev, statEnabled: checked }));
    }}
  />
</div>
```

### 3.2 Create WorkflowCard Component
**New File:** `src/components/compliance/WorkflowCard.tsx`

Responsive card for user view showing:
- Task name with TAR/STAT badge
- Progress bar (X/Y steps · Z%)
- Status indicator (Pending/In Progress/Completed)
- Next step preview
- Click to open drawer

### 3.3 Create WorkflowDrawer Component
**New File:** `src/components/compliance/WorkflowDrawer.tsx`

Slide-in drawer (mobile: bottom sheet, desktop: right panel):
- Header with badge, status, client name
- Progress bar
- List of steps with toggle switches (48px touch targets)
- Footer with "Mark all complete" button

### 3.4 Create WorkflowStepChip Component
**New File:** `src/components/compliance/WorkflowStepChip.tsx`

Reusable chip:
```tsx
<div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
  ${completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
  <span className={`w-4 h-4 rounded-full flex items-center justify-center
    ${completed ? 'bg-green-500 text-white' : 'bg-gray-300'}`}>
    {completed ? <CheckIcon size={10} /> : <XIcon size={10} />}
  </span>
  {shortName}
</div>
```

### 3.5 Create WorkflowReportsTable Component
**New File:** `src/components/reports/WorkflowReportsTable.tsx`

Desktop table view (>1020px):
- Sticky first column (Client name)
- Columns for each step with check/x icons
- Progress bar column
- Status badge
- Search and filter toolbar

### 3.6 Create WorkflowReportsCards Component
**New File:** `src/components/reports/WorkflowReportsCards.tsx`

Mobile card view (<1020px):
- Client name and assignee
- Status badge
- Progress bar
- Step chips in 2-column grid
- View Details button

---

## Phase 4: Pages Integration

### 4.1 Update Reports Page
**File:** `src/app/(home)/reports/page.tsx`

Add workflow reports section with tabs:

```tsx
<Tabs defaultValue="tar">
  <TabsList>
    <TabsTrigger value="tar">
      TAR Reports
      <Badge>{tarCount}</Badge>
    </TabsTrigger>
    <TabsTrigger value="stat">
      Statutory Reports
      <Badge>{statCount}</Badge>
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="tar">
    <WorkflowReportsTable type="TAR" />
  </TabsContent>
  <TabsContent value="stat">
    <WorkflowReportsTable type="STAT" />
  </TabsContent>
</Tabs>
```

### 4.2 Update Calendar Page
**File:** `src/app/calendar/page.tsx`

When clicking on a recurring task with TAR/STAT enabled:
- Show WorkflowDrawer instead of RecurringTaskClientModal
- Display step-by-step workflow

### 4.3 Update Recurring Tasks Page
**File:** `src/app/tasks/recurring/page.tsx`

Show TAR/STAT badges on task cards that have workflows enabled.

### 4.4 Update RecurringTaskCard
**File:** `src/components/recurring-tasks/RecurringTaskCard.tsx`

Add TAR/STAT badges next to title when enabled.

### 4.5 Update RecurringTaskListView
**File:** `src/components/recurring-tasks/RecurringTaskListView.tsx`

Add TAR/STAT badges in table/card view.

---

## Phase 5: Responsive Design

### 5.1 Breakpoints
- **Desktop (>1020px)**: Table view for admin reports
- **Tablet (640-1020px)**: Card view for admin reports
- **Mobile (<640px)**: Full-width cards, bottom sheet drawer

### 5.2 Mobile Optimizations
- Step chips wrap to 2 columns
- Progress bar full-width
- Drawer slides up from bottom on mobile
- Touch-friendly toggle switches (48px minimum)
- Table hidden on mobile, cards shown instead

---

## Phase 6: State Management

### 6.1 Local State
- Toggle button states in form
- Drawer open/close state
- Selected task for drawer

### 6.2 Server State
- Use existing `useRecurringTasks` hook pattern
- Optimistic updates for step toggles
- Auto-refetch on mutations

---

## File Structure Summary

```
src/
├── app/
│   ├── api/
│   │   ├── workflow/[taskId]/route.ts        (NEW)
│   │   └── reports/workflow/route.ts         (NEW)
│   └── (authenticated)/
│       ├── reports/page.tsx                  (UPDATE)
│       ├── calendar/page.tsx                 (UPDATE)
│       └── tasks/recurring/page.tsx          (UPDATE)
├── components/
│   ├── compliance/
│   │   ├── WorkflowCard.tsx                  (NEW)
│   │   ├── WorkflowDrawer.tsx                (NEW)
│   │   └── WorkflowStepChip.tsx              (NEW)
│   ├── reports/
│   │   ├── WorkflowReportsTable.tsx          (NEW)
│   │   └── WorkflowReportsCards.tsx          (NEW)
│   └── recurring-tasks/
│       ├── RecurringTaskModal.tsx            (UPDATE)
│       ├── RecurringTaskCard.tsx             (UPDATE)
│       └── RecurringTaskListView.tsx         (UPDATE)
├── lib/
│   └── workflow-templates.ts                 (NEW)
└── services/
    ├── recurring-task.service.ts             (UPDATE)
    └── recurring-task-admin.service.ts       (UPDATE)
```

---

## Implementation Order

1. **Phase 1**: Schema & data model (foundation)
2. **Phase 2**: API endpoints (backend)
3. **Phase 3**: Core UI components (reusable pieces)
4. **Phase 4**: Page integration (wiring it together)
5. **Phase 5**: Responsive polish (mobile/desktop)
6. **Phase 6**: State management & optimization

---

## Key Decisions

1. **Storage**: Workflow steps embedded in task document (simpler, avoids extra collection)
2. **Permissions**: Users can only edit their own steps; managers/admins can edit all
3. **History**: Track step completion for audit trail (completedAt, completedBy)
4. **Notifications**: Not in initial scope; can add later

---

## Estimated Effort

- **Phase 1-2**: 4-6 hours (data model + API)
- **Phase 3**: 8-10 hours (UI components)
- **Phase 4**: 4-6 hours (page integration)
- **Phase 5**: 3-4 hours (responsive)
- **Phase 6**: 2-3 hours (state management)

**Total**: ~21-29 hours
