import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Select from '@/components/ui/select';
import { Client, clientService } from '@/services/client.service';
import { UserProfile } from '@/types/auth.types';
import { UserManagementService } from '@/services/user-management.service';
import { authenticatedFetch } from '@/lib/api-client';
import { XMarkIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { TeamMemberMapping } from '@/services/recurring-task.service';

interface TeamMemberMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mappings: TeamMemberMapping[]) => void;
  initialMappings?: TeamMemberMapping[];
}

export function TeamMemberMappingDialog({
  isOpen,
  onClose,
  onSave,
  initialMappings = [],
}: TeamMemberMappingDialogProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [mappings, setMappings] = useState<TeamMemberMapping[]>(initialMappings);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  // Load users and clients (filtered by manager hierarchy)
  useEffect(() => {
    const loadData = async () => {
      setLoadingUsers(true);
      setLoadingClients(true);
      
      try {
        // Use the new API that respects manager hierarchy for users with authentication
        const [usersResponse, clientsResult] = await Promise.all([
          authenticatedFetch('/api/manager-hierarchy/my-employees'),
          clientService.getAll({ status: 'active', limit: 1000 }),
        ]);
        
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const usersData = await usersResponse.json();
        
        // Convert to UserProfile format
        const userProfiles: UserProfile[] = usersData.map((user: any) => ({
          uid: user.id,
          email: user.email,
          displayName: user.name,
          role: user.role,
        }));
        
        setUsers(userProfiles);
        setClients(clientsResult);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingUsers(false);
        setLoadingClients(false);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Reset initial mappings when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMappings(initialMappings);
      setSelectedUserId('');
      setSelectedClientIds([]);
    }
  }, [isOpen, initialMappings]);

  // Get available clients (not already assigned to selected user)
  const getAvailableClients = () => {
    const currentMapping = mappings.find(m => m.userId === selectedUserId);
    const assignedClientIds = currentMapping?.clientIds || [];
    return clients.filter(client => !assignedClientIds.includes(client.id!));
  };

  // Handle adding a client to the selected user
  const handleAddClient = (clientId: string) => {
    if (!selectedUserId) return;

    const existingMapping = mappings.find(m => m.userId === selectedUserId);
    const user = users.find(u => u.uid === selectedUserId);
    
    if (!user) return;

    if (existingMapping) {
      // Update existing mapping
      setMappings(mappings.map(m => 
        m.userId === selectedUserId
          ? { ...m, clientIds: [...m.clientIds, clientId] }
          : m
      ));
    } else {
      // Create new mapping
      setMappings([
        ...mappings,
        {
          userId: selectedUserId,
          userName: user.displayName || user.email,
          clientIds: [clientId],
        },
      ]);
    }
  };

  // Handle removing a client from a user
  const handleRemoveClient = (userId: string, clientId: string) => {
    setMappings(mappings.map(m => {
      if (m.userId === userId) {
        const newClientIds = m.clientIds.filter(id => id !== clientId);
        return { ...m, clientIds: newClientIds };
      }
      return m;
    }).filter(m => m.clientIds.length > 0)); // Remove mappings with no clients
  };

  // Handle removing entire user mapping
  const handleRemoveUser = (userId: string) => {
    setMappings(mappings.filter(m => m.userId !== userId));
  };

  // Handle save
  const handleSave = () => {
    onSave(mappings);
    onClose();
  };

  // Get client name by ID
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = users.find(u => u.uid === userId);
    return user?.displayName || user?.email || 'Unknown User';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Member Mapping</DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Assign specific clients to team members. Each member will only see tasks for their assigned clients.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Team Member Selection */}
            <div>
              <Label htmlFor="user-select" className="flex items-center gap-2 mb-2">
                <UserIcon className="w-4 h-4" />
                Select Team Member
              </Label>
              <Select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers}
                className="w-full"
              >
                <option value="">Choose a team member...</option>
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName || user.email} ({user.role})
                  </option>
                ))}
              </Select>
              {loadingUsers && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Loading users...</p>
              )}
            </div>

            {/* Client Selection */}
            <div>
              <Label htmlFor="client-select" className="flex items-center gap-2 mb-2">
                <BuildingOfficeIcon className="w-4 h-4" />
                Select Clients
              </Label>
              <Select
                id="client-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddClient(e.target.value);
                  }
                }}
                disabled={!selectedUserId || loadingClients}
                className="w-full"
              >
                <option value="">Choose clients to assign...</option>
                {getAvailableClients().map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.businessName ? `(${client.businessName})` : ''}
                  </option>
                ))}
              </Select>
              {!selectedUserId && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select a team member first</p>
              )}
              {loadingClients && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Loading clients...</p>
              )}
            </div>
          </div>

          {/* Current Mappings Display */}
          <div>
            <Label className="mb-3 block">Current Mappings ({mappings.length} team members)</Label>
            
            {mappings.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <UserIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No team member mappings yet</p>
                <p className="text-sm mt-1">Select a team member and assign clients to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mappings.map((mapping) => (
                  <div
                    key={mapping.userId}
                    className="p-4 bg-white dark:bg-gray-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{mapping.userName}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {mapping.clientIds.length} client{mapping.clientIds.length !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(mapping.userId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {mapping.clientIds.map((clientId) => (
                        <div
                          key={clientId}
                          className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5"
                        >
                          <BuildingOfficeIcon className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-sm text-gray-900 dark:text-white">{getClientName(clientId)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveClient(mapping.userId, clientId)}
                            className="text-red-500 hover:text-red-700 ml-1"
                            aria-label={`Remove ${getClientName(clientId)}`}
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="text-white">
            Save Mappings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
