# JPCO Dashboard Components Documentation

## Overview
This document describes the comprehensive dashboard components created for the JPCO Dashboard application. All components are built with Next.js, TypeScript, Tailwind CSS, and integrate with Firebase for real-time data.

## Component Structure

```
src/components/
├── dashboard/
│   ├── StatCard.tsx           # Reusable statistics card with icon and trend
│   ├── TaskOverview.tsx       # Recent tasks list with status badges
│   ├── ActivityFeed.tsx       # Timeline of recent user actions
│   ├── QuickActions.tsx       # Quick access buttons panel
│   ├── UpcomingDeadlines.tsx  # Tasks due within 7 days
│   └── index.ts               # Barrel export
└── charts/
    ├── TaskDistributionChart.tsx   # Pie chart for task status breakdown
    ├── WeeklyProgressChart.tsx     # Bar chart for weekly task trends
    ├── TeamPerformanceChart.tsx    # Horizontal bar chart for team metrics
    └── index.ts                    # Barrel export
```

## Components

### 1. StatCard
**Location:** `src/components/dashboard/StatCard.tsx`

Displays a single statistic with an icon, value, subtitle, and optional trend indicator.

**Props:**
- `title` (string): Card title
- `value` (number | string): Main statistic value
- `subtitle` (string): Description text
- `icon` (ReactNode): Icon component
- `iconBgColor` (string): Background color class for icon
- `iconColor` (string): Text color class for icon
- `trend` (optional): Object with `value` (number) and `isPositive` (boolean)

**Usage:**
```tsx
<StatCard
  title="Total Tasks"
  value={42}
  subtitle="All tasks"
  icon={<ClipboardDocumentListIcon className="w-5 h-5" />}
  iconBgColor="bg-blue-100"
  iconColor="text-blue-600"
  trend={{ value: 12, isPositive: true }}
/>
```

### 2. TaskOverview
**Location:** `src/components/dashboard/TaskOverview.tsx`

Displays the 5 most recent tasks with status badges and priority indicators.

**Props:**
- `tasks` (Task[]): Array of task objects
- `onTaskClick` (optional): Callback function when task is clicked

**Features:**
- Shows task title, due date, status, and priority
- Color-coded status badges
- High priority tasks show warning icon
- Click handler for navigation

### 3. UpcomingDeadlines
**Location:** `src/components/dashboard/UpcomingDeadlines.tsx`

Shows tasks due within the next 7 days, sorted by due date.

**Props:**
- `tasks` (Task[]): Array of task objects
- `onTaskClick` (optional): Callback function when task is clicked

**Features:**
- Filters tasks due within 7 days
- Color-coded urgency indicators (red for today/tomorrow, orange for 2-3 days, blue for 4+ days)
- Excludes completed tasks
- Shows relative time (Today, Tomorrow, X days)

### 4. ActivityFeed
**Location:** `src/components/dashboard/ActivityFeed.tsx`

Timeline display of recent user actions and task updates.

**Props:**
- `activities` (Activity[]): Array of activity objects

**Activity Object:**
```typescript
interface Activity {
  id: string;
  type: 'created' | 'updated' | 'completed' | 'deleted' | 'assigned';
  taskTitle: string;
  user: string;
  timestamp: Date;
}
```

**Features:**
- Icon-based activity types
- Relative timestamps (e.g., "2h ago", "Just now")
- Color-coded by activity type

### 5. QuickActions
**Location:** `src/components/dashboard/QuickActions.tsx`

Grid of action buttons for common operations.

**Props:**
- `onCreateTask` (optional): Create task handler
- `onViewTeam` (optional): View team handler
- `onViewAnalytics` (optional): View analytics handler
- `onViewReports` (optional): View reports handler
- `onManageProjects` (optional): Manage projects handler
- `onSettings` (optional): Settings handler

**Features:**
- 6 pre-configured action buttons
- Color-coded by action type
- Responsive grid layout

