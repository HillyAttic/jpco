/**
 * Property-Based Tests for TeamCard
 * Feature: management-pages
 * 
 * This file contains property-based tests for TeamCard component:
 * - Property 26: Team Card Completeness
 * - Property 29: Team Status Badge Display
 * - Property 32: Team Member Avatar Limit
 * 
 * Validates: Requirements 4.3, 4.7, 4.8
 */

import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { TeamCard } from '@/components/teams/TeamCard';
import { Team, TeamMember } from '@/services/team.service';

// Mock handlers for component props
const mockHandlers = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onViewDetails: jest.fn(),
  onSelect: jest.fn(),
};

// Reusable generators with proper validation
const generators = {
  name: () => fc.stringMatching(/^[A-Za-z]{2,25}( [A-Za-z]{2,25})?$/),
  singleWordName: () => fc.stringMatching(/^[A-Za-z]{2,20}$/),
  firstName: () => fc.stringMatching(/^[A-Za-z]{2,20}$/),
  lastName: () => fc.stringMatching(/^[A-Za-z]{2,20}$/),
  department: () => fc.stringMatching(/^[A-Za-z]{2,15}( [A-Za-z]{2,15})?$/),
  role: () => fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer', 'Lead'),
  description: () => fc.stringMatching(/^[A-Za-z0-9 ]{10,100}$/),
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// Helper function to generate team members
const generateTeamMember = (): fc.Arbitrary<TeamMember> => {
  return fc.record({
    id: fc.uuid(),
    name: generators.name(),
    avatar: fc.option(fc.webUrl(), { nil: undefined }),
    role: generators.role(),
  });
};

// Helper function to render and test
function renderAndTest(team: Team, testFn: (container: HTMLElement) => void) {
  const { container } = render(
    <TeamCard
      team={team}
      onEdit={mockHandlers.onEdit}
      onDelete={mockHandlers.onDelete}
      onViewDetails={mockHandlers.onViewDetails}
    />
  );
  
  try {
    testFn(container);
  } finally {
    cleanup();
  }
}

// ============================================================================
// Property 26: Team Card Completeness
// Test all required fields displayed
// Validates: Requirements 4.3
// ============================================================================

describe('Feature: management-pages, Property 26: Team Card Completeness', () => {
  it('should display all required fields for any team', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 0, maxLength: 10 }),
          department: fc.option(generators.department(), { nil: undefined }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (team) => {
          renderAndTest(team, () => {
            // Verify team name is displayed - Requirement 4.3
            expect(screen.getByText(team.name)).toBeInTheDocument();

            // Verify description is displayed - Requirement 4.3
            if (team.description) {
              // Use a flexible matcher to handle text normalization (multiple spaces become single spaces)
              const normalizedDescription = team.description.trim().replace(/\s+/g, ' ');
              expect(screen.getByText(normalizedDescription)).toBeInTheDocument();
            }

            // Verify member count is displayed - Requirement 4.3
            const memberCount = team.members.length;
            const memberText = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;
            expect(screen.getByText(memberText)).toBeInTheDocument();

            // Verify team leader name is displayed - Requirement 4.3
            expect(screen.getByText(team.leaderName)).toBeInTheDocument();

            // Verify department is displayed if provided
            if (team.department) {
              expect(screen.getByText(team.department)).toBeInTheDocument();
            }

            // Verify status badge is displayed (tested in Property 29)
            // Status is displayed in lowercase in the badge
            expect(screen.getByText(team.status)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display action buttons for any team', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 0, maxLength: 10 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          renderAndTest(team, () => {
            // Verify edit button is present
            const editButton = screen.getByLabelText(`Edit ${team.name}`);
            expect(editButton).toBeInTheDocument();

            // Verify delete button is present
            const deleteButton = screen.getByLabelText(`Delete ${team.name}`);
            expect(deleteButton).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display member avatar previews when team has members', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 1, maxLength: 10 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          renderAndTest(team, (container) => {
            // Verify member avatar section is displayed
            expect(screen.getByText('Team:')).toBeInTheDocument();

            // Verify avatars are rendered (look for rounded-full class which is used for avatars)
            const avatars = container.querySelectorAll('.rounded-full');
            expect(avatars.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display member avatar section when team has no members', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.constant([]) as fc.Arbitrary<TeamMember[]>,
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          renderAndTest(team, () => {
            // Verify member avatar section is not displayed
            expect(screen.queryByText('Team:')).not.toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display creation date when provided', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 0, maxLength: 10 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (team) => {
          renderAndTest(team, () => {
            // Verify creation date is displayed
            const formattedDate = new Date(team.createdAt!).toLocaleDateString();
            expect(screen.getByText(`Created ${formattedDate}`)).toBeInTheDocument();
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
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 0, maxLength: 10 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          const { container } = render(
            <TeamCard
              team={team}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              onViewDetails={mockHandlers.onViewDetails}
              onSelect={mockHandlers.onSelect}
            />
          );

          try {
            // Verify selection checkbox is present
            const checkbox = screen.getByLabelText(`Select ${team.name}`);
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
// Property 29: Team Status Badge Display
// Test status badge shown
// Validates: Requirements 4.7
// ============================================================================

describe('Feature: management-pages, Property 29: Team Status Badge Display', () => {
  it('should display status badge for any team status', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 0, maxLength: 10 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          renderAndTest(team, (container) => {
            // Status is displayed in lowercase in the badge
            const expectedStatusText = team.status;

            // Verify status badge is displayed with correct text - Requirement 4.7
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

  it('should display "Active" badge for active teams', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 0, maxLength: 10 }),
          status: fc.constant('active') as fc.Arbitrary<'active'>,
        }),
        (team) => {
          renderAndTest(team, () => {
            // Verify "active" status is displayed (lowercase)
            expect(screen.getByText('active')).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display "Inactive" badge for inactive teams', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 0, maxLength: 10 }),
          status: fc.constant('inactive') as fc.Arbitrary<'inactive'>,
        }),
        (team) => {
          renderAndTest(team, () => {
            // Verify "inactive" status is displayed (lowercase)
            expect(screen.getByText('inactive')).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display "Archived" badge for archived teams', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 0, maxLength: 10 }),
          status: fc.constant('archived') as fc.Arbitrary<'archived'>,
        }),
        (team) => {
          renderAndTest(team, () => {
            // Verify "archived" status is displayed (lowercase)
            expect(screen.getByText('archived')).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always display exactly one status badge per team', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 0, maxLength: 10 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          renderAndTest(team, () => {
            // Get the expected status text for this team (lowercase)
            const expectedStatusText = team.status;

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

// ============================================================================
// Property 32: Team Member Avatar Limit
// Test avatar limit and count
// Validates: Requirements 4.8
// ============================================================================

describe('Feature: management-pages, Property 32: Team Member Avatar Limit', () => {
  it('should display exactly 5 member avatars when team has more than 5 members', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 6, maxLength: 20 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          renderAndTest(team, (container) => {
            // Count avatar elements (excluding the +N indicator)
            // Avatars have the Avatar component which renders with rounded-full class
            // The +N indicator also has rounded-full, so we need to be more specific
            const avatarSection = container.querySelector('.flex.-space-x-2');
            expect(avatarSection).toBeInTheDocument();

            // Count children in the avatar section
            // Should be 6 total: 5 avatars + 1 count indicator
            const avatarChildren = avatarSection?.children;
            expect(avatarChildren?.length).toBe(6);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display count indicator showing remaining members when more than 5 members', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 6, maxLength: 20 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          const remainingCount = team.members.length - 5;
          
          renderAndTest(team, () => {
            // Verify count indicator is displayed - Requirement 4.8
            const countIndicator = screen.getByText(`+${remainingCount}`);
            expect(countIndicator).toBeInTheDocument();

            // Verify the title attribute shows the correct message
            const countElement = countIndicator.closest('div');
            const expectedTitle = `${remainingCount} more ${remainingCount === 1 ? 'member' : 'members'}`;
            expect(countElement).toHaveAttribute('title', expectedTitle);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display all member avatars when team has 5 or fewer members', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 1, maxLength: 5 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          renderAndTest(team, (container) => {
            // Count avatar elements
            const avatarSection = container.querySelector('.flex.-space-x-2');
            expect(avatarSection).toBeInTheDocument();

            // Should display exactly as many avatars as members (no +N indicator)
            const avatarChildren = avatarSection?.children;
            expect(avatarChildren?.length).toBe(team.members.length);

            // Verify no count indicator is displayed
            const countIndicatorPattern = /^\+\d+$/;
            const allText = container.textContent || '';
            const hasCountIndicator = allText.match(countIndicatorPattern);
            expect(hasCountIndicator).toBeNull();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display count indicator when team has exactly 5 members', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 5, maxLength: 5 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          renderAndTest(team, (container) => {
            // Verify exactly 5 avatars are displayed
            const avatarSection = container.querySelector('.flex.-space-x-2');
            expect(avatarSection).toBeInTheDocument();
            
            const avatarChildren = avatarSection?.children;
            expect(avatarChildren?.length).toBe(5);

            // Verify no +N indicator is present
            const countIndicatorPattern = /^\+\d+$/;
            const allText = container.textContent || '';
            const hasCountIndicator = allText.match(countIndicatorPattern);
            expect(hasCountIndicator).toBeNull();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display member names in avatar title attributes', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 1, maxLength: 10 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          renderAndTest(team, (container) => {
            // Get the first 5 members (or all if less than 5)
            const displayMembers = team.members.slice(0, 5);

            // Verify each displayed member has their name in a title attribute
            displayMembers.forEach((member) => {
              const avatarWithTitle = container.querySelector(`[title="${member.name}"]`);
              expect(avatarWithTitle).toBeInTheDocument();
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate remaining count correctly for any team size over 5', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          description: generators.description(),
          leaderId: fc.uuid(),
          leaderName: generators.name(),
          members: fc.array(generateTeamMember(), { minLength: 6, maxLength: 50 }),
          status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
        }),
        (team) => {
          const expectedRemainingCount = team.members.length - 5;
          
          renderAndTest(team, () => {
            // Verify the count indicator shows the correct number
            const countIndicator = screen.getByText(`+${expectedRemainingCount}`);
            expect(countIndicator).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
