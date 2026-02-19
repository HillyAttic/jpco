import { NextRequest, NextResponse } from 'next/server';
import { ErrorResponses } from '@/lib/api-error-handler';

interface VisitRecord {
  date: string;
  employeeName: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  taskTitle: string;
}

interface MonthlyVisits {
  month: string; // "2026-02" format
  monthName: string; // "February 2026"
  visits: VisitRecord[];
  totalVisits: number;
}

interface ClientMonthlyReport {
  clientId: string;
  clientName: string;
  monthlyData: MonthlyVisits[];
  totalVisits: number;
}

/**
 * GET /api/client-visits/monthly-report
 * Get client-wise monthly visit reports
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
    const clientSearch = searchParams.get('search')?.toLowerCase() || '';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Import services
    const { rosterAdminService } = await import('@/services/roster-admin.service');
    const { clientAdminService } = await import('@/services/client-admin.service');

    // Get all clients
    const allClients = await clientAdminService.getAll();
    
    // Filter clients by search
    const filteredClients = clientSearch
      ? allClients.filter(c => c.name.toLowerCase().includes(clientSearch))
      : allClients;

    if (filteredClients.length === 0) {
      return NextResponse.json({ clients: [] });
    }

    // Get roster entries
    const rosterFilters: any = {};
    if (startDate) {
      rosterFilters.startDate = new Date(startDate);
    }
    if (endDate) {
      rosterFilters.endDate = new Date(endDate);
    }

    const allRosterEntries = await rosterAdminService.getRosterEntries(rosterFilters);
    
    // Filter for client-based visits only
    const clientVisits = allRosterEntries.filter(
      entry => entry.taskType === 'single' && entry.clientId
    );

    // Build client-wise monthly reports
    const clientReports: ClientMonthlyReport[] = [];

    for (const client of filteredClients) {
      const clientEntries = clientVisits.filter(e => e.clientId === client.id);
      
      if (clientEntries.length === 0) continue;

      // Group by month
      const monthlyMap = new Map<string, VisitRecord[]>();

      for (const entry of clientEntries) {
        const date = entry.taskDate || formatDate(entry.timeStart!);
        const monthKey = date.substring(0, 7); // "2026-02"

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, []);
        }

        monthlyMap.get(monthKey)!.push({
          date,
          employeeName: entry.userName,
          employeeId: entry.userId,
          startTime: formatTime(entry.timeStart!),
          endTime: formatTime(entry.timeEnd!),
          taskTitle: entry.taskDetail || 'Visit'
        });
      }

      // Convert to monthly data array
      const monthlyData: MonthlyVisits[] = [];
      
      for (const [monthKey, visits] of monthlyMap.entries()) {
        // Sort visits by date
        visits.sort((a, b) => a.date.localeCompare(b.date));

        const [year, month] = monthKey.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });

        monthlyData.push({
          month: monthKey,
          monthName,
          visits,
          totalVisits: visits.length
        });
      }

      // Sort months in descending order (newest first)
      monthlyData.sort((a, b) => b.month.localeCompare(a.month));

      const totalVisits = clientEntries.length;

      clientReports.push({
        clientId: client.id!,
        clientName: client.name,
        monthlyData,
        totalVisits
      });
    }

    // Sort clients by name
    clientReports.sort((a, b) => a.clientName.localeCompare(b.clientName));

    return NextResponse.json({ clients: clientReports });

  } catch (error: any) {
    console.error('Error in GET /api/client-visits/monthly-report:', error);
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
