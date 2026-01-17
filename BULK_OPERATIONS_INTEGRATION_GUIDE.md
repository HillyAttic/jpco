# Bulk Operations Integration Guide

This document provides instructions for integrating bulk operations into the remaining management pages.

## Completed Integration

✅ **Clients Page** - Fully integrated with bulk operations including:
- Selection checkboxes on ClientCard
- BulkActionToolbar
- Bulk delete with confirmation dialog
- Bulk CSV export

## Components Created

### 1. BulkActionToolbar (`src/components/ui/BulkActionToolbar.tsx`)
- Displays when items are selected
- Shows selection count
- Provides "Select All" and "Clear Selection" buttons
- Includes "Export" and "Delete" action buttons
- Validates Requirements: 10.1, 10.4

### 2. BulkDeleteDialog (`src/components/ui/BulkDeleteDialog.tsx`)
- Confirmation dialog for bulk delete operations
- Shows count of items to be deleted
- Prevents accidental deletions
- Validates Requirements: 10.2

### 3. CSV Export Utility (`src/utils/csv-export.ts`)
- `convertToCSV()` - Converts array of objects to CSV format
- `downloadCSV()` - Triggers browser download
- `exportToCSV()` - Combined export function
- `generateTimestampedFilename()` - Creates unique filenames
- Validates Requirements: 10.3

### 4. Bulk Selection Hook (`src/hooks/use-bulk-selection.ts`)
- Manages selection state
- Provides helper functions: `toggleSelection`, `selectAll`, `clearSelection`, `isSelected`
- Returns `selectedItems`, `selectedCount`, `allSelected`

## Integration Pattern

To integrate bulk operations into a page, follow this pattern:

### Step 1: Update Card Component

Add selection props to the card interface:

```typescript
interface CardProps {
  // ... existing props
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}
```

Add checkbox to card JSX:

```tsx
{onSelect && (
  <div className="absolute top-4 left-4 z-10">
    <input
      type="checkbox"
      checked={selected}
      onChange={(e) => onSelect(item.id!, e.target.checked)}
      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      aria-label={`Select ${item.name}`}
    />
  </div>
)}
```

Add selection ring to card:

```tsx
<Card className={`... ${selected ? 'ring-2 ring-blue-500' : ''}`}>
```

### Step 2: Update List Component

Add selection props to list interface:

```typescript
interface ListProps {
  // ... existing props
  selectedIds?: Set<string>;
  onSelect?: (id: string, selected: boolean) => void;
  isSelected?: (id: string) => boolean;
}
```

Pass props to cards:

```tsx
<ItemCard
  // ... existing props
  selected={isSelected ? isSelected(item.id!) : false}
  onSelect={onSelect}
/>
```

### Step 3: Update Page Component

Import required components and hooks:

```typescript
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { BulkActionToolbar } from '@/components/ui/BulkActionToolbar';
import { BulkDeleteDialog } from '@/components/ui/BulkDeleteDialog';
import { exportToCSV, generateTimestampedFilename } from '@/utils/csv-export';
```

Add bulk selection hook:

```typescript
const {
  selectedIds,
  selectedItems,
  selectedCount,
  allSelected,
  toggleSelection,
  selectAll,
  clearSelection,
  isSelected,
} = useBulkSelection(items);
```

Add state for bulk delete dialog:

```typescript
const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
const [isBulkDeleting, setIsBulkDeleting] = useState(false);
```

Add bulk delete handler:

```typescript
const handleBulkDelete = () => {
  setIsBulkDeleteDialogOpen(true);
};

const handleConfirmBulkDelete = async () => {
  setIsBulkDeleting(true);
  try {
    await Promise.all(
      Array.from(selectedIds).map((id) => deleteItem(id))
    );
    clearSelection();
    setIsBulkDeleteDialogOpen(false);
  } catch (error) {
    console.error('Error deleting items:', error);
    alert('Failed to delete some items. Please try again.');
  } finally {
    setIsBulkDeleting(false);
  }
};
```

