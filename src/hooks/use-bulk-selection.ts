import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing bulk selection state
 * Provides selection state management and helper functions
 */
export function useBulkSelection<T extends { id?: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toggle selection for a single item
  const toggleSelection = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  // Select all items
  const selectAll = useCallback(() => {
    const allIds = items.map((item) => item.id).filter((id): id is string => !!id);
    setSelectedIds(new Set(allIds));
  }, [items]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Check if an item is selected
  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id);
    },
    [selectedIds]
  );

  // Get selected items
  const selectedItems = useMemo(() => {
    return items.filter((item) => item.id && selectedIds.has(item.id));
  }, [items, selectedIds]);

  // Get count of selected items
  const selectedCount = selectedIds.size;

  // Check if all items are selected
  const allSelected = useMemo(() => {
    const validItems = items.filter((item) => !!item.id);
    return validItems.length > 0 && selectedIds.size === validItems.length;
  }, [items, selectedIds]);

  return {
    selectedIds,
    selectedItems,
    selectedCount,
    allSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  };
}
