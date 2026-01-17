# Loading States Implementation Guide

This document describes the loading state components and patterns implemented across the application.

## Overview

The loading state system provides:
- Skeleton loaders for different layout types
- Button loading indicators
- Form input disabled states during submission
- Modal loading overlays
- Consistent loading UX across all pages

## Components

### 1. Skeleton Components

Located in `src/components/ui/loading-skeletons.tsx`

#### CardSkeleton
Single card skeleton for loading individual items.

```tsx
import { CardSkeleton } from '@/components/ui/loading-skeletons';

<CardSkeleton />
```

#### CardGridSkeleton
Grid of card skeletons for loading lists.

```tsx
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';

<CardGridSkeleton count={6} />  // Shows 6 skeleton cards
```

#### ListItemSkeleton
Single list item skeleton.

```tsx
import { ListItemSkeleton } from '@/components/ui/loading-skeletons';

<ListItemSkeleton />
```

#### ListSkeleton
Multiple list item skeletons.

```tsx
import { ListSkeleton } from '@/components/ui/loading-skeletons';

<ListSkeleton count={5} />  // Shows 5 skeleton items
```

#### FormSkeleton
Form loading skeleton with multiple fields.

```tsx
import { FormSkeleton } from '@/components/ui/loading-skeletons';

<FormSkeleton />
```

#### TableSkeleton
Table loading skeleton.

```tsx
import { TableSkeleton } from '@/components/ui/loading-skeletons';

<TableSkeleton rows={5} columns={4} />
```

#### StatsCardSkeleton
Single statistics card skeleton.

```tsx
import { StatsCardSkeleton } from '@/components/ui/loading-skeletons';

<StatsCardSkeleton />
```

#### StatsGridSkeleton
Grid of statistics card skeletons.

```tsx
import { StatsGridSkeleton } from '@/components/ui/loading-skeletons';

<StatsGridSkeleton count={4} />
```

#### PageSkeleton
Complete page skeleton with header, stats, and content.

```tsx
import { PageSkeleton } from '@/components/ui/loading-skeletons';

<PageSkeleton />
```

### 2. Button Loading State

The Button component has built-in loading state support.

```tsx
import { Button } from '@/components/ui/button';

<Button loading={isSubmitting} disabled={isSubmitting}>
  Submit
</Button>
```

Features:
- Shows spinner icon when loading
- Automatically disables button
- Maintains button size and layout

### 3. ErrorBoundary Component

Located in `src/components/ErrorBoundary.tsx`

Catches React errors and displays fallback UI.

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary
  fallback={<CustomErrorUI />}  // Optional custom fallback
  onError={(error, errorInfo) => {
    // Optional error logging
    console.error(error, errorInfo);
  }}
>
  <YourComponent />
