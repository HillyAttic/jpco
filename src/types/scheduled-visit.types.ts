/**
 * Scheduled Visit Types
 * For client-wise visit reports from roster calendar
 */

export interface ScheduledVisit {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM AM/PM
  endTime: string; // HH:MM AM/PM
  status: 'Saved'; // Status from roster
  taskId?: string; // Reference to recurring task
  taskTitle?: string; // Task title for context
  userId?: string; // Employee/User ID
  userName?: string; // Employee/User name
}

export interface ClientScheduledVisits {
  clientId: string;
  clientName: string;
  scheduledVisits: ScheduledVisit[];
}

export interface ScheduledVisitsResponse {
  clients: ClientScheduledVisits[];
  totalVisits: number;
}

export interface ScheduledVisitsFilters {
  userId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}
