import { NextRequest, NextResponse } from 'next/server';
import { ErrorResponses } from '@/lib/api-error-handler';
import { ScheduledVisitsResponse, ClientScheduledVisits, ScheduledVisit } from '@/types/scheduled-visit.types';

/**
 * GET /api/client-visits/scheduled
 * Get scheduled visits from roster calendar for users with team member mappings
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Import services
    const { recurringTaskAdminService } = await import('@/services/recurring-task-admin.service');
    const { rosterAdminService } = await import('@/services/roster-admin.service');
    const { clientAdminService } = await import('@/services/client-admin.service');

    // Step 1: Get all recurring tasks with team member mappings
    const allTasks = await recurringTaskAdminService.getAll();
    const tasksWithMappings = allTasks.filter(
      task => task.teamMemberMappings && task.teamMemberMappings.length > 0
    );

    if (tasksWithMappings.length === 0) {
      return NextResponse.json({
        clients: [],
        totalVisits: 0
      } as ScheduledVisitsResponse);
    }

    // Step 2: Get roster entries (scheduled visits)
    const rosterFilters: any = {};
    if (userId) {
      rosterFilters.userId = userId;
    }
    if (startDate) {
      rosterFilters.startDate = new Date(startDate);
    }
    if (endDate) {
      rosterFilters.endDate = new Date(endDate);
    }

    const rosterEntries = await rosterAdminService.getRosterEntries(rosterFilters);
    
    // Filter for single-task (client-based) entries only
    const clientRosterEntries = rosterEntries.filter(entry => entry.taskType === 'single' && entry.clientId);

    if (clientRosterEntries.length === 0) {
      return NextResponse.json({
        clients: [],
        totalVisits: 0
      } as ScheduledVisitsResponse);
    }

    // Step 3: Get all clients for name mapping
    const allClients = await clientAdminService.getAll();
    const clientMap = new Map(allClients.map(c => [c.id!, c.name]));

    // Step 4: Build client-wise scheduled visits
    const clientVisitsMap = new Map<string, ClientScheduledVisits>();

    for (const entry of clientRosterEntries) {
      if (!entry.clientId) continue;

      const clientId = entry.clientId;
      const clientName = entry.clientName || clientMap.get(clientId) || 'Unknown Client';

      // Check if this user is mapped to this client in any task
      const isMappedUser = tasksWithMappings.some(task =>
        task.teamMemberMappings?.some(mapping =>
          mapping.userId === entry.userId && mapping.clientIds.includes(clientId)
        )
      );

      // Only include if user is mapped to this client
      if (!isMappedUser) continue;

      if (!clientVisitsMap.has(clientId)) {
        clientVisitsMap.set(clientId, {
          clientId,
          clientName,
          scheduledVisits: []
        });
      }

      const clientVisits = clientVisitsMap.get(clientId)!;

      // Format the scheduled visit
      const scheduledVisit: ScheduledVisit = {
        date: entry.taskDate || formatDate(entry.timeStart!),
        startTime: formatTime(entry.timeStart!),
        endTime: formatTime(entry.timeEnd!),
        status: 'Saved',
        taskTitle: entry.taskDetail,
        userId: entry.userId,
        userName: entry.userName
      };

      clientVisits.scheduledVisits.push(scheduledVisit);
    }

    // Step 5: Sort visits by date within each client
    const clients = Array.from(clientVisitsMap.values());
    clients.forEach(client => {
      client.scheduledVisits.sort((a, b) => a.date.localeCompare(b.date));
    });

    // Sort clients by name
    clients.sort((a, b) => a.clientName.localeCompare(b.clientName));

    const totalVisits = clients.reduce((sum, client) => sum + client.scheduledVisits.length, 0);

    return NextResponse.json({
      clients,
      totalVisits
    } as ScheduledVisitsResponse);

  } catch (error: any) {
    console.error('Error in GET /api/client-visits/scheduled:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time to HH:MM AM/PM
 */
function formatTime(date: Date): string {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}
