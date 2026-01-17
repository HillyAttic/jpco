# Team Components

This directory contains components for team management functionality.

## TeamCard

The `TeamCard` component displays team information in a card format with comprehensive details and actions.

### Features

- **Team Information Display** (Requirement 4.3):
  - Team name
  - Description (truncated to 2 lines)
  - Member count
  - Team leader name
  - Department (optional)

- **Status Badge** (Requirement 4.7):
  - Visual indicator for team status (active, inactive, archived)
  - Color-coded badges (green for active, yellow for inactive, gray for archived)

- **Member Avatar Previews** (Requirement 4.8):
  - Displays first 5 member avatars
  - Shows overflow count indicator (+N) when more than 5 members
  - Initials fallback when no avatar image provided

- **Action Buttons**:
  - Edit button (pencil icon)
  - Delete button (trash icon)
  - Buttons appear on hover for clean UI

- **Interactive**:
  - Entire card is clickable to view team details
  - Action buttons prevent event propagation

### Usage

```tsx
import { TeamCard } from '@/components/teams';
import { Team } from '@/services/team.service';

function TeamsPage() {
  const handleEdit = (team: Team) => {
    // Open edit modal
  };

  const handleDelete = (id: string) => {
    // Show confirmation and delete
  };

  const handleViewDetails = (id: string) => {
    // Navigate to team details or open detail modal
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
        />
      ))}
    </div>
  );
}
```

### Props

```typescript
interface TeamCardProps {
  team: Team;                           // Team data object
  onEdit: (team: Team) => void;         // Called when edit button clicked
  onDelete: (id: string) => void;       // Called when delete button clicked
  onViewDetails: (id: string) => void;  // Called when card is clicked
}
```

### Team Interface

```typescript
interface Team {
  id?: string;
  name: string;
  description: string;
  leaderId: string;
  leaderName: string;
  members: TeamMember[];
  department?: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt?: Date;
  updatedAt?: Date;
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}
```

### Styling

The component uses:
- Tailwind CSS for styling
- Hover effects for interactive elements
- Responsive design (works on mobile and desktop)
- Group hover for action buttons
- Smooth transitions

### Accessibility

- ARIA labels on action buttons
- Semantic HTML structure
- Keyboard accessible
- Screen reader friendly
- Proper focus indicators

### Requirements Validation

- ✅ Requirement 4.3: Displays team name, description, member count, and team leader
- ✅ Requirement 4.7: Shows status badge with appropriate styling
- ✅ Requirement 4.8: Shows first 5 member avatars with overflow count indicator
