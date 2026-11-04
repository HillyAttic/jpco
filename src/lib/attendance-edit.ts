/**
 * Pure validation helpers for admin attendance-record edits.
 * Kept separate from the route so they can be unit tested without Firebase.
 */

export interface ParsedLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface BreakInput {
  id?: string;
  startTime: string;
  endTime: string;
}

/** `null` clears the value, `undefined` means it was invalid. */
export function parseAttendanceDate(value: unknown): Date | null | undefined {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

/** `null` clears the value, `undefined` means it was invalid. */
export function parseAttendanceLocation(value: any): ParsedLocation | null | undefined {
  if (value === null || value === undefined) return null;
  const latitude = Number(value.latitude ?? value.lat);
  const longitude = Number(value.longitude ?? value.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;

  const result: ParsedLocation = { latitude, longitude };
  if (value.accuracy !== null && value.accuracy !== undefined && value.accuracy !== '') {
    const accuracy = Number(value.accuracy);
    if (!Number.isFinite(accuracy) || accuracy < 0) return undefined;
    result.accuracy = accuracy;
  }
  return result;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Work hours = clock-out − clock-in − completed breaks; overtime above 8h. */
export function calculateAttendanceHours(
  clockIn: string,
  clockOut: string,
  breaks: BreakInput[]
): { totalHours: string; regularHours: string; overtimeHours: string } | null {
  if (!clockIn || !clockOut) return null;
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;

  const breakMs = breaks.reduce((sum, entry) => {
    if (!entry.startTime || !entry.endTime) return sum;
    const breakStart = new Date(entry.startTime).getTime();
    const breakEnd = new Date(entry.endTime).getTime();
    return breakEnd > breakStart ? sum + (breakEnd - breakStart) : sum;
  }, 0);

  const hours = Math.max(0, (end.getTime() - start.getTime() - breakMs) / 3600000);
  const overtime = Math.max(0, hours - 8);
  return {
    totalHours: String(round2(hours)),
    regularHours: String(round2(hours - overtime)),
    overtimeHours: String(round2(overtime)),
  };
}
