'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { clientService, Client } from '@/services/client.service';

interface ClientListModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  clientIds: string[];
  isTeamMemberMapping?: boolean;
  teamMemberName?: string;
}

/**
 * ClientListModal Component
 * Displays a list of clients assigned to a task
 */
export function ClientListModal({
  isOpen,
  onClose,
  taskTitle,
  clientIds,
  isTeamMemberMapping = false,
  teamMemberName,
}: ClientListModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      if (!isOpen || clientIds.length === 0) return;

      setLoading(true);
      try {
        // Fetch all clients and filter by IDs
        const allClients = await clientService.getAll({ status: 'active', limit: 1000 });
        const assignedClients = allClients.filter(client => 
          client.id && clientIds.includes(client.id)
        );
        setClients(assignedClients);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [isOpen, clientIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-4 sm:py-8">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
        ></div>

        <div className="inline-block w-full max-w-4xl overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-dark rounded-lg shadow-xl relative z-10 max-h-[85vh] flex flex-col">
          {/* Header - Fixed */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UserGroupIcon className="w-6 h-6 text-indigo-600" />
                  Assigned Clients
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {taskTitle}
                  {isTeamMemberMapping && teamMemberName && (
                    <span className="ml-2 text-indigo-600">• Assigned to: {teamMemberName}</span>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12">
                <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No clients assigned to this task</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {client.name}
                        </h4>
                        {client.businessName && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {client.businessName}
                          </p>
                        )}
                        {client.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
                            {client.email}
                          </p>
                        )}
                        {client.phone && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                            {client.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total: <span className="font-semibold text-gray-900 dark:text-white">{clients.length}</span> client{clients.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
