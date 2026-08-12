import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * POST /api/attendance/check-late
 * Server-side late detection using Admin SDK.
 * Dynamically fetches shift start time and grace period from Firestore.
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
    const { attendancePolicyAdminService } = await import('@/services/attendance-policy-admin.service');

    // Get the attendance record for actual clock-in time
    const attendanceDoc = await adminDb.collection('attendance-records').doc(attendanceRecordId).get();
    let clockInTime = new Date();

    if (attendanceDoc.exists) {
      const attendanceData = attendanceDoc.data()!;
      clockInTime = attendanceData.clockIn?.toDate
        ? attendanceData.clockIn.toDate()
        : new Date(attendanceData.clockIn);
    }

    // Get employee's assigned shift
    const assignedShift = await attendancePolicyAdminService.getShiftForEmployee(employeeId, clockInTime);

    // Get attendance policy for grace period
    const policy = await attendancePolicyAdminService.getDefaultPolicy();
    const graceMinutes = policy?.graceMinutes ?? 30;

    // Determine shift start time
    let shiftStartHour: number;
    let shiftStartMinute: number;
    let shiftName: string;
    let shiftId: string;
    let shiftEndTime: string;

    if (assignedShift) {
      const [h, m] = assignedShift.startTime.split(':').map(Number);
      shiftStartHour = h;
      shiftStartMinute = m;
      shiftName = assignedShift.name;
      shiftId = assignedShift.id;
      shiftEndTime = assignedShift.endTime;
    } else {
      // Fallback to defaults if no shift assigned
      shiftStartHour = 10;
      shiftStartMinute = 30;
      shiftName = 'Default Shift';
      shiftId = 'default';
      shiftEndTime = '18:30';
    }

    // Calculate if late: clock-in time > shift start + grace period
    const shiftStartMinutes = shiftStartHour * 60 + shiftStartMinute;
    const allowedMinutes = shiftStartMinutes + graceMinutes;
    const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();

    console.log(`[check-late] Employee: ${employeeId}`);
    console.log(`[check-late] Clock-in time: ${clockInTime.toISOString()} (${clockInTime.getHours()}:${String(clockInTime.getMinutes()).padStart(2, '0')})`);
    console.log(`[check-late] Clock-in minutes: ${clockInMinutes}, Allowed minutes: ${allowedMinutes} (shift start ${shiftStartHour}:${String(shiftStartMinute).padStart(2, '0')} + ${graceMinutes}min grace)`);

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
          id: shiftId,
          name: shiftName,
          startTime: `${shiftStartHour}:${String(shiftStartMinute).padStart(2, '0')}`,
          endTime: shiftEndTime,
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
        id: shiftId,
        name: shiftName,
        startTime: `${shiftStartHour}:${String(shiftStartMinute).padStart(2, '0')}`,
        endTime: shiftEndTime,
      },
      clockInTime: clockInTime.toISOString(),
      minutesLate: 0,
      attendanceRecordId,
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
