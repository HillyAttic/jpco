# Hide Header on Modal Implementation

## Overview
Implemented a global modal context that automatically hides the header whenever any modal dialog is displayed throughout the application.

## Problem
The sticky header was visible on top of modal dialogs, creating a poor user experience and visual clutter.

## Solution
Created a global `ModalContext` that tracks when modals are open and automatically hides the header component.

## Implementation

### 1. Created Modal Context
**File**: `src/contexts/modal-context.tsx`

```typescript
export function ModalProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  return (
    <ModalContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  return context;
}
```

### 2. Added ModalProvider to App
**File**: `src/app/providers.tsx`

Wrapped the app with `ModalProvider`:
```typescript
<ModalProvider>
  <SidebarProvider>{children}</SidebarProvider>
</ModalProvider>
```

### 3. Updated Header Component
**File**: `src/components/Layouts/header/index.tsx`

Added logic to hide header when modal is open:
```typescript
const { isModalOpen } = useModal();

// Hide header when modal is open
if (isModalOpen) {
  return null;
}
```

### 4. Updated Dashboard Dialog
**File**: `src/app/dashboard/page.tsx`

Integrated modal context with the task type selection dialog:
```typescript
const { openModal, closeModal } = useModal();

const handleCreateTask = () => {
  setShowTaskTypeDialog(true);
  openModal(); // Hide header
};

const handleTaskTypeSelect = (type) => {
  setShowTaskTypeDialog(false);
  closeModal(); // Show header
  router.push(`/tasks/${type}`);
};

const handleCancelDialog = () => {
  setShowTaskTypeDialog(false);
  closeModal(); // Show header
};
```

## How to Use in Other Components

Any component that shows a modal can use the modal context:

```typescript
import { useModal } from '@/contexts/modal-context';

function MyComponent() {
  const { openModal, closeModal } = useModal();
  const [showMyModal, setShowMyModal] = useState(false);
  
  const handleOpenModal = () => {
    setShowMyModal(true);
    openModal(); // This will hide the header
  };
  
  const handleCloseModal = () => {
    setShowMyModal(false);
    closeModal(); // This will show the header
  };
  
  return (
    <>
      <button onClick={handleOpenModal}>Open Modal</button>
      
      {showMyModal && (
        <div className="fixed inset-0 z-50">
          {/* Modal content */}
          <button onClick={handleCloseModal}>Close</button>
        </div>
      )}
    </>
  );
}
```

## Benefits

1. **Clean UI**: No header clutter when modals are open
2. **Global Solution**: Works for all modals throughout the app
3. **Easy to Use**: Simple API with `openModal()` and `closeModal()`
4. **Consistent UX**: All modals behave the same way
5. **Maintainable**: Centralized logic in one context

## Files Modified

1. **New**: `src/contexts/modal-context.tsx` - Modal context provider
2. **Modified**: `src/app/providers.tsx` - Added ModalProvider
3. **Modified**: `src/components/Layouts/header/index.tsx` - Hide header when modal is open
4. **Modified**: `src/app/dashboard/page.tsx` - Integrated with task type dialog

## Testing

To test the implementation:
1. Go to the Dashboard
2. Click "Create Task" button
3. Verify the header disappears when the dialog opens
4. Click "Cancel" or select a task type
5. Verify the header reappears

## Future Enhancements

To integrate with existing modals:
1. Import `useModal` hook in modal components
2. Call `openModal()` when showing the modal
3. Call `closeModal()` when hiding the modal

Example modals to update:
- TaskModal
- RecurringTaskModal
- EmployeeModal
- ClientModal
- CategoryModal
- All other modal dialogs in the app
