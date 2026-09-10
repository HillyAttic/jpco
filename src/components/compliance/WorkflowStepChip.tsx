'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

interface WorkflowStepChipProps {
  name: string;
  shortName: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
}

export function WorkflowStepChip({
  name,
  shortName,
  completed,
  completedAt,
  completedBy,
}: WorkflowStepChipProps) {
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        completed
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-500'
      }`}
      title={`${name}${completed ? ` — done ${formatDate(completedAt)}${completedBy ? ` · by ${completedBy}` : ''}` : ''}`}
    >
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
          completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'
        }`}
      >
        {completed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
      <span className="truncate">{shortName}</span>
    </div>
  );
}
