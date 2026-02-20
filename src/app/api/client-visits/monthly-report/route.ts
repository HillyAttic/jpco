import { NextRequest, NextResponse } from 'next/server';
import { ErrorResponses } from '@/lib/api-error-handler';

interface VisitRecord {
  date: string;
  employeeName: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  taskTitle: string;
  taskType?: 'recurring' | 'non-recurring';
  attendanceStatus?: 'present' | 'absent' | 'incomplete' | 'no-data';
  attendanceDetails?: {
    clockIn?: string;
    clockOut?: string;
    totalHours?: number;
  };
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
 * Shows ONLY clients marked using "Plan Task" button (roster entries)
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
    const { adminDb } = await import('@/lib/firebase-admin');
    const { Timestamp } = await import('firebase-admin/firestore');

    // Get all recurring tasks with teamMemberMappings (these are the ones with Plan Task button)
    const recurringTasksSnapshot = await adminDb.collection('recurring-tasks').get();
    const recurringTasksWithMappings = new Set<string>();
    
    recurringTasksSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Only include tasks that have teamMemberMappings (these show the Plan Task button)
      if (data.teamMemberMappings && Array.isArray(data.teamMemberMappings) && data.teamMemberMappings.length > 0) {
        recurringTasksWithMappings.add(data.title);
      }
    });

    console.log('[Client Visits] Recurring tasks with Plan Task button:', Array.from(recurringTasksWithMappings));

    // Get all clients
    const allClients = await clientAdminService.getAll();
    
    // Filter clients by search
    const filteredClients = clientSearch
      ? allClients.filter(c => c.name.toLowerCase().includes(clientSearch))
      : allClients;

    if (filteredClients.length === 0) {
      return NextResponse.json({ clients: [] });
    }

    // Create a set of filtered client IDs for quick lookup
    const filteredClientIds = new Set(filteredClients.map(c => c.id!));
    // Create a client name map
    const clientNameMap = new Map(allClients.map(c => [c.id!, c.name]));

    // ========== 1. Get roster entries (recurring task visits) ==========
    const rosterFilters: any = {};
    if (startDate) {
      rosterFilters.startDate = new Date(startDate);
    }
    if (endDate) {
      rosterFilters.endDate = new Date(endDate);
    }

    const allRosterEntries = await rosterAdminService.getRosterEntries(rosterFilters);
    
    // Filter for client-based visits only (from recurring tasks - Plan Task button)
    // Only include roster entries where taskDetail matches a recurring task with teamMemberMappings
    const rosterClientVisits = allRosterEntries.filter(
      entry => entry.taskType === 'single' && 
               entry.clientId && 
               entry.taskDetail &&
               recurringTasksWithMappings.has(entry.taskDetail)
    );

    console.log('[Client Visits] Total roster entries:', allRosterEntries.length);
    console.log('[Client Visits] Filtered roster entries (Plan Task only):', rosterClientVisits.length);

    // ========== 2. Fetch attendance records for all employees and dates ==========
    const attendanceMap = new Map<string, any>(); // key: "employeeId-YYYY-MM-DD"
    
    if (rosterClientVisits.length > 0) {
      // Get unique employee IDs and date range
      const employeeIds = [...new Set(rosterClientVisits.map(v => v.userId))];
      
      // Determine date range for attendance query
      let minDate = new Date();
      let maxDate = new Date(0);
      
      for (const visit of rosterClientVisits) {
        const visitDate = visit.taskDate ? new Date(visit.taskDate) : visit.timeStart;
        if (visitDate) {
          if (visitDate < minDate) minDate = visitDate;
          if (visitDate > maxDate) maxDate = visitDate;
        }
      }
      
      // Fetch attendance records for all employees in the date range
      const attendanceSnapshot = await adminDb
        .collection('attendance-records')
        .where('employeeId', 'in', employeeIds.slice(0, 10)) // Firestore 'in' limit is 10
        .where('clockIn', '>=', Timestamp.fromDate(minDate))
        .where('clockIn', '<=', Timestamp.fromDate(new Date(maxDate.getTime() + 24 * 60 * 60 * 1000)))
        .get();
      
      // If more than 10 employees, fetch in batches
      if (employeeIds.length > 10) {
        for (let i = 10; i < employeeIds.length; i += 10) {
          const batch = employeeIds.slice(i, i + 10);
          const batchSnapshot = await adminDb
            .collection('attendance-records')
            .where('employeeId', 'in', batch)
            .where('clockIn', '>=', Timestamp.fromDate(minDate))
            .where('clockIn', '<=', Timestamp.fromDate(new Date(maxDate.getTime() + 24 * 60 * 60 * 1000)))
            .get();
          
          batchSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const clockIn = data.clockIn?.toDate();
            if (clockIn) {
              const dateKey = formatDate(clockIn);
              const key = `${data.employeeId}-${dateKey}`;
              attendanceMap.set(key, {
                clockIn: data.clockIn?.toDate(),
                clockOut: data.clockOut?.toDate(),
                totalHours: data.totalHours || 0,
                status: data.status,
              });
            }
          });
        }
      }
      
      attendanceSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const clockIn = data.clockIn?.toDate();
        if (clockIn) {
          const dateKey = formatDate(clockIn);
          const key = `${data.employeeId}-${dateKey}`;
          attendanceMap.set(key, {
            clockIn: data.clockIn?.toDate(),
            clockOut: data.clockOut?.toDate(),
            totalHours: data.totalHours || 0,
            status: data.status,
          });
        }
      });
      
      console.log('[Client Visits] Fetched attendance records:', attendanceMap.size);
    }

    // ========== 3. Build unified client-wise monthly reports ==========
    // Use a map to collect all visit records per client
    const clientVisitRecordsMap = new Map<string, VisitRecord[]>();

    // Add roster-based visits (from Plan Task button only)
    for (const entry of rosterClientVisits) {
      if (!entry.clientId || !filteredClientIds.has(entry.clientId)) continue;

      if (!clientVisitRecordsMap.has(entry.clientId)) {
        clientVisitRecordsMap.set(entry.clientId, []);
      }

      const date = entry.taskDate || formatDate(entry.timeStart!);
      
      // Check attendance for this employee on this date
      const attendanceKey = `${entry.userId}-${date}`;
      const attendance = attendanceMap.get(attendanceKey);
      
      let attendanceStatus: 'present' | 'absent' | 'incomplete' | 'no-data' = 'no-data';
      let attendanceDetails: any = undefined;
      
      if (attendance) {
        if (attendance.clockOut) {
          attendanceStatus = 'present';
          attendanceDetails = {
            clockIn: formatTime(attendance.clockIn),
            clockOut: formatTime(attendance.clockOut),
            totalHours: attendance.totalHours,
          };
        } else if (attendance.clockIn) {
          attendanceStatus = 'incomplete';
          attendanceDetails = {
            clockIn: formatTime(attendance.clockIn),
          };
        }
      } else {
        // Check if the visit date is in the past
        const visitDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        visitDate.setHours(0, 0, 0, 0);
        
        if (visitDate < today) {
          attendanceStatus = 'absent';
        }
      }
      
      clientVisitRecordsMap.get(entry.clientId)!.push({
        date,
        employeeName: entry.userName,
        employeeId: entry.userId,
        startTime: formatTime(entry.timeStart!),
        endTime: formatTime(entry.timeEnd!),
        taskTitle: entry.taskDetail || 'Visit',
        taskType: 'recurring',
        attendanceStatus,
        attendanceDetails,
      });
    }

    // ========== 4. Build the monthly report structure ==========
    const clientReports: ClientMonthlyReport[] = [];

    for (const client of filteredClients) {
      const visitRecords = clientVisitRecordsMap.get(client.id!) || [];
      
      if (visitRecords.length === 0) continue;

      // Group by month
      const monthlyMap = new Map<string, VisitRecord[]>();

      for (const visit of visitRecords) {
        const monthKey = visit.date.substring(0, 7); // "2026-02"

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, []);
        }

        monthlyMap.get(monthKey)!.push(visit);
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

      const totalVisits = visitRecords.length;

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