Add bulk export handler:

```typescript
const handleBulkExport = () => {
  const exportData = selectedItems.map((item) => ({
    // Map item properties to export columns
    Name: item.name,
    Email: item.email,
    // ... other fields
  }));

  const filename = generateTimestampedFilename('items_export');
  exportToCSV(exportData, filename);
};
```

Add components to JSX:

```tsx
{/* Pass selection props to list */}
<ItemList
  items={items}
  // ... other props
  selectedIds={selectedIds}
  onSelect={toggleSelection}
  isSelected={isSelected}
/>

{/* Bulk Action Toolbar */}
{selectedCount > 0 && (
  <BulkActionToolbar
    selectedCount={selectedCount}
    totalCount={items.length}
    onSelectAll={selectAll}
    onClearSelection={clearSelection}
    onBulkDelete={handleBulkDelete}
    onBulkExport={handleBulkExport}
  />
)}

{/* Bulk Delete Confirmation Dialog */}
<BulkDeleteDialog
  open={isBulkDeleteDialogOpen}
  onOpenChange={setIsBulkDeleteDialogOpen}
  itemCount={selectedCount}
  itemType="item"
  onConfirm={handleConfirmBulkDelete}
  loading={isBulkDeleting}
/>
```

## Remaining Pages to Integrate

### 1. Non-Recurring Tasks Page (`src/app/tasks/non-recurring/page.tsx`)
- Update TaskCard with selection props ✅ (already done)
- Update page to use bulk selection hook
- Add bulk delete and export handlers
- Export columns: Title, Description, Status, Priority, Due Date, Assigned To, Category

### 2. Recurring Tasks Page (`src/app/tasks/recurring/page.tsx`)
- Update RecurringTaskCard with selection props ✅ (already done)
- Update page to use bulk selection hook
- Add bulk delete and export handlers
- Export columns: Title, Description, Status, Priority, Recurrence Pattern, Next Occurrence, Start Date, End Date

### 3. Teams Page (`src/app/teams/page.tsx`)
- Update TeamCard with selection props ✅ (already done)
- Update page to use bulk selection hook
- Add bulk delete and export handlers
- Export columns: Name, Description, Leader, Member Count, Department, Status

### 4. Employees Page (`src/app/employees/page.tsx`)
- Update EmployeeCard with selection props ✅ (already done)
- Update page to use bulk selection hook
- Add bulk delete and export handlers
- Export columns: Name, Email, Phone, Position, Department, Status, Hire Date

## Card Components Updated

All card components have been updated with selection support:
- ✅ ClientCard
- ✅ TaskCard
- ✅ RecurringTaskCard
- ✅ TeamCard
- ✅ EmployeeCard

## Testing Checklist

For each integrated page, verify:
- [ ] Selection checkboxes appear on cards
- [ ] Clicking checkbox selects/deselects item
- [ ] Selected cards show blue ring
- [ ] BulkActionToolbar appears when items selected
- [ ] "Select All" button selects all items on current page
- [ ] "Clear" button deselects all items
- [ ] "Export" button downloads CSV file with correct data
- [ ] "Delete" button shows confirmation dialog
- [ ] Confirmation dialog shows correct count
- [ ] Bulk delete removes all selected items
- [ ] Selection state clears after bulk delete
- [ ] CSV export includes all selected items with proper formatting

## Requirements Validation

- ✅ **Requirement 10.1**: Bulk action toolbar displays when multiple items selected
- ✅ **Requirement 10.2**: Bulk delete shows confirmation dialog with item count
- ✅ **Requirement 10.3**: Data export generates downloadable CSV file
- ✅ **Requirement 10.4**: Select all functionality works on current page

## Notes

- The BulkActionToolbar is positioned fixed at the bottom center of the screen
- CSV exports include a BOM for proper UTF-8 encoding in Excel
- Timestamps in filenames use ISO format with special characters replaced
- Selection state is managed per-page (doesn't persist across navigation)
- Bulk operations work on the current filtered/searched results
