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
      <div className="grid grid-cols-[0.5fr_2fr_1.2fr_1.2fr_1.5fr_0.8fr_0.7fr] gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
        <div>S.No</div>
        <div>Client Name</div>
        <div>P.A.N.</div>
        <div>T.A.N.</div>
        <div>GSTIN</div>
        <div>Status</div>
        <div>Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {clients.map((client) => (
          <div
            key={client.id}
            className="grid grid-cols-[0.5fr_2fr_1.2fr_1.2fr_1.5fr_0.8fr_0.7fr] gap-3 px-4 py-3 bg-white dark:bg-gray-dark hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-800 transition-colors items-center"
          >
            {/* S.No */}
            <div className="text-gray-700 dark:text-gray-300 text-xs font-medium">
              {client.clientNumber || '-'}
            </div>
            {/* Client Name */}
            <div className="min-w-0 flex items-center">
              <div 
                className="font-medium text-gray-900 dark:text-white text-xs leading-tight truncate"
                title={client.clientName}
              >
                {client.clientName}
              </div>
            </div>

            {/* P.A.N. */}
            <div 
              className="text-gray-700 dark:text-gray-300 text-xs leading-tight truncate"
              title={client.taxIdentifiers?.pan || '-'}
            >
              {client.taxIdentifiers?.pan || '-'}
            </div>

            {/* T.A.N. */}
            <div
              className="text-gray-700 dark:text-gray-300 text-xs leading-tight truncate"
              title={client.taxIdentifiers?.tan || '-'}
            >
              {client.taxIdentifiers?.tan || '-'}
            </div>

            {/* GSTIN */}
            <div
              className="text-gray-700 dark:text-gray-300 text-xs leading-tight truncate"
              title={client.taxIdentifiers?.gstin || '-'}
            >
              {client.taxIdentifiers?.gstin || '-'}
            </div>

            {/* Status */}
            <div className="flex items-center">
              <Badge
                variant={client.status === 'active' ? 'default' : 'secondary'}
                className={`text-[10px] px-2 py-0.5 ${
                  client.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {client.status}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
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