</ErrorBoundary>
```

Features:
- Catches component errors
- Shows user-friendly error message
- Provides "Try again" button to reset
- Logs errors in development
- Supports custom fallback UI

## Usage Patterns

### Pattern 1: List/Grid Loading

```tsx
function ClientsPage() {
  const { clients, loading } = useClients();

  if (loading) {
    return <CardGridSkeleton count={6} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map(client => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  );
}
```

### Pattern 2: Form Submission Loading

```tsx
function ClientModal({ onSubmit }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Name"
        disabled={isSubmitting}
        {...register('name')}
      />
      
      <Button type="submit" loading={isSubmitting}>
        Submit
      </Button>
    </form>
  );
}
```

### Pattern 3: Page-Level Loading

```tsx
function DashboardPage() {
  const { data, loading, error } = useDashboardData();

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return <DashboardContent data={data} />;
}
```

### Pattern 4: Inline Loading States

```tsx
function ClientList({ clients, isLoading }) {
  return (
    <div className="space-y-6">
      {/* Search bar always visible */}
      <SearchBar />

      {/* Conditional loading */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {clients.map(client => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Pattern 5: Error Boundary Wrapping

```tsx
// Wrap entire page
function Page() {
  return (
    <ErrorBoundary>
      <PageContent />
    </ErrorBoundary>
  );
}

// Wrap specific sections
function Dashboard() {
  return (
    <div>
      <Header />
      
      <ErrorBoundary fallback={<StatsError />}>
        <StatsSection />
      </ErrorBoundary>
      
      <ErrorBoundary fallback={<ChartError />}>
        <ChartSection />
      </ErrorBoundary>
    </div>
  );
}
```

## Implementation Checklist

### For List/Grid Components

- [ ] Add `isLoading` prop to component
- [ ] Show `CardGridSkeleton` or `ListSkeleton` when loading
- [ ] Disable search/filter inputs during loading
- [ ] Show appropriate skeleton count (6-9 for grids, 5-10 for lists)

### For Modal/Form Components

- [ ] Add `isLoading` prop to modal
- [ ] Pass `loading` prop to submit button
- [ ] Disable all form inputs when `isLoading` is true
- [ ] Show loading indicator on submit button

### For Page Components

- [ ] Wrap page content in `ErrorBoundary`
- [ ] Show `PageSkeleton` during initial data load
- [ ] Handle error states with user-friendly messages
- [ ] Provide retry mechanisms for failed operations

### For API Hooks

- [ ] Return `loading` state from hooks
- [ ] Set loading to `true` before async operations
- [ ] Set loading to `false` after operations complete
- [ ] Handle loading state in error cases

## Updated Components

The following components have been updated with loading states:

### UI Components
- ✅ `Button` - Built-in loading prop with spinner
- ✅ `Skeleton` - Base skeleton component
- ✅ `loading-skeletons.tsx` - All skeleton variants

### Error Handling
- ✅ `ErrorBoundary` - React error boundary with fallback UI

### List Components
- ✅ `ClientList` - Uses CardGridSkeleton during loading

### Modal Components
- ✅ `ClientModal` - Disables inputs and shows button loading state
- ✅ `TaskModal` - Disables inputs and shows button loading state
- ✅ `RecurringTaskModal` - Disables inputs and shows button loading state
- ✅ `TeamModal` - Disables inputs and shows button loading state
- ✅ `EmployeeModal` - Disables inputs and shows button loading state

## Remaining Components to Update

The following components should be updated to use the new loading skeletons:

### List Components
- [ ] `TaskList` - Replace spinner with CardGridSkeleton
- [ ] `RecurringTaskList` - Replace spinner with CardGridSkeleton
- [ ] `TeamList` - Replace spinner with CardGridSkeleton
- [ ] `EmployeeList` - Replace spinner with CardGridSkeleton

### Page Components
- [ ] `ClientsPage` - Wrap in ErrorBoundary
- [ ] `TasksPage` - Wrap in ErrorBoundary
- [ ] `RecurringTasksPage` - Wrap in ErrorBoundary
- [ ] `TeamsPage` - Wrap in ErrorBoundary
- [ ] `EmployeesPage` - Wrap in ErrorBoundary

### Stats Components
- [ ] `TaskStatsCard` - Add loading skeleton
- [ ] `EmployeeStatsCard` - Add loading skeleton

## Best Practices

### 1. Skeleton Matching
Ensure skeleton layouts match the actual content layout:
- Same grid columns
- Same card sizes
- Same spacing

### 2. Loading Duration
- Show skeletons for operations > 300ms
- Use instant feedback for < 300ms operations
- Show progress indicators for > 5s operations

### 3. Optimistic Updates
Combine loading states with optimistic updates:
```tsx
const handleCreate = async (data) => {
  // Optimistic update
  const tempId = `temp-${Date.now()}`;
  addOptimisticItem({ ...data, id: tempId });

  try {
    const result = await createItem(data);
    replaceOptimisticItem(tempId, result);
  } catch (error) {
    removeOptimisticItem(tempId);
    showError(error);
  }
};
```

### 4. Error Recovery
Always provide ways to recover from errors:
- Retry buttons
- Clear error messages
- Fallback UI
- Navigation options

### 5. Accessibility
- Use `aria-busy` attribute during loading
- Announce loading state changes to screen readers
- Maintain focus management during state changes
- Ensure keyboard navigation works in all states

### 6. Performance
- Lazy load skeleton components if needed
- Avoid re-rendering skeletons unnecessarily
- Use React.memo for skeleton components
- Minimize skeleton animation complexity

## Testing Loading States

### Manual Testing
1. Test with slow network (Chrome DevTools throttling)
2. Test with network failures
3. Test rapid state changes
4. Test concurrent operations

### Automated Testing
```tsx
describe('ClientList Loading States', () => {
  it('shows skeleton during loading', () => {
    render(<ClientList clients={[]} isLoading={true} />);
    expect(screen.getByTestId('card-grid-skeleton')).toBeInTheDocument();
  });

  it('shows content after loading', () => {
    const { rerender } = render(<ClientList clients={[]} isLoading={true} />);
    rerender(<ClientList clients={mockClients} isLoading={false} />);
    expect(screen.queryByTestId('card-grid-skeleton')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('client-card')).toHaveLength(mockClients.length);
  });
});
```

## Common Issues and Solutions

### Issue: Skeleton doesn't match content
**Solution**: Adjust skeleton component to match actual layout

### Issue: Loading state flickers
**Solution**: Add minimum display time or debounce loading state

### Issue: Button stays disabled after error
**Solution**: Ensure loading state is reset in finally block

### Issue: Form inputs stay disabled
**Solution**: Reset isSubmitting state after submission completes

### Issue: Skeleton shows briefly on fast connections
**Solution**: Add delay before showing skeleton (300ms threshold)

## Future Enhancements

Potential improvements:

- Animated skeleton gradients
- Progressive loading (show partial data)
- Skeleton customization per component
- Loading state analytics
- Automatic skeleton generation from components
- Suspense integration for React 18+
