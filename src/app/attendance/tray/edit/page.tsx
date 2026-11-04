'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocsFromServer, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticatedFetch } from '@/lib/api-client';
import { calculateAttendanceHours, type BreakInput } from '@/lib/attendance-edit';
import { AdminGuard } from '@/components/Auth/PermissionGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'react-toastify';
import {
  ChevronLeft,
  Clock,
  Copy,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';

interface EditableBreak extends BreakInput {}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: Date;
  clockOut?: Date | null;
  createdAt?: Date | null;
  status: string;
  location?: any;
  breaks?: any[];
  totalHours?: number;
  regularHours?: number;
  overtimeHours?: number;
}

interface FormState {
  employeeId: string;
  employeeName: string;
  clockIn: string;
  clockOut: string;
  createdAt: string;
  status: string;
  latIn: string;
  lngIn: string;
  accIn: string;
  latOut: string;
  lngOut: string;
  accOut: string;
  breaks: EditableBreak[];
  totalHours: string;
  regularHours: string;
  overtimeHours: string;
}

const pad = (value: number) => String(value).padStart(2, '0');
const round2 = (value: number) => Math.round(value * 100) / 100;

const toDate = (value: any): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};

const toLocalInput = (value: any): string => {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toDateKey = (value: any): string => {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatDateTime = (value: any): string => {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const coords = (location: any): { latitude: number; longitude: number; accuracy?: number } | undefined => {
  if (!location) return undefined;
  const latitude = Number(location.latitude ?? location.lat);
  const longitude = Number(location.longitude ?? location.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  const accuracy = Number(location.accuracy);
  return {
    latitude,
    longitude,
    accuracy: location.accuracy !== undefined && Number.isFinite(accuracy) ? accuracy : undefined,
  };
};

const recordToForm = (record: AttendanceRecord): FormState => {
  const inLocation = coords(record.location?.clockIn);
  const outLocation = coords(record.location?.clockOut);
  return {
    employeeId: record.employeeId || '',
    employeeName: record.employeeName || '',
    clockIn: toLocalInput(record.clockIn),
    clockOut: toLocalInput(record.clockOut),
    createdAt: toLocalInput(record.createdAt),
    status: record.status || 'active',
    latIn: inLocation ? String(inLocation.latitude) : '',
    lngIn: inLocation ? String(inLocation.longitude) : '',
    accIn: inLocation?.accuracy !== undefined ? String(inLocation.accuracy) : '',
    latOut: outLocation ? String(outLocation.latitude) : '',
    lngOut: outLocation ? String(outLocation.longitude) : '',
    accOut: outLocation?.accuracy !== undefined ? String(outLocation.accuracy) : '',
    breaks: (record.breaks ?? []).map((entry: any) => ({
      id: entry.id,
      startTime: toLocalInput(entry.startTime),
      endTime: toLocalInput(entry.endTime),
    })),
    totalHours: String(round2(Number(record.totalHours) || 0)),
    regularHours: String(round2(Number(record.regularHours) || 0)),
    overtimeHours: String(round2(Number(record.overtimeHours) || 0)),
  };
};

const emptyForm: FormState = {
  employeeId: '',
  employeeName: '',
  clockIn: '',
  clockOut: '',
  createdAt: '',
  status: 'active',
  latIn: '',
  lngIn: '',
  accIn: '',
  latOut: '',
  lngOut: '',
  accOut: '',
  breaks: [],
  totalHours: '0',
  regularHours: '0',
  overtimeHours: '0',
};

const statusVariant = (status: string): 'success' | 'info' | 'warning' =>
  status === 'completed' ? 'success' : status === 'active' ? 'info' : 'warning';

function AttendanceEditPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const openEditor = useCallback((record: AttendanceRecord) => {
    setEditing(record);
    setForm(recordToForm(record));
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocsFromServer(
        query(
          collection(db, 'attendance-records'),
          orderBy('clockIn', 'desc'),
          limit(200)
        )
      );

      const loaded: AttendanceRecord[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...(data as any),
          id: doc.id,
          clockIn: toDate(data.clockIn) ?? new Date(),
          clockOut: toDate(data.clockOut),
          createdAt: toDate(data.createdAt),
        };
      });

      setRecords(loaded);

      const targetId = new URLSearchParams(window.location.search).get('id');
      if (targetId) {
        const target = loaded.find((record) => record.id === targetId);
        if (target) openEditor(target);
      }
    } catch (error) {
      console.error('Failed to load attendance records:', error);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [openEditor]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !term ||
        `${record.employeeName ?? ''} ${record.employeeId ?? ''}`.toLowerCase().includes(term);
      const matchesDate = !dateFilter || toDateKey(record.clockIn) === dateFilter;
      return matchesSearch && matchesDate;
    });
  }, [records, search, dateFilter]);

  const setField = (key: keyof FormState, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setBreak = (index: number, key: 'startTime' | 'endTime', value: string) =>
    setForm((prev) => ({
      ...prev,
      breaks: prev.breaks.map((entry, i) => (i === index ? { ...entry, [key]: value } : entry)),
    }));

  const addBreak = () =>
    setForm((prev) => ({ ...prev, breaks: [...prev.breaks, { startTime: '', endTime: '' }] }));

  const removeBreak = (index: number) =>
    setForm((prev) => ({ ...prev, breaks: prev.breaks.filter((_, i) => i !== index) }));

  // One button: fill whichever location is empty from the one that has coordinates.
  const copyCoordinates = () => {
    const hasIn = !!(form.latIn.trim() || form.lngIn.trim() || form.accIn.trim());
    const hasOut = !!(form.latOut.trim() || form.lngOut.trim() || form.accOut.trim());
    if (!hasIn && !hasOut) {
      toast.error('Enter coordinates in either location first');
      return;
    }
    if (hasIn) {
      setForm((prev) => ({ ...prev, latOut: prev.latIn, lngOut: prev.lngIn, accOut: prev.accIn }));
      toast.success('Copied clock-in coordinates to clock-out');
    } else {
      setForm((prev) => ({ ...prev, latIn: prev.latOut, lngIn: prev.lngOut, accIn: prev.accOut }));
      toast.success('Copied clock-out coordinates to clock-in');
    }
  };

  // Auto-derive status and hours whenever times/locations/breaks change.
  useEffect(() => {
    if (!editing) return;
    setForm((prev) => {
      const next = { ...prev };
      let changed = false;

      const completed = !!(
        prev.clockIn && prev.clockOut &&
        prev.latIn.trim() && prev.lngIn.trim() &&
        prev.latOut.trim() && prev.lngOut.trim()
      );
      if (completed && prev.status !== 'completed') {
        next.status = 'completed';
        changed = true;
      } else if (!prev.clockOut && prev.clockIn && prev.status === 'completed') {
        next.status = 'active';
        changed = true;
      }

      const hours = calculateAttendanceHours(prev.clockIn, prev.clockOut, prev.breaks);
      if (hours) {
        for (const key of ['totalHours', 'regularHours', 'overtimeHours'] as const) {
          if (next[key] !== hours[key]) {
            next[key] = hours[key];
            changed = true;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [editing, form.clockIn, form.clockOut, form.latIn, form.lngIn, form.latOut, form.lngOut, form.breaks]);

  const buildLocation = (lat: string, lng: string, accuracy: string) => {
    if (!lat.trim() && !lng.trim()) return null;
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (
      !lat.trim() || !lng.trim() ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180
    ) {
      return undefined;
    }
    const location: { latitude: number; longitude: number; accuracy?: number } = { latitude, longitude };
    if (accuracy.trim()) {
      const value = Number(accuracy);
      if (!Number.isFinite(value) || value < 0) return undefined;
      location.accuracy = value;
    }
    return location;
  };

  const save = async () => {
    if (!editing) return;

    if (!form.employeeName.trim()) return toast.error('Employee name is required');
    const clockIn = new Date(form.clockIn);
    if (!form.clockIn || isNaN(clockIn.getTime())) return toast.error('Clock-in time is required');
    const clockOut = form.clockOut ? new Date(form.clockOut) : null;
    if (clockOut && isNaN(clockOut.getTime())) return toast.error('Invalid clock-out time');
    if (clockOut && clockOut < clockIn) return toast.error('Clock-out must be after clock-in');
    const createdAt = form.createdAt ? new Date(form.createdAt) : null;
    if (createdAt && isNaN(createdAt.getTime())) return toast.error('Invalid created-at time');

    const clockInLocation = buildLocation(form.latIn, form.lngIn, form.accIn);
    const clockOutLocation = buildLocation(form.latOut, form.lngOut, form.accOut);
    if (clockInLocation === undefined || clockOutLocation === undefined) {
      return toast.error('Location needs a valid latitude (-90..90), longitude (-180..180) and accuracy');
    }

    const breaks = [];
    for (const entry of form.breaks) {
      if (!entry.startTime && !entry.endTime) continue;
      if (!entry.startTime) return toast.error('Each break needs a start time');
      const start = new Date(entry.startTime);
      const end = entry.endTime ? new Date(entry.endTime) : null;
      if (isNaN(start.getTime()) || (end && isNaN(end.getTime()))) {
        return toast.error('Invalid break time');
      }
      if (end && end < start) return toast.error('Break end must be after break start');
      breaks.push({
        id: entry.id,
        startTime: start.toISOString(),
        endTime: end ? end.toISOString() : null,
      });
    }

    const hours = {
      totalHours: Number(form.totalHours),
      regularHours: Number(form.regularHours),
      overtimeHours: Number(form.overtimeHours),
    };
    if (Object.values(hours).some((value) => !Number.isFinite(value) || value < 0)) {
      return toast.error('Hours must be zero or positive numbers');
    }

    setSaving(true);
    try {
      const response = await authenticatedFetch(`/api/attendance/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          employeeId: form.employeeId.trim(),
          employeeName: form.employeeName.trim(),
          clockIn: clockIn.toISOString(),
          clockOut: clockOut ? clockOut.toISOString() : null,
          createdAt: createdAt ? createdAt.toISOString() : undefined,
          status: form.status,
          location: { clockIn: clockInLocation, clockOut: clockOutLocation },
          breaks,
          ...hours,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to update attendance record');
      }

      toast.success('Attendance record updated');
      setEditing(null);
      window.history.replaceState({}, '', '/attendance/tray/edit');
      await loadRecords();
    } catch (error: any) {
      console.error('Update attendance error:', error);
      toast.error(error.message || 'Failed to update attendance record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Pencil className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Attendance</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Admin only — correct timings, locations, breaks and hours.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadRecords} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Search employee"
              placeholder="Name or employee ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Input
              label="Filter by clock-in date"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading attendance records...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No attendance records found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const inLocation = coords(record.location?.clockIn);
            const outLocation = coords(record.location?.clockOut);
            return (
              <Card key={record.id}>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">{record.employeeName}</span>
                      <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{record.employeeId}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 dark:text-gray-300 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(record.clockIn)} → {formatDateTime(record.clockOut)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {inLocation ? 'In location' : 'No in location'} · {outLocation ? 'Out location' : 'No out location'}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEditor(record)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit attendance — {form.employeeName || 'record'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Employee name"
                value={form.employeeName}
                onChange={(event) => setField('employeeName', event.target.value)}
              />
              <Input
                label="Employee ID"
                value={form.employeeId}
                onChange={(event) => setField('employeeId', event.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Clock in"
                type="datetime-local"
                value={form.clockIn}
                onChange={(event) => setField('clockIn', event.target.value)}
                required
              />
              <Input
                label="Clock out"
                type="datetime-local"
                value={form.clockOut}
                onChange={(event) => setField('clockOut', event.target.value)}
              />
              <Input
                label="Created at"
                type="datetime-local"
                value={form.createdAt}
                onChange={(event) => setField('createdAt', event.target.value)}
              />
            </div>

            <div className="sm:w-56">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <select
                value={form.status}
                onChange={(event) => setField('status', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">active</option>
                <option value="completed">completed</option>
                <option value="incomplete">incomplete</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Clock-in location</p>
                <Button variant="outline" size="sm" onClick={copyCoordinates}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy coordinates
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Latitude" type="number" step="any" value={form.latIn}
                  onChange={(event) => setField('latIn', event.target.value)} />
                <Input label="Longitude" type="number" step="any" value={form.lngIn}
                  onChange={(event) => setField('lngIn', event.target.value)} />
                <Input label="Accuracy (m)" type="number" step="any" value={form.accIn}
                  onChange={(event) => setField('accIn', event.target.value)} />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Clock-out location</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Latitude" type="number" step="any" value={form.latOut}
                  onChange={(event) => setField('latOut', event.target.value)} />
                <Input label="Longitude" type="number" step="any" value={form.lngOut}
                  onChange={(event) => setField('lngOut', event.target.value)} />
                <Input label="Accuracy (m)" type="number" step="any" value={form.accOut}
                  onChange={(event) => setField('accOut', event.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Breaks</p>
                <Button variant="outline" size="sm" onClick={addBreak}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add break
                </Button>
              </div>
              {form.breaks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No breaks recorded.</p>
              ) : (
                <div className="space-y-3">
                  {form.breaks.map((entry, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <Input
                        label="Start"
                        type="datetime-local"
                        value={entry.startTime}
                        onChange={(event) => setBreak(index, 'startTime', event.target.value)}
                      />
                      <Input
                        label="End"
                        type="datetime-local"
                        value={entry.endTime}
                        onChange={(event) => setBreak(index, 'endTime', event.target.value)}
                      />
                      <Button variant="outline" size="sm" onClick={() => removeBreak(index)} className="h-10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Hours</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Auto-calculated from clock-in/out and breaks
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Total hours" type="number" step="0.01" min="0" value={form.totalHours}
                  onChange={(event) => setField('totalHours', event.target.value)} />
                <Input label="Regular hours" type="number" step="0.01" min="0" value={form.regularHours}
                  onChange={(event) => setField('regularHours', event.target.value)} />
                <Input label="Overtime hours" type="number" step="0.01" min="0" value={form.overtimeHours}
                  onChange={(event) => setField('overtimeHours', event.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return (
    <AdminGuard
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
            <ShieldAlert className="w-16 h-16 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Restricted</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            Only administrators can edit attendance records.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      }
    >
      <AttendanceEditPage />
    </AdminGuard>
  );
}
