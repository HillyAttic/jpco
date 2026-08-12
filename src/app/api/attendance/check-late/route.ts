import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Hardcoded shift start time for delay detection
const SHIFT_START_HOUR = 10;
const SHIFT_START_MINUTE = 30;
const GRACE_MINUTES = 30;

/**
 * POST /api/attendance/check-late
 * Server-side late detection using Admin SDK.
 * Simple logic: clock-in after 10:30 AM + 30 min grace = delayed.
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    const { employeeId, attendanceRecordId } = body;

    if (!employeeId || !attendanceRecordId) {
      return ErrorResponses.badRequest('employeeId and attendanceRecordId are required');
    }

    const { adminDb } = await import('@/lib/firebase-admin');

    // Get the attendance record for actual clock-in time
    const attendanceDoc = await adminDb.collection('attendance-records').doc(attendanceRecordId).get();
    let clockInTime = new Date();

    if (attendanceDoc.exists) {
      const attendanceData = attendanceDoc.data()!;
      clockInTime = attendanceData.clockIn?.toDate
        ? attendanceData.clockIn.toDate()
        : new Date(attendanceData.clockIn);
    }

    // Calculate if late: clock-in time > shift start + grace period
    const shiftStartMinutes = SHIFT_START_HOUR * 60 + SHIFT_START_MINUTE;
    const allowedMinutes = shiftStartMinutes + GRACE_MINUTES;
    const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();

    console.log(`[check-late] Employee: ${employeeId}`);
    console.log(`[check-late] Clock-in time: ${clockInTime.toISOString()} (${clockInTime.getHours()}:${String(clockInTime.getMinutes()).padStart(2, '0')})`);
    console.log(`[check-late] Clock-in minutes: ${clockInMinutes}, Allowed minutes: ${allowedMinutes} (shift start ${SHIFT_START_HOUR}:${String(SHIFT_START_MINUTE).padStart(2, '0')} + ${GRACE_MINUTES}min grace)`);

    if (clockInMinutes > allowedMinutes) {
      const minutesLate = clockInMinutes - shiftStartMinutes;

      // Check if employee already has a delay sign-in request for this attendance record
      const existingRequestSnapshot = await adminDb
        .collection('delay-signin-requests')
        .where('attendanceRecordId', '==', attendanceRecordId)
        .get();

      const hasExistingRequest = existingRequestSnapshot.docs.some((doc) => {
        const data = doc.data();
        return data.status !== 'cancelled';
      });

      if (hasExistingRequest) {
        console.log(`[check-late] Employee already has a delay request for this record`);
        return NextResponse.json({
          isLate: false,
          shift: null,
          clockInTime: clockInTime.toISOString(),
          minutesLate: 0,
          attendanceRecordId,
          message: 'Delay request already submitted for this attendance record',
        }, { status: 200 });
      }

      console.log(`[check-late] Employee is ${minutesLate} minutes late`);

      return NextResponse.json({
        isLate: true,
        shift: {
          id: 'default',
          name: 'Default Shift',
          startTime: `${SHIFT_START_HOUR}:${String(SHIFT_START_MINUTE).padStart(2, '0')}`,
          endTime: '18:30',
        },
        clockInTime: clockInTime.toISOString(),
        minutesLate,
        attendanceRecordId,
      }, { status: 200 });
    }

    console.log(`[check-late] Employee is NOT late`);

    return NextResponse.json({
      isLate: false,
      shift: {
        id: 'default',
        name: 'Default Shift',
        startTime: `${SHIFT_START_HOUR}:${String(SHIFT_START_MINUTE).padStart(2, '0')}`,
        endTime: '18:30',
      },
      clockInTime: clockInTime.toISOString(),
      minutesLate: 0,
      attendanceRecordId,
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
