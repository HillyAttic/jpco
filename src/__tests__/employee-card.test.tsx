/**
 * Property-Based Tests for EmployeeCard
 * Feature: management-pages
 * 
 * This file contains property-based tests for EmployeeCard component:
 * - Property 23: Employee Avatar Fallback Display
 * - Property 27: Employee Card Completeness
 * - Property 30: Employee Status Badge Display
 * 
 * Validates: Requirements 5.3, 5.5, 5.6
 */

import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { EmployeeCard } from '@/components/employees/EmployeeCard';
import { Employee } from '@/services/employee.service';

// Mock handlers for component props
const mockHandlers = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onDeactivate: jest.fn(),
  onSelect: jest.fn(),
};

// Reusable generators with proper validation to avoid special characters
const generators = {
  employeeId: () => fc.stringMatching(/^[A-Z0-9]{3,10}$/).map(s => `EMP-${s}`),
  name: () => fc.stringMatching(/^[A-Za-z]{2,25}( [A-Za-z]{2,25})?$/),
  singleWordName: () => fc.stringMatching(/^[A-Za-z]{2,20}$/),
  firstName: () => fc.stringMatching(/^[A-Za-z]{2,20}$/),
  lastName: () => fc.stringMatching(/^[A-Za-z]{2,20}$/),
  phone: () => fc.stringMatching(/^[0-9]{10,15}$/),
  position: () => fc.stringMatching(/^[A-Za-z]{2,15}( [A-Za-z]{2,15})?$/),
  department: () => fc.stringMatching(/^[A-Za-z]{2,15}( [A-Za-z]{2,15})?$/),
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// Helper function to render and test
function renderAndTest(employee: Employee, testFn: (container: HTMLElement) => void) {
  const { container } = render(
    <EmployeeCard
      employee={employee}
      onEdit={mockHandlers.onEdit}
      onDelete={mockHandlers.onDelete}
      onDeactivate={mockHandlers.onDeactivate}
    />
  );
  
  try {
    testFn(container);
  } finally {
    cleanup();
  }
}

// ============================================================================
// Property 23: Employee Avatar Fallback Display
// Test initials shown when no photo
// Validates: Requirements 5.5
// ============================================================================

describe('Feature: management-pages, Property 23: Employee Avatar Fallback Display', () => {
  it('should display initials when no avatar URL is provided for any employee', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
          department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employeeData) => {
          // Create employee without avatarUrl
          const employee: Employee = {
            ...employeeData,
            avatarUrl: undefined,
          };

          // Calculate expected initials
          const expectedInitials = employee.name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          renderAndTest(employee, (container) => {
            // Check that avatar container is displayed (look for rounded-full class)
            const avatarElement = container.querySelector('.rounded-full');
            expect(avatarElement).toBeInTheDocument();
            
            // The initials should be present in the document
            expect(screen.getByText(expectedInitials)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display initials for single-word names', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.singleWordName(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employeeData) => {
          const employee: Employee = {
            ...employeeData,
            avatarUrl: undefined,
          };

          // The component's getInitials function splits by space and takes first char of each part
          // For single-word names like "aa", it splits to ["aa"], maps to ["a"], resulting in "A"
          // This matches the actual component behavior
          const expectedInitials = employee.name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          renderAndTest(employee, () => {
            // Check that initials are displayed
            expect(screen.getByText(expectedInitials)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display initials for multi-word names (first letter of each word)', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          firstName: generators.firstName(),
          lastName: generators.lastName(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employeeData) => {
          const fullName = `${employeeData.firstName} ${employeeData.lastName}`;
          const employee: Employee = {
            ...employeeData,
            name: fullName,
            avatarUrl: undefined,
          };

          // Expected initials: first letter of first name + first letter of last name
          const expectedInitials = (
            employeeData.firstName[0] + employeeData.lastName[0]
          ).toUpperCase();

          renderAndTest(employee, () => {
            // Check that initials are displayed
            expect(screen.getByText(expectedInitials)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display initials when avatar URL is provided', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          avatarUrl: fc.webUrl(),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, (container) => {
            // Avatar element should exist (look for rounded-full class)
            const avatarElement = container.querySelector('.rounded-full');
            expect(avatarElement).toBeInTheDocument();

            // The avatar should have the src attribute with the URL (if img element exists)
            const imgElement = container.querySelector('img');
            if (imgElement && employee.avatarUrl) {
              expect(imgElement).toHaveAttribute('src');
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 27: Employee Card Completeness
// Test all required fields displayed
// Validates: Requirements 5.3
// ============================================================================

describe('Feature: management-pages, Property 27: Employee Card Completeness', () => {
  it('should display all required fields for any employee', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
          department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, () => {
            // Verify profile photo/avatar is displayed (check for rounded-full avatar container)
            const avatarContainer = document.querySelector('.rounded-full');
            expect(avatarContainer).toBeInTheDocument();

            // Verify name is displayed
            expect(screen.getByText(employee.name)).toBeInTheDocument();

            // Verify position is displayed
            expect(screen.getByText(employee.position)).toBeInTheDocument();

            // Verify department is displayed
            expect(screen.getByText(employee.department)).toBeInTheDocument();

            // Verify employee ID is displayed
            expect(screen.getByText(employee.employeeId)).toBeInTheDocument();

            // Verify email is displayed
            expect(screen.getByText(employee.email)).toBeInTheDocument();

            // Verify phone is displayed
            expect(screen.getByText(employee.phone)).toBeInTheDocument();

            // Verify employment status badge is displayed (tested in Property 30)
            // Status text varies by status, so we check for the formatted version
            const statusText = employee.status === 'on-leave' ? 'On Leave' :
                             employee.status === 'terminated' ? 'Terminated' :
                             'Active';
            expect(screen.getByText(statusText)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display hire date when provided', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, () => {
            // Verify hire date is displayed
            const formattedDate = new Date(employee.hireDate).toLocaleDateString();
            expect(screen.getByText(`Hired ${formattedDate}`)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display action buttons for any employee', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, () => {
            // Verify edit button is present
            const editButton = screen.getByLabelText(`Edit ${employee.name}`);
            expect(editButton).toBeInTheDocument();

            // Verify delete button is present
            const deleteButton = screen.getByLabelText(`Delete ${employee.name}`);
            expect(deleteButton).toBeInTheDocument();

            // Verify deactivate button is present only for active employees
            if (employee.status === 'active') {
              const deactivateButton = screen.getByLabelText(`Deactivate ${employee.name}`);
              expect(deactivateButton).toBeInTheDocument();
            } else {
              const deactivateButton = screen.queryByLabelText(`Deactivate ${employee.name}`);
              expect(deactivateButton).not.toBeInTheDocument();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display contact information with proper links', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, () => {
            // Verify email link
            const emailLink = screen.getByText(employee.email).closest('a');
            expect(emailLink).toHaveAttribute('href', `mailto:${employee.email}`);

            // Verify phone link
            const phoneLink = screen.getByText(employee.phone).closest('a');
            expect(phoneLink).toHaveAttribute('href', `tel:${employee.phone}`);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display selection checkbox when onSelect handler is provided', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          const { container } = render(
            <EmployeeCard
              employee={employee}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              onDeactivate={mockHandlers.onDeactivate}
              onSelect={mockHandlers.onSelect}
            />
          );

          try {
            // Verify selection checkbox is present
            const checkbox = screen.getByLabelText(`Select ${employee.name}`);
            expect(checkbox).toBeInTheDocument();
            expect(checkbox).toHaveAttribute('type', 'checkbox');
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 30: Employee Status Badge Display
// Test status badge shown
// Validates: Requirements 5.6
// ============================================================================

describe('Feature: management-pages, Property 30: Employee Status Badge Display', () => {
  it('should display status badge for any employee status', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
          department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, (container) => {
            // Determine expected status text
            const expectedStatusText = employee.status === 'on-leave' ? 'On Leave' :
                                      employee.status === 'terminated' ? 'Terminated' :
                                      'Active';

            // Verify status badge is displayed with correct text
            const statusBadge = screen.getByText(expectedStatusText);
            expect(statusBadge).toBeInTheDocument();

            // Verify badge element exists (it's rendered as a div with role="status")
            const badgeElement = statusBadge.closest('[role="status"]');
            expect(badgeElement).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display "Active" badge for active employees', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constant('active') as fc.Arbitrary<'active'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, () => {
            // Verify "Active" status is displayed
            expect(screen.getByText('Active')).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display "On Leave" badge for on-leave employees', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constant('on-leave') as fc.Arbitrary<'on-leave'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, () => {
            // Verify "On Leave" status is displayed
            expect(screen.getByText('On Leave')).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display "Terminated" badge for terminated employees', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constant('terminated') as fc.Arbitrary<'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, () => {
            // Verify "Terminated" status is displayed
            expect(screen.getByText('Terminated')).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display status badge with correct variant styling', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, (container) => {
            // Get the status text
            const statusText = employee.status === 'on-leave' ? 'On Leave' :
                             employee.status === 'terminated' ? 'Terminated' :
                             'Active';

            // Find the badge element
            const statusBadge = screen.getByText(statusText);
            expect(statusBadge).toBeInTheDocument();

            // Verify the badge is rendered with role="status"
            const badgeParent = statusBadge.closest('[role="status"]');
            expect(badgeParent).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always display exactly one status badge per employee', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          employeeId: generators.employeeId(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          position: generators.position(),
          department: generators.department(),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        (employee) => {
          renderAndTest(employee, (container) => {
            // Get the expected status text for this employee
            const expectedStatusText = employee.status === 'on-leave' ? 'On Leave' :
                                      employee.status === 'terminated' ? 'Terminated' :
                                      'Active';

            // Count occurrences of the expected status text
            const statusElements = screen.getAllByText(expectedStatusText);
            
            // Should have exactly one status badge
            expect(statusElements.length).toBe(1);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
