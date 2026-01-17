/**
 * Property-Based Tests for TeamFilter
 * Feature: management-pages
 * 
 * This file contains property-based tests for TeamFilter component:
 * - Property 16: Team Filter Accuracy
 * - Property 21: Filter State Persistence
 * 
 * Validates: Requirements 4.9, 8.6
 */

import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { TeamFilter, TeamFilterState } from '@/components/teams/TeamFilter';

// Mock handlers for component props
const mockHandlers = {
  onFilterChange: jest.fn(),
  onClearFilters: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// Reusable generators
const generators = {
  status: () => fc.constantFrom('all', 'active', 'inactive', 'archived'),
  department: () => fc.constantFrom('all', 'Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Product', 'Design'),
  departmentList: () => fc.array(
    fc.constantFrom('Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Product', 'Design'),
    { minLength: 0, maxLength: 8 }
  ).map(arr => Array.from(new Set(arr))), // Remove duplicates
};

// Helper function to render TeamFilter
function renderTeamFilter(
  filters: TeamFilterState,
  availableDepartments?: string[]
) {
  return render(
    <TeamFilter
      filters={filters}
      onFilterChange={mockHandlers.onFilterChange}
      onClearFilters={mockHandlers.onClearFilters}
      availableDepartments={availableDepartments}
    />
  );
}

// ============================================================================
// Property 16: Team Filter Accuracy
// Test filters work correctly
// Validates: Requirements 4.9
// ============================================================================

describe('Feature: management-pages, Property 16: Team Filter Accuracy', () => {
  it('should display current filter values for any filter state', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
        }),
        (filters) => {
          renderTeamFilter(filters);

          try {
            // Verify status filter displays current value - Requirement 4.9
            const statusSelect = screen.getByLabelText('Filter by status') as HTMLSelectElement;
            expect(statusSelect).toBeInTheDocument();
            expect(statusSelect.value).toBe(filters.status);

            // Verify department filter displays current value - Requirement 4.9
            const departmentSelect = screen.getByLabelText('Filter by department') as HTMLSelectElement;
            expect(departmentSelect).toBeInTheDocument();
            expect(departmentSelect.value).toBe(filters.department);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should call onFilterChange with updated status when status filter changes', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialStatus: generators.status(),
          initialDepartment: generators.department(),
          newStatus: generators.status(),
        }),
        ({ initialStatus, initialDepartment, newStatus }) => {
          const filters: TeamFilterState = {
            status: initialStatus,
            department: initialDepartment,
          };

          renderTeamFilter(filters);

          try {
            // Change status filter
            const statusSelect = screen.getByLabelText('Filter by status') as HTMLSelectElement;
            fireEvent.change(statusSelect, { target: { value: newStatus } });

            // Verify onFilterChange was called with updated status - Requirement 4.9
            expect(mockHandlers.onFilterChange).toHaveBeenCalledWith({
              status: newStatus,
              department: initialDepartment,
            });
          } finally {
            cleanup();
            jest.clearAllMocks();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should call onFilterChange with updated department when department filter changes', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialStatus: generators.status(),
          initialDepartment: generators.department(),
          newDepartment: generators.department(),
        }),
        ({ initialStatus, initialDepartment, newDepartment }) => {
          const filters: TeamFilterState = {
            status: initialStatus,
            department: initialDepartment,
          };

          renderTeamFilter(filters);

          try {
            // Change department filter
            const departmentSelect = screen.getByLabelText('Filter by department') as HTMLSelectElement;
            fireEvent.change(departmentSelect, { target: { value: newDepartment } });

            // Verify onFilterChange was called with updated department - Requirement 4.9
            expect(mockHandlers.onFilterChange).toHaveBeenCalledWith({
              status: initialStatus,
              department: newDepartment,
            });
          } finally {
            cleanup();
            jest.clearAllMocks();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display "Clear All" button when any filter is active', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
        }).filter(filters => filters.status !== 'all' || filters.department !== 'all'),
        (filters) => {
          renderTeamFilter(filters);

          try {
            // Verify "Clear All" button is displayed when filters are active
            const clearButton = screen.getByText('Clear All');
            expect(clearButton).toBeInTheDocument();
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display "Clear All" button when no filters are active', () => {
    fc.assert(
      fc.property(
        fc.constant({ status: 'all', department: 'all' }),
        (filters) => {
          renderTeamFilter(filters);

          try {
            // Verify "Clear All" button is not displayed when no filters are active
            const clearButton = screen.queryByText('Clear All');
            expect(clearButton).not.toBeInTheDocument();
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should call onClearFilters when "Clear All" button is clicked', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
        }).filter(filters => filters.status !== 'all' || filters.department !== 'all'),
        (filters) => {
          renderTeamFilter(filters);

          try {
            // Click "Clear All" button
            const clearButton = screen.getByText('Clear All');
            fireEvent.click(clearButton);

            // Verify onClearFilters was called
            expect(mockHandlers.onClearFilters).toHaveBeenCalledTimes(1);
          } finally {
            cleanup();
            jest.clearAllMocks();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display active filter indicators for non-default filters', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
        }).filter(filters => filters.status !== 'all' || filters.department !== 'all'),
        (filters) => {
          renderTeamFilter(filters);

          try {
            // Verify status filter indicator is displayed if status is not 'all'
            if (filters.status !== 'all') {
              const statusIndicator = screen.getByText(
                `Status: ${filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}`
              );
              expect(statusIndicator).toBeInTheDocument();
            }

            // Verify department filter indicator is displayed if department is not 'all'
            if (filters.department !== 'all') {
              const departmentIndicator = screen.getByText(`Department: ${filters.department}`);
              expect(departmentIndicator).toBeInTheDocument();
            }
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display filter indicators when all filters are default', () => {
    fc.assert(
      fc.property(
        fc.constant({ status: 'all', department: 'all' }),
        (filters) => {
          renderTeamFilter(filters);

          try {
            // Verify no filter indicators are displayed
            const statusPattern = /Status:/;
            const departmentPattern = /Department:/;
            
            const allText = screen.queryByText(statusPattern);
            const deptText = screen.queryByText(departmentPattern);
            
            expect(allText).not.toBeInTheDocument();
            expect(deptText).not.toBeInTheDocument();
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow removing individual filter indicators', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status().filter(s => s !== 'all'),
          department: generators.department(),
        }),
        (filters) => {
          renderTeamFilter(filters);

          try {
            // Find and click the remove button for status filter
            const statusIndicator = screen.getByText(
              `Status: ${filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}`
            );
            const removeButton = statusIndicator.parentElement?.querySelector('button');
            expect(removeButton).toBeInTheDocument();

            if (removeButton) {
              fireEvent.click(removeButton);

              // Verify onFilterChange was called with status reset to 'all'
              expect(mockHandlers.onFilterChange).toHaveBeenCalledWith({
                status: 'all',
                department: filters.department,
              });
            }
          } finally {
            cleanup();
            jest.clearAllMocks();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display available departments in dropdown when provided', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
          availableDepartments: generators.departmentList(),
        }).filter(({ availableDepartments }) => availableDepartments.length > 0),
        ({ status, department, availableDepartments }) => {
          const filters: TeamFilterState = { status, department };
          renderTeamFilter(filters, availableDepartments);

          try {
            // Get department select element
            const departmentSelect = screen.getByLabelText('Filter by department') as HTMLSelectElement;
            const options = Array.from(departmentSelect.options).map(opt => opt.value);

            // Verify "all" option is always present
            expect(options).toContain('all');

            // Verify all available departments are in the dropdown
            availableDepartments.forEach(dept => {
              expect(options).toContain(dept);
            });
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have all required status options available', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
        }),
        (filters) => {
          renderTeamFilter(filters);

          try {
            // Get status select element
            const statusSelect = screen.getByLabelText('Filter by status') as HTMLSelectElement;
            const options = Array.from(statusSelect.options).map(opt => opt.value);

            // Verify all required status options are present - Requirement 4.9
            expect(options).toContain('all');
            expect(options).toContain('active');
            expect(options).toContain('inactive');
            expect(options).toContain('archived');
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain filter state across multiple filter changes', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialStatus: generators.status(),
          initialDepartment: generators.department(),
          newStatus: generators.status(),
          newDepartment: generators.department(),
        }),
        ({ initialStatus, initialDepartment, newStatus, newDepartment }) => {
          const filters: TeamFilterState = {
            status: initialStatus,
            department: initialDepartment,
          };

          const { rerender } = renderTeamFilter(filters);

          try {
            // Change status
            const statusSelect = screen.getByLabelText('Filter by status') as HTMLSelectElement;
            fireEvent.change(statusSelect, { target: { value: newStatus } });

            // Update filters and rerender
            const updatedFilters: TeamFilterState = {
              status: newStatus,
              department: initialDepartment,
            };
            rerender(
              <TeamFilter
                filters={updatedFilters}
                onFilterChange={mockHandlers.onFilterChange}
                onClearFilters={mockHandlers.onClearFilters}
              />
            );

            // Change department
            const departmentSelect = screen.getByLabelText('Filter by department') as HTMLSelectElement;
            fireEvent.change(departmentSelect, { target: { value: newDepartment } });

            // Verify both filters are maintained
            expect(mockHandlers.onFilterChange).toHaveBeenLastCalledWith({
              status: newStatus,
              department: newDepartment,
            });
          } finally {
            cleanup();
            jest.clearAllMocks();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 21: Filter State Persistence
// Test filters persist on navigation
// Validates: Requirements 8.6
// ============================================================================

describe('Feature: management-pages, Property 21: Filter State Persistence', () => {
  it('should maintain filter values when component remounts with same filters', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
        }),
        (filters) => {
          // First render
          const { unmount } = renderTeamFilter(filters);
          
          // Get initial values
          const statusSelect1 = screen.getByLabelText('Filter by status') as HTMLSelectElement;
          const departmentSelect1 = screen.getByLabelText('Filter by department') as HTMLSelectElement;
          const initialStatus = statusSelect1.value;
          const initialDepartment = departmentSelect1.value;

          // Unmount (simulate navigation away)
          unmount();

          // Remount with same filters (simulate navigation back) - Requirement 8.6
          renderTeamFilter(filters);

          try {
            // Verify filters are preserved
            const statusSelect2 = screen.getByLabelText('Filter by status') as HTMLSelectElement;
            const departmentSelect2 = screen.getByLabelText('Filter by department') as HTMLSelectElement;

            expect(statusSelect2.value).toBe(initialStatus);
            expect(departmentSelect2.value).toBe(initialDepartment);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve active filter indicators across remounts', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
        }).filter(filters => filters.status !== 'all' || filters.department !== 'all'),
        (filters) => {
          // First render
          const { unmount } = renderTeamFilter(filters);

          // Check for active indicators
          const hasStatusIndicator = filters.status !== 'all';
          const hasDepartmentIndicator = filters.department !== 'all';

          // Unmount
          unmount();

          // Remount with same filters - Requirement 8.6
          renderTeamFilter(filters);

          try {
            // Verify indicators are still present
            if (hasStatusIndicator) {
              const statusIndicator = screen.getByText(
                `Status: ${filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}`
              );
              expect(statusIndicator).toBeInTheDocument();
            }

            if (hasDepartmentIndicator) {
              const departmentIndicator = screen.getByText(`Department: ${filters.department}`);
              expect(departmentIndicator).toBeInTheDocument();
            }
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve "Clear All" button visibility across remounts', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
        }),
        (filters) => {
          // First render
          const { unmount } = renderTeamFilter(filters);

          // Check if Clear All button should be visible
          const shouldShowClearAll = filters.status !== 'all' || filters.department !== 'all';
          const clearButton1 = screen.queryByText('Clear All');
          const wasVisible = clearButton1 !== null;

          expect(wasVisible).toBe(shouldShowClearAll);

          // Unmount
          unmount();

          // Remount with same filters - Requirement 8.6
          renderTeamFilter(filters);

          try {
            // Verify Clear All button visibility is preserved
            const clearButton2 = screen.queryByText('Clear All');
            const isVisible = clearButton2 !== null;

            expect(isVisible).toBe(shouldShowClearAll);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain filter functionality after remount', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialStatus: generators.status(),
          initialDepartment: generators.department(),
          newStatus: generators.status(),
        }),
        ({ initialStatus, initialDepartment, newStatus }) => {
          const filters: TeamFilterState = {
            status: initialStatus,
            department: initialDepartment,
          };

          // First render
          const { unmount } = renderTeamFilter(filters);

          // Unmount
          unmount();

          // Remount with same filters - Requirement 8.6
          renderTeamFilter(filters);

          try {
            // Verify filter still works after remount
            const statusSelect = screen.getByLabelText('Filter by status') as HTMLSelectElement;
            fireEvent.change(statusSelect, { target: { value: newStatus } });

            // Verify onFilterChange is still called correctly
            expect(mockHandlers.onFilterChange).toHaveBeenCalledWith({
              status: newStatus,
              department: initialDepartment,
            });
          } finally {
            cleanup();
            jest.clearAllMocks();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve available departments list across remounts', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
          availableDepartments: generators.departmentList(),
        }).filter(({ availableDepartments }) => availableDepartments.length > 0),
        ({ status, department, availableDepartments }) => {
          const filters: TeamFilterState = { status, department };

          // First render
          const { unmount } = renderTeamFilter(filters, availableDepartments);

          // Get initial department options
          const departmentSelect1 = screen.getByLabelText('Filter by department') as HTMLSelectElement;
          const initialOptions = Array.from(departmentSelect1.options).map(opt => opt.value);

          // Unmount
          unmount();

          // Remount with same filters and departments - Requirement 8.6
          renderTeamFilter(filters, availableDepartments);

          try {
            // Verify department options are preserved
            const departmentSelect2 = screen.getByLabelText('Filter by department') as HTMLSelectElement;
            const remountedOptions = Array.from(departmentSelect2.options).map(opt => opt.value);

            expect(remountedOptions).toEqual(initialOptions);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle filter state changes and persist new state on remount', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialStatus: generators.status(),
          initialDepartment: generators.department(),
          updatedStatus: generators.status(),
          updatedDepartment: generators.department(),
        }),
        ({ initialStatus, initialDepartment, updatedStatus, updatedDepartment }) => {
          const initialFilters: TeamFilterState = {
            status: initialStatus,
            department: initialDepartment,
          };

          // First render
          const { unmount } = renderTeamFilter(initialFilters);

          // Unmount
          unmount();

          // Remount with updated filters (simulating navigation back with persisted state) - Requirement 8.6
          const updatedFilters: TeamFilterState = {
            status: updatedStatus,
            department: updatedDepartment,
          };
          renderTeamFilter(updatedFilters);

          try {
            // Verify new filter state is displayed
            const statusSelect = screen.getByLabelText('Filter by status') as HTMLSelectElement;
            const departmentSelect = screen.getByLabelText('Filter by department') as HTMLSelectElement;

            expect(statusSelect.value).toBe(updatedStatus);
            expect(departmentSelect.value).toBe(updatedDepartment);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain accessibility attributes across remounts', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: generators.status(),
          department: generators.department(),
        }),
        (filters) => {
          // First render
          const { unmount } = renderTeamFilter(filters);

          // Unmount
          unmount();

          // Remount - Requirement 8.6
          renderTeamFilter(filters);

          try {
            // Verify accessibility attributes are preserved
            const statusSelect = screen.getByLabelText('Filter by status');
            expect(statusSelect).toHaveAttribute('aria-label', 'Filter by status');

            const departmentSelect = screen.getByLabelText('Filter by department');
            expect(departmentSelect).toHaveAttribute('aria-label', 'Filter by department');

            // Verify filter indicators have remove buttons with aria-labels
            if (filters.status !== 'all') {
              const removeButton = screen.getByLabelText('Remove status filter');
              expect(removeButton).toBeInTheDocument();
            }

            if (filters.department !== 'all') {
              const removeButton = screen.getByLabelText('Remove department filter');
              expect(removeButton).toBeInTheDocument();
            }
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