### 6. TaskDistributionChart
**Location:** `src/components/charts/TaskDistributionChart.tsx`

Pie chart showing task status distribution.

**Props:**
- `completed` (number): Number of completed tasks
- `inProgress` (number): Number of in-progress tasks
- `todo` (number): Number of todo tasks
- `total` (number): Total number of tasks

**Features:**
- SVG-based pie chart
- Color-coded segments (green, orange, red)
- Center label showing total
- Legend with counts and percentages

### 7. WeeklyProgressChart
**Location:** `src/components/charts/WeeklyProgressChart.tsx`

Bar chart showing task creation and completion trends over 7 days.

**Props:**
- `data` (object): Contains `labels` (string[]), `created` (number[]), `completed` (number[])

**Features:**
- Dual bar chart (created vs completed)
- Grid lines and axis labels
- Hover effects
- Responsive scaling

### 8. TeamPerformanceChart
**Location:** `src/components/charts/TeamPerformanceChart.tsx`

Horizontal bar chart comparing team member productivity.

**Props:**
- `teamMembers` (TeamMember[]): Array of team member objects

**TeamMember Object:**
```typescript
interface TeamMember {
  name: string;
  tasksCompleted: number;
  tasksInProgress: number;
}
```

**Features:**
- Stacked horizontal bars
- Color-coded by status (green for completed, orange for in-progress)
- Task count overlays
- Legend

## Dashboard Page Integration

The main dashboard page (`src/app/dashboard/page.tsx`) integrates all components in a responsive grid layout:

**Layout Structure:**
1. **Header**: Title and Create Task button
2. **Stats Row**: 5 StatCards showing key metrics
3. **Main Grid** (3 columns):
   - Left: TaskOverview + UpcomingDeadlines
   - Middle: TaskDistributionChart + QuickActions
   - Right: ActivityFeed
4. **Bottom Row**: WeeklyProgressChart + TeamPerformanceChart

## Data Flow

### Real-time Updates
All components receive data from the parent dashboard page, which fetches from Firebase:

```typescript
const loadDashboardData = async () => {
  const tasksData = await taskApi.getTasks();
  setTasks(tasksData);
};
```

### Computed Statistics
Statistics are calculated using `useMemo` for performance:

```typescript
const stats = useMemo(() => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  // ... more calculations
  return { total, completed, inProgress, todo, overdue };
}, [tasks]);
```

## Styling

All components use:
- **Tailwind CSS** for styling
- **Heroicons** for icons
- **Consistent color scheme**:
  - Blue: Primary/Total
  - Green: Completed/Success
  - Orange: In Progress/Warning
  - Yellow: Todo/Pending
  - Red: Overdue/Error

## Responsive Design

All components are fully responsive:
- Mobile: Single column layout
- Tablet: 2-column grid
- Desktop: 3-column grid with optimized spacing

## Future Enhancements

Consider adding:
1. **Real-time listeners**: Use Firebase onSnapshot for live updates
2. **Chart library integration**: Replace custom charts with ApexCharts or Recharts
3. **Export functionality**: Add CSV/PDF export for reports
4. **Filtering**: Add date range and status filters
5. **Drill-down**: Click charts to filter tasks
6. **Animations**: Add smooth transitions and loading states
7. **Dark mode**: Theme support using next-themes

## Testing

To test components:
1. Ensure Firebase is configured
2. Add sample tasks via the task creation form
3. Navigate to `/dashboard`
4. Verify all components render with data
5. Test responsive behavior at different screen sizes

## Dependencies

- Next.js 16.0.10
- React 19.2.0
- TypeScript 5.x
- Tailwind CSS 3.4.16
- @heroicons/react 2.2.0
- Firebase 11.10.0

## Notes

- Mock data is used for team performance and weekly trends (replace with actual API calls)
- Activity feed currently uses task updates (extend with dedicated activity tracking)
- All components handle empty states gracefully
- Error boundaries should be added for production use
