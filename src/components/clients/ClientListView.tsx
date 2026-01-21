import React from 'react';
import { Client } from '@/services/client.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ClientListViewProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

/**
 * ClientListView Component
 * Displays clients in a table/list format
 */
export function ClientListView({ clients, onEdit, onDelete }: ClientListViewProps) {
  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
        <div className="col-span-3">Name</div>
        <div className="col-span-3">Email</div>
        <div className="col-span-2">Company</div>
        <div className="col-span-2">Phone</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {clients.map((client) => (
          <div
            key={client.id}
            className="grid grid-cols-12 gap-4 px-6 py-4 text-sm bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {/* Name */}
            <div className="col-span-3">
              <div className="flex items-center gap-3">
                {client.avatarUrl ? (
                  <img
                    src={client.avatarUrl}
                    alt={client.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-300 font-medium text-sm">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {client.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="col-span-3 text-gray-700 dark:text-gray-300 truncate">
              {client.email}
            </div>

            {/* Company */}
            <div className="col-span-2 text-gray-700 dark:text-gray-300">
              {client.company}
            </div>

            {/* Phone */}
            <div className="col-span-2 text-gray-700 dark:text-gray-300">
              {client.phone}
            </div>

            {/* Status */}
            <div className="col-span-1">
              <Badge
                variant={client.status === 'active' ? 'default' : 'secondary'}
                className={
                  client.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }
              >
                {client.status}
              </Badge>
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center gap-2">
              <button
                onClick={() => onEdit(client)}
                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                aria-label="Edit client"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(client.id!)}
                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                aria-label="Delete client"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
