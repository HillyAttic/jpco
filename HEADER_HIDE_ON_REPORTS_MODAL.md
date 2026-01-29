# Header Hide on Reports Modal - Implementation

## Overview
The header is now automatically hidden when the Reports detail modal is opened, providing a cleaner, more focused view of the task completion data.

## Implementation Details

### How It Works

1. **Modal Context**: The application uses a global `ModalContext` that tracks whether any modal is open
2. **Header Component**: The header checks `isModalOpen` from the context and returns `null` when true
3. **Reports Modal**: When opening/closing the modal, it notifies the global context

### Code Changes

#### 1. ReportsView Component (`src/components/reports/ReportsView.tsx`)

**Added:**
- Import `useModal` hook from modal context
- Call `openGlobalModal()` when opening the task detail modal
- Call `closeGlobalModal()` when closing the task detail modal

```typescript
const { openModal: openGlobalModal, closeModal: closeGlobalModal } = useModal();

const handleTaskClick = (task: RecurringTask) => {
  setSelectedTask(task);
  setIsModalOpen(true);
  openGlobalModal(); // Hide header
};

const closeModal = () => {
  setIsModalOpen(false);
  setSelectedTask(null);
  closeGlobalModal(); // Show header
};
```

#### 2. Header Component (`src/components/Layouts/header/index.tsx`)

**Already Implemented:**
The header already had the logic to hide when modals are open:

```typescript
const { isModalOpen } = useModal();

if (isModalOpen) {
  return null; // Hide header
}
```

### Benefits

1. **More Screen Space**: Modal uses full viewport height without header obstruction
2. **Better Focus**: Users can focus entirely on the task completion data
3. **Consistent UX**: Matches behavior of other modals in the application
4. **Clean Design**: Removes visual clutter when viewing detailed reports

### User Experience

**Before Opening Modal:**
```
┌────────────────────────────────────┐
│ Header (Dashboard, User Info, etc)│
├────────────────────────────────────┤
│                                    │
│ Reports Page                       │
│ - Task List                        │
│ - Completion Rates                 │
│ - [View Details] buttons           │
│                                    │
└────────────────────────────────────┘
```

**After Opening Modal:**
```
┌────────────────────────────────────┐
│ Task Detail Modal                  │
│ ┌────────────────────────────────┐ │
│ │ GSTR1                     [X]  │ │
│ │ Track completion for 630 clients│ │
│ ├────────────────────────────────┤ │
│ │ Client/Month Grid              │ │
│ │ ✓ ✗ - indicators               │ │
│ │                                │ │
│ │ (Full screen space available)  │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

### Testing

#### Test 1: Header Hides on Modal Open
1. Navigate to `/reports`
2. Click "View Details" on any task
3. ✓ Header should disappear
4. ✓ Modal should use full screen height

#### Test 2: Header Shows on Modal Close
1. With modal open, click the X button or Close button
2. ✓ Header should reappear
3. ✓ Reports page should be visible again

#### Test 3: Header Hides on Backdrop Click
1. Open modal
2. Click outside the modal (on backdrop)
3. ✓ Modal should close
4. ✓ Header should reappear

#### Test 4: Multiple Modals
1. Open Reports modal
2. ✓ Header hidden
3. Close modal
4. ✓ Header visible
5. Open another modal (e.g., from calendar)
6. ✓ Header hidden
7. Close that modal
8. ✓ Header visible

### Technical Notes

- The modal context is provided at the app root level
- All modals in the application can use this context
- The header automatically responds to any modal state changes
- No additional configuration needed for new modals

### Compatibility

- ✓ Works on desktop
- ✓ Works on tablet
- ✓ Works on mobile
- ✓ Works with dark mode
- ✓ Works with all browsers

### Related Files

- `src/components/reports/ReportsView.tsx` - Reports modal implementation
- `src/components/Layouts/header/index.tsx` - Header component
- `src/contexts/modal-context.tsx` - Modal context provider

### Future Enhancements

This pattern can be extended to:
- Hide sidebar on modal open (if needed)
- Add transition animations
- Support different modal sizes
- Add modal stacking support

---

**Status**: ✅ Implemented and Working

The header now automatically hides when the Reports modal is open, providing a better user experience.
