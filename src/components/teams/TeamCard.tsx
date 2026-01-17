import React from 'react';
import { Team } from '@/services/team.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  PencilSquareIcon, 
  TrashIcon, 
  UserGroupIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface TeamCardProps {
  team: Team;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
  onViewDetails: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

/**
 * TeamCard Component
 * Displays team information in a card format with team name, description, member count,
 * team leader, member avatar previews (first 5 with overflow count), status badge, and action buttons
 * Validates Requirements: 4.3, 4.7, 4.8
 */
export function TeamCard({ team, onEdit, onDelete, onViewDetails, selected = false, onSelect }: TeamCardProps) {
  // Generate initials from name for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get status badge variant - Requirement 4.7
  const getStatusVariant = (status: string): 'success' | 'default' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  // Get member count - Requirement 4.3
  const memberCount = team.members.length;

  // Get first 5 members for avatar display - Requirement 4.8
  const displayMembers = team.members.slice(0, 5);
  const remainingCount = memberCount > 5 ? memberCount - 5 : 0;

  return (
    <Card 
      className={`group hover:shadow-lg transition-all duration-200 cursor-pointer ${selected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={(e) => {
        // Don't trigger view details if clicking checkbox
        if (!(e.target as HTMLElement).closest('input[type="checkbox"]')) {
          onViewDetails(team.id!);
        }
      }}
    >
      <CardContent className="p-6">
        {/* Selection Checkbox */}
        {onSelect && (
          <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(team.id!, e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              aria-label={`Select ${team.name}`}
            />
          </div>
        )}
        
        {/* Header with Team Name and Status Badge */}
        <div className={`flex items-start justify-between mb-4 ${onSelect ? 'ml-8' : ''}`}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {team.name}
              </h3>
              {/* Status Badge - Requirement 4.7 */}
              <Badge variant={getStatusVariant(team.status)}>
                {team.status}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div 
            className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(team)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              aria-label={`Edit ${team.name}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(team.id!)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label={`Delete ${team.name}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Description - Requirement 4.3 */}
        {team.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {team.description}
          </p>
        )}

        {/* Team Details */}
        <div className="space-y-3 mb-4">
          {/* Team Leader - Requirement 4.3 */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UserIcon className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-gray-700">Leader:</span>
            <span className="truncate">{team.leaderName}</span>
          </div>

          {/* Member Count - Requirement 4.3 */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UserGroupIcon className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-gray-700">Members:</span>
            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
          </div>

          {/* Department */}
          {team.department && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium text-gray-700">Department:</span>
              <span className="truncate">{team.department}</span>
            </div>
          )}
        </div>

        {/* Member Avatar Previews - Requirement 4.8 */}
        {memberCount > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Team:</span>
              <div className="flex -space-x-2">
                {/* Display first 5 member avatars */}
                {displayMembers.map((member) => (
                  <Avatar
                    key={member.id}
                    src={member.avatar}
                    alt={member.name}
                    fallback={getInitials(member.name)}
                    size="sm"
                    className="border-2 border-white"
                    title={member.name}
                  />
                ))}
                {/* Show count indicator for additional members - Requirement 4.8 */}
                {remainingCount > 0 && (
                  <div 
                    className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                    title={`${remainingCount} more ${remainingCount === 1 ? 'member' : 'members'}`}
                  >
                    +{remainingCount}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer with creation date */}
        {team.createdAt && (
          <div className="mt-4 pt-4 border-t text-xs text-gray-500">
            Created {new Date(team.createdAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
