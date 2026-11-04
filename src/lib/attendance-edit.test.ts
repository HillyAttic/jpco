import {
  calculateAttendanceHours,
  parseAttendanceDate,
  parseAttendanceLocation,
} from '@/lib/attendance-edit';

describe('attendance edit validation helpers', () => {
  describe('parseAttendanceDate', () => {
    it('parses ISO strings and treats null/empty as a clear', () => {
      expect(parseAttendanceDate('2026-11-03T06:15:00.000Z')?.toISOString())
        .toBe('2026-11-03T06:15:00.000Z');
      expect(parseAttendanceDate(null)).toBeNull();
      expect(parseAttendanceDate('')).toBeNull();
    });

    it('rejects invalid values', () => {
      expect(parseAttendanceDate('not-a-date')).toBeUndefined();
      expect(parseAttendanceDate(12345)).toBeUndefined();
      expect(parseAttendanceDate(undefined)).toBeUndefined();
    });
  });

  describe('parseAttendanceLocation', () => {
    it('accepts map-shaped locations with optional accuracy', () => {
      expect(parseAttendanceLocation({ latitude: 28.7, longitude: 77.1, accuracy: 25.5 }))
        .toEqual({ latitude: 28.7, longitude: 77.1, accuracy: 25.5 });
      expect(parseAttendanceLocation({ lat: 28, lng: 77 })).toEqual({ latitude: 28, longitude: 77 });
    });

    it('clears null and rejects out-of-range or partial coordinates', () => {
      expect(parseAttendanceLocation(null)).toBeNull();
      expect(parseAttendanceLocation({ latitude: 91, longitude: 77 })).toBeUndefined();
      expect(parseAttendanceLocation({ latitude: 28, longitude: 181 })).toBeUndefined();
      expect(parseAttendanceLocation({ latitude: 28 })).toBeUndefined();
      expect(parseAttendanceLocation({ latitude: 28, longitude: 77, accuracy: -1 })).toBeUndefined();
    });
  });

  describe('calculateAttendanceHours', () => {
    it('subtracts breaks and splits overtime above 8h', () => {
      expect(calculateAttendanceHours(
        '2026-11-04T09:00',
        '2026-11-04T18:30',
        [{ startTime: '2026-11-04T13:00', endTime: '2026-11-04T13:30' }]
      )).toEqual({ totalHours: '9', regularHours: '8', overtimeHours: '1' });
    });

    it('returns null without a valid clock-out', () => {
      expect(calculateAttendanceHours('2026-11-04T09:00', '', [])).toBeNull();
      expect(calculateAttendanceHours('2026-11-04T18:00', '2026-11-04T09:00', [])).toBeNull();
    });
  });
});
