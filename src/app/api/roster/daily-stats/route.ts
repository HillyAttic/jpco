import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Helper to serialize Firestore timestamps
function serializeDoc(data: any) {
  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof (value as any).toDate === 'function') {
      result[key] = (value as any).toDate().toISOString();
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * GET /api/roster/daily-stats
 * Get daily roster statistics for a month
 * Uses Admin SDK to bypass Firestore security rules.
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
      return ErrorResponses.forbidden('Only admins and managers can view roster stats');
    }

    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const { adminDb } = await import('@/lib/firebase-admin');

    // Get total user count
    const usersSnapshot = await adminDb.collection('users').get();
    const totalUsers = usersSnapshot.size;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Get all roster entries
    const rostersSnapshot = await adminDb.collection('rosters').get();

    // Initialize daily stats
    const dailyStats: Record<number, { orange: number; yellow: number; green: number; total: number }> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      dailyStats[day] = { orange: 0, yellow: 0, green: 0, total: totalUsers };
    }

    // Track user task colors per day
    const userTaskColorByDay: Record<number, Map<string, 'orange' | 'yellow' | 'green'>> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      userTaskColorByDay[day] = new Map();
    }

    function getTaskColor(task: any): 'orange' | 'yellow' | 'green' {
      const duration = task.durationHours;
      if (!duration) return 'green';
      if (duration < 8) return 'yellow';
      return 'orange';
    }

    function setUserColor(day: number, userId: string, color: 'orange' | 'yellow' | 'green') {
      const existing = userTaskColorByDay[day].get(userId);
      if (!existing || color === 'orange' || (color === 'yellow' && existing === 'green')) {
        userTaskColorByDay[day].set(userId, color);
      }
    }

    rostersSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();

      if (data.taskType === 'single' && data.taskDate) {
        const taskDate = data.taskDate.toDate ? data.taskDate.toDate() : new Date(data.taskDate);
        if (taskDate.getMonth() === month - 1 && taskDate.getFullYear() === year) {
          const day = taskDate.getDate();
          if (day >= 1 && day <= daysInMonth) {
            setUserColor(day, data.userId, getTaskColor(data));
          }
        }
      } else if (data.taskType === 'multi' && data.startDate && data.endDate) {
        const taskStart = data.startDate.toDate?.() || new Date(data.startDate);
        const taskEnd = data.endDate.toDate?.() || new Date(data.endDate);

        if (taskStart <= endDate && taskEnd >= startDate) {
          const color = getTaskColor(data);
          for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month - 1, day);
            if (currentDate >= taskStart && currentDate <= taskEnd) {
              setUserColor(day, data.userId, color);
            }
          }
        }
      }
    });

    // Compute final stats
    for (let day = 1; day <= daysInMonth; day++) {
      const userColors = userTaskColorByDay[day];
      let orangeCount = 0;
      let yellowCount = 0;
      userColors.forEach((color) => {
        if (color === 'orange') orangeCount++;
        else if (color === 'yellow') yellowCount++;
      });
      const greenCount = totalUsers - userColors.size;
      dailyStats[day] = { orange: orangeCount, yellow: yellowCount, green: greenCount, total: totalUsers };
    }

    return NextResponse.json({ stats: dailyStats, totalUsers });
  } catch (error) {
    console.error('Error fetching roster daily stats:', error);
    return handleApiError(error);
  }
}
