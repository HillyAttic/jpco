# Header Hide on Modal - Implementation

## Overview
Updated the calendar page to hide the header when the recurring task client tracking modal is opened.

## Changes Made

### 1. Updated `src/components/calendar-view.tsx`

#### Added Modal Context Import
```typescript
import { useModal } from '@/contexts/modal-context';
```

#### Added Modal Context Hook
```typescript
const { openModal, closeModal } = useModal();
```

#### Updated `handleTaskClick` Function
- Added `openModal()` call when opening the client tracking modal
- This triggers the header to hide

```typescript
const handleTaskClick = async (task: CalendarTask, e: React.MouseEvent) => {
  e.stopPropagation();
  
  if (task.isRecurring && task.recurringTaskId) {
    setSelectedTask(task);
    
    // Fetch clients
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
    
    setIsClientModalOpen(true);
    openModal(); // Hide header when modal opens
  } else if (onTaskClick) {
    onTaskClick(task);
  }
};
```

#### Added `handleCloseModal` Function
- Centralized modal closing logic
- Calls `closeModal()` to show the header again

```typescript
const handleCloseModal = () => {
  setIsClientModalOpen(false);
  setSelectedTask(null);
  closeModal(); // Show header when modal closes
};
```

#### Updated Modal Component
- Changed `onClose` prop to use the new `handleCloseModal` function

```typescript
<RecurringTaskClientModal
  isOpen={isClientModalOpen}
  onClose={handleCloseModal}
  // ... other props
/>
```

## How It Works

### Modal Context System
The application uses a global modal context (`src/contexts/modal-context.tsx`) that tracks whether any modal is open:

```typescript
interface ModalContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}
```

### Header Component
The header component (`src/components/Layouts/header/index.tsx`) checks the modal context and returns `null` when a modal is open:

```typescript
export function Header() {
  const { isModalOpen } = useModal();

  // Hide header when modal is open
  if (isModalOpen) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 ...">
      {/* Header content */}
    </header>
  );
}
```

### Flow
1. User clicks on a recurring task in the calendar
2. `handleTaskClick` is called
3. `openModal()` is called, setting `isModalOpen = true`
4. Header component detects `isModalOpen = true` and hides itself
5. Client tracking modal opens
6. User closes the modal
7. `handleCloseModal` is called
8. `closeModal()` is called, setting `isModalOpen = false`
9. Header component detects `isModalOpen = false` and shows itself again

## Benefits

1. **Clean UI**: No header clutter when viewing the modal
2. **Better Focus**: Users can focus on the client tracking without distractions
3. **More Space**: Modal has more vertical space without the header
4. **Consistent Behavior**: Uses the same modal context system as other modals in the app

## Testing

### To Test:
1. Navigate to `http://localhost:3000/calendar`
2. Click on any recurring task (marked with M, Q, H, Y)
3. Verify the header disappears when the modal opens
4. Verify the header reappears when the modal closes (click Cancel or Save)

### Test Cases:
- ✅ Header hides when modal opens
- ✅ Header shows when modal closes via Cancel button
- ✅ Header shows when modal closes via Save button
- ✅ Header shows when modal closes via X button
- ✅ Header shows when modal closes via backdrop click

## Files Modified

1. `src/components/calendar-view.tsx`
   - Added modal context import
   - Added `openModal()` and `closeModal()` calls
   - Created `handleCloseModal` function

## Related Files

- `src/contexts/modal-context.tsx` - Modal context provider
- `src/components/Layouts/header/index.tsx` - Header component with hide logic
- `src/components/recurring-tasks/RecurringTaskClientModal.tsx` - Client tracking modal

---

**Status**: ✅ Complete
**Last Updated**: January 28, 2026
