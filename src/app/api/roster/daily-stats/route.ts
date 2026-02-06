import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Calculate task duration in hours
function calculateDuration(start?: Date, end?: Date): number | undefined {
  if (!start || !end) return undefined;
  const ms = end.getTime() - start.getTime();
  return ms / (1000 * 60 * 60);
}

// Get task color based on duration
function getTaskColor(task: any): 'orange' | 'yellow' | 'green' {
  const duration = task.durationHours || calculateDuration(
    task.timeStart,
    task.timeEnd || task.endDate
  );
  
  if (!duration) return 'green'; // Not assigned
  if (duration < 8) return 'yellow'; // Short task
  return 'orange'; // Long task
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Decode JWT token to get user ID
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.user_id || payload.sub;
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const role = userData?.role || 'employee';
    
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get month and year from query params
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;

    // Get all roster entries
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const rostersSnapshot = await getDocs(collection(db, 'rosters'));

    // Calculate stats for each day
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyStats: Record<number, { orange: number; yellow: number; green: number; total: number }> = {};

    // Initialize all days
    for (let day = 1; day <= daysInMonth; day++) {
      dailyStats[day] = { orange: 0, yellow: 0, green: 0, total: totalUsers };
    }

    // Track which users have tasks on which days and their colors
    const userTaskColorByDay: Record<number, Map<string, 'orange' | 'yellow' | 'green'>> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      userTaskColorByDay[day] = new Map();
    }

    // Process all roster entries
    rostersSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      
      if (data.taskType === 'single' && data.taskDate) {
        const taskDate = data.taskDate.toDate ? data.taskDate.toDate() : new Date(data.taskDate);
        
        // Check if task is in current month
        if (taskDate.getMonth() === month - 1 && taskDate.getFullYear() === year) {
          const day = taskDate.getDate();
          
          if (day >= 1 && day <= daysInMonth) {
            const timeStart = data.timeStart?.toDate?.() || (data.timeStart ? new Date(data.timeStart) : undefined);
            const timeEnd = data.timeEnd?.toDate?.() || (data.timeEnd ? new Date(data.timeEnd) : undefined);
            
            const color = getTaskColor({
              ...data,
              timeStart,
              timeEnd,
              durationHours: data.durationHours,
            });
            
            // Track the most severe color for this user on this day (orange > yellow > green)
            const existingColor = userTaskColorByDay[day].get(data.userId);
            if (!existingColor || 
                (color === 'orange') || 
                (color === 'yellow' && existingColor === 'green')) {
              userTaskColorByDay[day].set(data.userId, color);
            }
          }
        }
      } else if (data.taskType === 'multi' && data.startDate && data.endDate) {
        const taskStart = data.startDate.toDate?.() || new Date(data.startDate);
        const taskEnd = data.endDate.toDate?.() || new Date(data.endDate);
        
        // Check if task overlaps with current month
        if (taskStart <= endDate && taskEnd >= startDate) {
          const color = getTaskColor({
            ...data,
            timeStart: taskStart,
            timeEnd: taskEnd,
            durationHours: data.durationHours,
          });
          
          // Add color to each day the task spans within the current month
          for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month - 1, day);
            currentDate.setHours(0, 0, 0, 0);
            const checkStart = new Date(taskStart);
            checkStart.setHours(0, 0, 0, 0);
            const checkEnd = new Date(taskEnd);
            checkEnd.setHours(23, 59, 59, 999);
            
            if (currentDate >= checkStart && currentDate <= checkEnd) {
              // Track the most severe color for this user on this day
              const existingColor = userTaskColorByDay[day].get(data.userId);
              if (!existingColor || 
                  (color === 'orange') || 
                  (color === 'yellow' && existingColor === 'green')) {
                userTaskColorByDay[day].set(data.userId, color);
              }
            }
          }
        }
      }
    });

    // Calculate final stats for each day
    for (let day = 1; day <= daysInMonth; day++) {
      const userColors = userTaskColorByDay[day];
      
      // Count each color
      let orangeCount = 0;
      let yellowCount = 0;
      
      userColors.forEach((color) => {
        if (color === 'orange') orangeCount++;
        else if (color === 'yellow') yellowCount++;
      });
      
      // Users without tasks get green
      const usersWithTasks = userColors.size;
      const greenCount = totalUsers - usersWithTasks;
      
      dailyStats[day] = {
        orange: orangeCount,
        yellow: yellowCount,
        green: greenCount,
        total: totalUsers,
      };
    }

    return NextResponse.json({ stats: dailyStats, totalUsers });
  } catch (error) {
    console.error('Error fetching roster daily stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roster stats' },
      { status: 500 }
    );
  }
}
