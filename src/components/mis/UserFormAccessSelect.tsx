'use client';

import React, { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, DocumentTextIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { SheetUserFormMapping } from '@/services/mis-config.service';
import type { FormTemplate } from '@/types/form.types';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
}

interface UserFormAccessSelectProps {
  users: User[];
  formTemplates: FormTemplate[];
  selectedMappings: SheetUserFormMapping[];
  onMappingsChange: (mappings: SheetUserFormMapping[]) => void;
}

export default function UserFormAccessSelect({
  users,
  formTemplates,
  selectedMappings,
  onMappingsChange,
}: UserFormAccessSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());

  // Get selected user IDs from mappings
  const selectedUserIds = useMemo(() => {
    return selectedMappings.map(m => m.userId);
  }, [selectedMappings]);

  // Get form IDs for a specific user
  const getUserFormIds = (userId: string): string[] => {
    const mapping = selectedMappings.find(m => m.userId === userId);
    return mapping?.formIds || [];
  };

  // Filter users by search
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = users.filter(
        (user) =>
          user.displayName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Sort: selected users first, then unselected
    return filtered.sort((a, b) => {
      const aSelected = selectedUserIds.includes(a.uid);
      const bSelected = selectedUserIds.includes(b.uid);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      return a.displayName.localeCompare(b.displayName);
    });
  }, [users, searchQuery, selectedUserIds]);

  // Toggle user checkbox
  const toggleUser = (uid: string) => {
    if (selectedUserIds.includes(uid)) {
      // Remove user from mappings
      const newMappings = selectedMappings.filter(m => m.userId !== uid);
      onMappingsChange(newMappings);
      // Collapse if expanded
      setExpandedUserIds(prev => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    } else {
      // Add user with empty form selection
      const newMappings = [...selectedMappings, { userId: uid, formIds: [] }];
      onMappingsChange(newMappings);
      // Auto-expand when adding
      setExpandedUserIds(prev => new Set([...prev, uid]));
    }
  };

  // Toggle user's form
  const toggleUserForm = (userId: string, formId: string) => {
    const newMappings = selectedMappings.map(m => {
      if (m.userId === userId) {
        const formIds = m.formIds.includes(formId)
          ? m.formIds.filter(id => id !== formId)
          : [...m.formIds, formId];
        return { ...m, formIds };
      }
      return m;
    });
    onMappingsChange(newMappings);
  };

  // Toggle all forms for a user
  const toggleAllFormsForUser = (userId: string) => {
    const currentFormIds = getUserFormIds(userId);
    const allFormIds = formTemplates.map(f => f.id);

    const newMappings = selectedMappings.map(m => {
      if (m.userId === userId) {
        const formIds = currentFormIds.length === allFormIds.length
          ? []
          : allFormIds;
        return { ...m, formIds };
      }
      return m;
    });
    onMappingsChange(newMappings);
  };

  // Toggle expand/collapse
  const toggleExpanded = (uid: string) => {
    setExpandedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  // Select all users
  const toggleAll = () => {
    if (selectedUserIds.length === users.length) {
      onMappingsChange([]);
      setExpandedUserIds(new Set());
    } else {
      const newMappings = users.map(u => ({
        userId: u.uid,
        formIds: [],
      }));
      onMappingsChange(newMappings);
    }
  };

  const selectedCount = selectedUserIds.length;
  const totalCount = users.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Who can view submissions
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -mx-2 px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={selectedCount === totalCount && totalCount > 0}
              onChange={toggleAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select All
            </span>
          </label>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No users found matching your search' : 'No users available'}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.uid);
              const isExpanded = expandedUserIds.has(user.uid);
              const userFormIds = getUserFormIds(user.uid);

              return (
                <div key={user.uid} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  {/* User row */}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUser(user.uid)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                      {user.role && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {user.role}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(user.uid)}
                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
                      >
                        <span>{userFormIds.length} of {formTemplates.length} forms</span>
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded form selection */}
                  {isSelected && isExpanded && (
                    <div className="px-4 pb-3 pl-12">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Select forms this user can view
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={userFormIds.length === formTemplates.length && formTemplates.length > 0}
                              onChange={() => toggleAllFormsForUser(user.uid)}
                              className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              All forms
                            </span>
                          </label>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {formTemplates.map((form) => {
                            const isChecked = userFormIds.includes(form.id);
                            return (
                              <label
                                key={form.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleUserForm(user.uid, form.id)}
                                  className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <DocumentTextIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                  {form.title}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
        These users will be able to view form submissions in the MIS Tracker. Select specific forms for each user.
      </p>
    </div>
  );
}
