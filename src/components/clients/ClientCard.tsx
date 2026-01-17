import React from 'react';
import { Client } from '@/services/client.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PencilSquareIcon, TrashIcon, EnvelopeIcon, PhoneIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

/**
 * ClientCard Component
 * Displays client information in a card format with avatar, contact details, and action buttons
 * Validates Requirements: 1.8, 1.9
 */
export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  // Generate initials from client name for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardContent className="p-6">

        
        <div className="flex items-start justify-between mb-4">
          {/* Avatar and Name */}
          <div className="flex items-start gap-4 flex-1">
            <Avatar
              src={client.avatarUrl}
              alt={client.name}
              fallback={getInitials(client.name)}
              size="lg"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {client.name}
                </h3>
                <Badge
                  variant={client.status === 'active' ? 'success' : 'default'}
                >
                  {client.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(client)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              aria-label={`Edit ${client.name}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(client.id!)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label={`Delete ${client.name}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-2">
          {/* Email */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
            <a 
              href={`mailto:${client.email}`}
              className="hover:text-blue-600 truncate"
            >
              {client.email}
            </a>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <PhoneIcon className="w-4 h-4 flex-shrink-0" />
            <a 
              href={`tel:${client.phone}`}
              className="hover:text-blue-600"
            >
              {client.phone}
            </a>
          </div>

          {/* Company */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BuildingOfficeIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{client.company}</span>
          </div>
        </div>

        {/* Footer with creation date */}
        {client.createdAt && (
          <div className="mt-4 pt-4 border-t text-xs text-gray-500">
            Added {new Date(client.createdAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
