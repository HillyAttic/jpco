import { NextRequest, NextResponse } from 'next/server';
import { attendanceAdminService } from '@/services/attendance-admin.service';
import { ErrorResponses } from '@/lib/api-error-handler';
import { parseAttendanceDate as parseDate, parseAttendanceLocation as parseLocation } from '@/lib/attendance-edit';

const VALID_STATUS = ['active', 'completed', 'incomplete'];

// Admin-only correction of an attendance record (times, locations, breaks, hours).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }
    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can edit attendance records');
    }

    const { id } = await params;
    const body: any = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return ErrorResponses.badRequest('Invalid request body');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const { Timestamp } = await import('firebase-admin/firestore');
    const docRef = adminDb.collection('attendance-records').doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return ErrorResponses.notFound('Attendance record');
    }

    const existing = snapshot.data()!;
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const updates: Record<string, any> = {};

    if (has('employeeName')) {
      if (typeof body.employeeName !== 'string' || !body.employeeName.trim()) {
        return ErrorResponses.badRequest('Employee name is required');
      }
      updates.employeeName = body.employeeName.trim();
    }
    if (has('employeeId')) {
      if (typeof body.employeeId !== 'string' || !body.employeeId.trim()) {
        return ErrorResponses.badRequest('Employee ID is required');
      }
      updates.employeeId = body.employeeId.trim();
    }

    const existingClockIn = existing.clockIn?.toDate ? existing.clockIn.toDate() : new Date(existing.clockIn);
    let clockIn = existingClockIn;
    let clockOut = existing.clockOut?.toDate
      ? existing.clockOut.toDate()
      : existing.clockOut ? new Date(existing.clockOut) : null;

    if (has('clockIn')) {
      const parsed = parseDate(body.clockIn);
      if (!parsed) return ErrorResponses.badRequest('Valid clock-in time is required');
      clockIn = parsed;
      updates.clockIn = Timestamp.fromDate(parsed);
    }
    if (has('clockOut')) {
      const parsed = parseDate(body.clockOut);
      if (parsed === undefined) return ErrorResponses.badRequest('Invalid clock-out time');
      clockOut = parsed;
      updates.clockOut = parsed ? Timestamp.fromDate(parsed) : null;
    }
    if (!isNaN(clockIn.getTime()) && clockOut && clockOut < clockIn) {
      return ErrorResponses.badRequest('Clock-out must be after clock-in');
    }

    if (has('createdAt')) {
      const parsed = parseDate(body.createdAt);
      if (!parsed) return ErrorResponses.badRequest('Invalid created-at time');
      updates.createdAt = Timestamp.fromDate(parsed);
    }

    if (has('status')) {
      if (!VALID_STATUS.includes(body.status)) {
        return ErrorResponses.badRequest(`Status must be one of: ${VALID_STATUS.join(', ')}`);
      }
      updates.status = body.status;
    }

    if (has('location')) {
      const source = body.location ?? {};
      const clockInLocation = parseLocation(source.clockIn);
      const clockOutLocation = parseLocation(source.clockOut);
      if (clockInLocation === undefined || clockOutLocation === undefined) {
        return ErrorResponses.badRequest('Invalid location coordinates');
      }
      updates.location =
        clockInLocation || clockOutLocation
          ? { clockIn: clockInLocation ?? null, clockOut: clockOutLocation ?? null }
          : null;
    }

    if (has('breaks')) {
      if (!Array.isArray(body.breaks)) {
        return ErrorResponses.badRequest('Breaks must be an array');
      }
      const breaks = [];
      for (const entry of body.breaks) {
        const startTime = parseDate(entry?.startTime);
        if (!startTime) return ErrorResponses.badRequest('Each break needs a valid start time');
        const endTime = entry.endTime === null || entry.endTime === undefined || entry.endTime === ''
          ? null
          : parseDate(entry.endTime);
        if (endTime === undefined) return ErrorResponses.badRequest('Invalid break end time');
        if (endTime && endTime < startTime) {
          return ErrorResponses.badRequest('Break end must be after break start');
        }
        breaks.push({
          id: typeof entry.id === 'string' && entry.id ? entry.id : `break_${startTime.getTime()}`,
          startTime: Timestamp.fromDate(startTime),
          endTime: endTime ? Timestamp.fromDate(endTime) : null,
          duration: endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : 0,
        });
      }
      updates.breaks = breaks;
    }

    for (const key of ['totalHours', 'regularHours', 'overtimeHours'] as const) {
      if (has(key)) {
        const value = Number(body[key]);
        if (!Number.isFinite(value) || value < 0) {
          return ErrorResponses.badRequest(`Invalid ${key}`);
        }
        updates[key] = Math.round(value * 100) / 100;
      }
    }

    updates.updatedAt = Timestamp.now();
    await docRef.update(updates);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Update attendance error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to update attendance record' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can delete attendance records');
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Attendance record ID is required' },
        { status: 400 }
      );
    }

    console.log('Deleting attendance record with ID:', id);
    await attendanceAdminService.deleteAttendanceRecord(id);

    return NextResponse.json(
      { message: 'Attendance record deleted successfully' },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Delete attendance error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to delete attendance record' },
      { status: 500 }
    );
  }
}