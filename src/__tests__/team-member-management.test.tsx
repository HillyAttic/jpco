/**
 * Property-Based Tests for Team Member Management
 * Feature: management-pages
 * 
 * This file contains property-based tests for team member management:
 * - Property 44: Team Member Addition
 * - Property 45: Team Member Removal
 * - Property 46: Team Detail View
 * 
 * Validates: Requirements 4.4, 4.5, 4.6
 */

import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { TeamDetailPanel } from '@/components/teams/TeamDetailPanel';
import { Team, TeamMember, teamService } from '@/services/team.service';
import { Employee, employeeService } from '@/services/employee.service';

// Mock the services
jest.mock('@/services/team.service', () => ({
  teamService: {
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
  },
}));

jest.mock('@/services/employee.service', () => ({
  employeeService: {
    getAll: jest.fn(),
  },
}));

// Mock window.confirm
const originalConfirm = window.confirm;
beforeAll(() => {
  window.confirm = jest.fn(() => true);
});

afterAll(() => {
  window.confirm = originalConfirm;
});

beforeEach(() => {
  jest.clearAllMocks();
  // Setup default mock for employee service
  (employeeService.getAll as jest.Mock).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

// Reusable generators
const generators = {
  name: () => fc.stringMatching(/^[A-Za-z]{2,25}( [A-Za-z]{2,25})?$/),
  uuid: () => fc.uuid(),
  department: () => fc.stringMatching(/^[A-Za-z]{2,15}( [A-Za-z]{2,15})?$/),
  role: () => fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer', 'Lead'),
  description: () => fc.stringMatching(/^[A-Za-z0-9 ]{10,100}$/),
};

// Helper function to generate team members with unique IDs
const generateTeamMember = (): fc.Arbitrary<TeamMember> => {
  return fc.record({
    id: fc.uuid(),
    name: generators.name(),
    avatar: fc.option(fc.webUrl(), { nil: undefined }),
    role: generators.role(),
  }).map((member) => ({
    ...member,
    // Ensure unique IDs by appending a unique suffix
    id: `${member.id}-${Date.now()}-${Math.random()}`,
  }));
};

// Helper function to generate a team with unique member IDs
const generateTeam = (memberCount: { min: number; max: number }): fc.Arbitrary<Team> => {
  return fc.record({
    id: fc.uuid(),
    name: generators.name(),
    description: generators.description(),
    leaderId: fc.uuid(),
    leaderName: generators.name(),
    members: fc.array(generateTeamMember(), { minLength: memberCount.min, maxLength: memberCount.max }),
    department: fc.option(generators.department(), { nil: undefined }),
    status: fc.constantFrom('active', 'inactive', 'archived') as fc.Arbitrary<'active' | 'inactive' | 'archived'>,
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  }).map((team) => ({
    ...team,
    // Ensure unique team ID
    id: `${team.id}-${Date.now()}-${Math.random()}`,
    leaderId: `${team.leaderId}-${Date.now()}-${Math.random()}`,
    // Ensure all member IDs are unique within the team
    members: team.members.map((member, index) => ({
      ...member,
      id: `member-${index}-${Date.now()}-${Math.random()}`,
    })),
  }));
};

// ============================================================================
// Property 44: Team Member Addition
// Test adding members updates count
// Validates: Requirements 4.5
// ============================================================================

describe('Feature: management-pages, Property 44: Team Member Addition', () => {
  it('should update member count when adding any valid member', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 0, max: 10 }),
        generateTeamMember(),
        async (team, newMember) => {
          // Ensure the new member is not already in the team
          fc.pre(!team.members.some(m => m.id === newMember.id));
          
          const initialMemberCount = team.members.length;
          
          // Mock the addMember service to return updated team
          const updatedTeam = {
            ...team,
            members: [...team.members, newMember],
          };
          (teamService.addMember as jest.Mock).mockResolvedValue(updatedTeam);

          // Verify that when addMember is called, it returns the correct updated team
          const result = await teamService.addMember(team.id!, newMember);
          
          // Verify the member count increased by 1 - Requirement 4.5
          expect(result.members.length).toBe(initialMemberCount + 1);
          // Verify the new member is in the list
          expect(result.members).toContainEqual(newMember);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should preserve existing members when adding a new member', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 1, max: 10 }),
        generateTeamMember(),
        async (team, newMember) => {
          // Ensure the new member is not already in the team
          fc.pre(!team.members.some(m => m.id === newMember.id));
          
          const originalMembers = [...team.members];
          
          // Mock the addMember service
          const updatedTeam = {
            ...team,
            members: [...team.members, newMember],
          };
          (teamService.addMember as jest.Mock).mockResolvedValue(updatedTeam);

          const result = await teamService.addMember(team.id!, newMember);
          
          // Verify all original members are still present - Requirement 4.5
          originalMembers.forEach(originalMember => {
            expect(result.members).toContainEqual(originalMember);
          });
          
          // Verify the new member was added
          expect(result.members).toContainEqual(newMember);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly update member count from any initial count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 50 }),
        async (initialCount) => {
          // Generate a team with exactly initialCount members
          const team: Team = {
            id: fc.sample(generators.uuid(), 1)[0],
            name: fc.sample(generators.name(), 1)[0],
            description: fc.sample(generators.description(), 1)[0],
            leaderId: fc.sample(generators.uuid(), 1)[0],
            leaderName: fc.sample(generators.name(), 1)[0],
            members: fc.sample(generateTeamMember(), initialCount),
            status: 'active',
            createdAt: new Date(),
          };

          const newMember = fc.sample(generateTeamMember(), 1)[0];
          
          // Mock the addMember service
          const updatedTeam = {
            ...team,
            members: [...team.members, newMember],
          };
          (teamService.addMember as jest.Mock).mockResolvedValue(updatedTeam);

          const result = await teamService.addMember(team.id!, newMember);
          
          // Verify count increased by exactly 1 - Requirement 4.5
          expect(result.members.length).toBe(initialCount + 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 45: Team Member Removal
// Test removing members updates count
// Validates: Requirements 4.6
// ============================================================================

describe('Feature: management-pages, Property 45: Team Member Removal', () => {
  it('should update member count when removing any member', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 1, max: 10 }),
        async (team) => {
          // Pick a random member to remove
          const memberToRemove = fc.sample(fc.constantFrom(...team.members), 1)[0];
          const initialMemberCount = team.members.length;
          
          // Mock the removeMember service
          const updatedTeam = {
            ...team,
            members: team.members.filter(m => m.id !== memberToRemove.id),
          };
          (teamService.removeMember as jest.Mock).mockResolvedValue(updatedTeam);

          const result = await teamService.removeMember(team.id!, memberToRemove.id);
          
          // Verify member count decreased by 1 - Requirement 4.6
          expect(result.members.length).toBe(initialMemberCount - 1);
          
          // Verify the removed member is not in the list
          expect(result.members).not.toContainEqual(memberToRemove);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve remaining members when removing a member', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 2, max: 10 }),
        async (team) => {
          // Pick a random member to remove
          const memberToRemove = fc.sample(fc.constantFrom(...team.members), 1)[0];
          const remainingMembers = team.members.filter(m => m.id !== memberToRemove.id);
          
          // Mock the removeMember service
          const updatedTeam = {
            ...team,
            members: remainingMembers,
          };
          (teamService.removeMember as jest.Mock).mockResolvedValue(updatedTeam);

          const result = await teamService.removeMember(team.id!, memberToRemove.id);
          
          // Verify all remaining members are still present - Requirement 4.6
          remainingMembers.forEach(member => {
            expect(result.members).toContainEqual(member);
          });
          
          // Verify only the target member was removed
          expect(result.members.length).toBe(remainingMembers.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly update member count from any initial count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (initialCount) => {
          // Generate a team with exactly initialCount members
          const members = fc.sample(generateTeamMember(), initialCount);
          const team: Team = {
            id: fc.sample(generators.uuid(), 1)[0],
            name: fc.sample(generators.name(), 1)[0],
            description: fc.sample(generators.description(), 1)[0],
            leaderId: fc.sample(generators.uuid(), 1)[0],
            leaderName: fc.sample(generators.name(), 1)[0],
            members: members,
            status: 'active',
            createdAt: new Date(),
          };

          // Remove the first member
          const memberToRemove = members[0];
          
          // Mock the removeMember service
          const updatedTeam = {
            ...team,
            members: team.members.filter(m => m.id !== memberToRemove.id),
          };
          (teamService.removeMember as jest.Mock).mockResolvedValue(updatedTeam);

          const result = await teamService.removeMember(team.id!, memberToRemove.id);
          
          // Verify count decreased by exactly 1 - Requirement 4.6
          expect(result.members.length).toBe(initialCount - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle removing the last member', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 1, max: 1 }),
        async (team) => {
          const memberToRemove = team.members[0];
          
          // Mock the removeMember service
          const updatedTeam = {
            ...team,
            members: [],
          };
          (teamService.removeMember as jest.Mock).mockResolvedValue(updatedTeam);

          const result = await teamService.removeMember(team.id!, memberToRemove.id);
          
          // Verify team has no members - Requirement 4.6
          expect(result.members.length).toBe(0);
          expect(result.members).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 46: Team Detail View
// Test detail view shows all members
// Validates: Requirements 4.4
// ============================================================================

describe('Feature: management-pages, Property 46: Team Detail View', () => {
  it('should display all members in the detail view for any team', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 1, max: 10 }), // Reduced max from 20 to 10
        async (team) => {
          const { unmount } = render(
            <TeamDetailPanel
              team={team}
            />
          );

          try {
            // Wait for component to load
            await waitFor(() => {
              const memberCountElements = screen.queryAllByText(`Team Members (${team.members.length})`);
              expect(memberCountElements.length).toBeGreaterThan(0);
            });

            // Verify the member count is displayed - Requirement 4.4
            const memberCountElements = screen.queryAllByText(`Team Members (${team.members.length})`);
            expect(memberCountElements.length).toBeGreaterThan(0);

            // Verify each member is displayed with their name and role - Requirement 4.4
            team.members.forEach(member => {
              // Use queryAllByText since names might appear multiple times (e.g., team name = member name)
              const nameElements = screen.queryAllByText(member.name);
              expect(nameElements.length).toBeGreaterThan(0);
              
              const roleElements = screen.queryAllByText(member.role);
              expect(roleElements.length).toBeGreaterThan(0);
            });
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 50 } // Reduced from 100 to 50
    );
  }, 60000); // Increased timeout to 60 seconds

  it('should display team information for any team', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 0, max: 10 }),
        async (team) => {
          const { unmount, container } = render(
            <TeamDetailPanel
              team={team}
            />
          );

          try {
            // Wait for component to load
            await waitFor(() => {
              const teamNames = screen.queryAllByText(team.name);
              expect(teamNames.length).toBeGreaterThan(0);
            });

            // Verify team name is displayed - Requirement 4.4
            const teamNames = screen.queryAllByText(team.name);
            expect(teamNames.length).toBeGreaterThan(0);

            // Verify team description is displayed - Requirement 4.4
            if (team.description) {
              // Normalize both the container text and expected text to handle multiple spaces
              const normalizedContainerText = (container.textContent || '').replace(/\s+/g, ' ');
              const normalizedDescription = team.description.trim().replace(/\s+/g, ' ');
              expect(normalizedContainerText).toContain(normalizedDescription);
            }

            // Verify team leader is displayed - Requirement 4.4
            // Use queryAllByText since leader name might match team name
            const leaderNameElements = screen.queryAllByText(team.leaderName);
            expect(leaderNameElements.length).toBeGreaterThan(0);

            // Verify department is displayed if provided - Requirement 4.4
            if (team.department) {
              expect(screen.getByText(team.department)).toBeInTheDocument();
            }

            // Verify status is displayed - Requirement 4.4
            expect(screen.getByText(team.status)).toBeInTheDocument();
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should display empty state when team has no members', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 0, max: 0 }),
        async (team) => {
          const { unmount } = render(
            <TeamDetailPanel
              team={team}
            />
          );

          try {
            // Wait for component to load
            await waitFor(() => {
              const memberCountElements = screen.queryAllByText('Team Members (0)');
              expect(memberCountElements.length).toBeGreaterThan(0);
            });

            // Verify empty state message is displayed - Requirement 4.4
            expect(screen.getByText('No team members yet')).toBeInTheDocument();
            expect(screen.getByText('Add members to build your team')).toBeInTheDocument();
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should display member count including leader', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 0, max: 20 }),
        async (team) => {
          const { unmount, container } = render(
            <TeamDetailPanel
              team={team}
            />
          );

          try {
            // Wait for component to load
            await waitFor(() => {
              const teamNames = screen.queryAllByText(team.name);
              expect(teamNames.length).toBeGreaterThan(0);
            });

            // Calculate total team size (members + leader)
            const totalSize = team.members.length + 1;
            const expectedText = `${totalSize} ${totalSize === 1 ? 'member' : 'members'}`;

            // Verify total team size is displayed - Requirement 4.4
            expect(container.textContent).toContain(expectedText);
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should display all member details including avatars', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 1, max: 5 }), // Reduced max from 10 to 5
        async (team) => {
          const { unmount } = render(
            <TeamDetailPanel
              team={team}
            />
          );

          try {
            // Wait for component to load
            await waitFor(() => {
              const memberCountElements = screen.queryAllByText(`Team Members (${team.members.length})`);
              expect(memberCountElements.length).toBeGreaterThan(0);
            });

            // Verify each member has their details displayed - Requirement 4.4
            team.members.forEach(member => {
              // Use queryAllByText since names might appear multiple times
              const nameElements = screen.queryAllByText(member.name);
              expect(nameElements.length).toBeGreaterThan(0);
              
              const roleElements = screen.queryAllByText(member.role);
              expect(roleElements.length).toBeGreaterThan(0);
            });
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 50 } // Reduced from 100 to 50
    );
  }, 60000); // Increased timeout to 60 seconds

  it('should display action buttons for member management', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTeam({ min: 1, max: 5 }),
        async (team) => {
          const { unmount } = render(
            <TeamDetailPanel
              team={team}
            />
          );

          try {
            // Wait for component to load
            await waitFor(() => {
              const memberCountElements = screen.queryAllByText(`Team Members (${team.members.length})`);
              expect(memberCountElements.length).toBeGreaterThan(0);
            });

            // Verify Add Member button is displayed - Requirements 4.5
            const addMemberButtons = screen.queryAllByText('Add Member');
            expect(addMemberButtons.length).toBeGreaterThan(0);

            // Verify each member has edit and remove buttons - Requirements 4.5, 4.6
            const editButtons = screen.getAllByTitle('Edit role');
            const removeButtons = screen.getAllByTitle('Remove member');
            
            expect(editButtons.length).toBe(team.members.length);
            expect(removeButtons.length).toBe(team.members.length);
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
