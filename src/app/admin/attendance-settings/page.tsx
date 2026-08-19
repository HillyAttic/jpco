/**
 * Admin Attendance Settings Page
 * Admin page for configuring attendance policies and shift management
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { authenticatedFetch } from '@/lib/api-client';
import { AttendancePolicy, AttendancePolicyFormData, Shift, ShiftFormData } from '@/types/attendance.types';
import {
  Settings,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  X,
  Users,
} from 'lucide-react';

const DEFAULT_POLICY_FORM: AttendancePolicyFormData = {
  name: '',
  graceMinutes: 30,
  maxMonthlyDelayRequests: 2,
  geolocationRequired: true,
  geolocationRadius: 100,
  overtimeMultiplier: 1.5,
  minDailyHours: 8,
  maxDailyHours: 12,
};

const DEFAULT_SHIFT_FORM: ShiftFormData = {
  name: '',
  startTime: '09:00',
  endTime: '18:00',
  daysOfWeek: [1, 2, 3, 4, 5],
  breakDuration: 60,
  overtimeThreshold: 0,
  color: '#3B82F6',
};

interface Employee { id: string; name: string; email: string; }

export default function AdminAttendanceSettingsPage() {
  // --- Policy state ---
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AttendancePolicy | null>(null);
  const [formData, setFormData] = useState<AttendancePolicyFormData>(DEFAULT_POLICY_FORM);
  const [saving, setSaving] = useState(false);

  // --- Shift state ---
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftFormData>(DEFAULT_SHIFT_FORM);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignModalShift, setAssignModalShift] = useState<Shift | null>(null);
  const [assignSearch, setAssignSearch] = useState('');

  // --- Fetch on mount ---
  useEffect(() => {
    fetchPolicies();
    fetchShifts();
    fetchEmployees();
  }, []);

  // ==================== POLICY HANDLERS ====================

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/attendance/policies');
      if (!response.ok) throw new Error('Failed to fetch policies');
      const data = await response.json();
      setPolicies(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load attendance policies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = () => {
    setEditingPolicy(null);
    setFormData(DEFAULT_POLICY_FORM);
    setShowPolicyModal(true);
  };

  const handleEditPolicy = (policy: AttendancePolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      graceMinutes: policy.graceMinutes,
      maxMonthlyDelayRequests: policy.maxMonthlyDelayRequests,
      geolocationRequired: policy.geolocationRequired,
      geolocationRadius: policy.geolocationRadius,
      overtimeMultiplier: policy.overtimeMultiplier,
      minDailyHours: policy.minDailyHours,
      maxDailyHours: policy.maxDailyHours,
    });
    setShowPolicyModal(true);
  };

  const handleSavePolicy = async () => {
    try {
      setSaving(true);
      if (!formData.name.trim()) { toast.error('Policy name is required'); return; }
      if (formData.graceMinutes < 0 || formData.graceMinutes > 60) { toast.error('Grace period must be between 0 and 60 minutes'); return; }
      if (formData.maxMonthlyDelayRequests < 0 || formData.maxMonthlyDelayRequests > 31) { toast.error('Max monthly delays must be between 0 and 31'); return; }

      let response;
      if (editingPolicy) {
        response = await authenticatedFetch(`/api/attendance/policies/${editingPolicy.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
        });
      } else {
        response = await authenticatedFetch('/api/attendance/policies', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
        });
      }
      if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Failed to save policy'); }
      toast.success(editingPolicy ? 'Policy updated' : 'Policy created');
      setShowPolicyModal(false);
      fetchPolicies();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save policy');
    } finally { setSaving(false); }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Delete this policy?')) return;
    try {
      const r = await authenticatedFetch(`/api/attendance/policies/${policyId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
      toast.success('Policy deleted');
      fetchPolicies();
    } catch (error: any) { toast.error(error.message); }
  };

  const updateFormData = (field: keyof AttendancePolicyFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ==================== SHIFT HANDLERS ====================

  const fetchShifts = async () => {
    try {
      setShiftLoading(true);
      const r = await authenticatedFetch('/api/shifts');
      if (!r.ok) throw new Error('Failed to fetch shifts');
      setShifts(await r.json());
    } catch (error: any) {
      toast.error(error.message || 'Failed to load shifts');
    } finally { setShiftLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const r = await authenticatedFetch('/api/employees');
      if (!r.ok) return;
      const raw = await r.json();
      const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setEmployees(list.filter((e: any) => e.status !== 'resigned').map((e: any) => ({ id: e.id, name: e.name, email: e.email })));
    } catch { /* non-critical */ }
  };

  const handleCreateShift = () => {
    setEditingShift(null);
    setShiftForm(DEFAULT_SHIFT_FORM);
    setShowShiftModal(true);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      daysOfWeek: shift.daysOfWeek,
      breakDuration: shift.breakDuration,
      overtimeThreshold: shift.overtimeThreshold,
      color: shift.color,
    });
    setShowShiftModal(true);
  };

  const handleSaveShift = async () => {
    try {
      setShiftSaving(true);
      if (!shiftForm.name.trim()) { toast.error('Shift name is required'); return; }

      let r;
      if (editingShift) {
        r = await authenticatedFetch(`/api/shifts/${editingShift.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shiftForm),
        });
      } else {
        r = await authenticatedFetch('/api/shifts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shiftForm),
        });
      }
      if (!r.ok) { const err = await r.json(); throw new Error(err.message || 'Failed to save shift'); }
      toast.success(editingShift ? 'Shift updated' : 'Shift created');
      setShowShiftModal(false);
      fetchShifts();
    } catch (error: any) { toast.error(error.message || 'Failed to save shift'); }
    finally { setShiftSaving(false); }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('Delete this shift?')) return;
    try {
      const r = await authenticatedFetch(`/api/shifts/${shiftId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
      toast.success('Shift deleted');
      fetchShifts();
    } catch (error: any) { toast.error(error.message); }
  };

  const handleToggleEmployee = async (shift: Shift, employeeId: string) => {
    const isAssigned = shift.assignedEmployees?.includes(employeeId);
    try {
      const r = await authenticatedFetch(`/api/shifts/${shift.id}/${isAssigned ? 'unassign' : 'assign'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId }),
      });
      if (!r.ok) { const err = await r.json(); throw new Error(err.message || 'Failed'); }
      toast.success(isAssigned ? 'Employee unassigned' : 'Employee assigned');
      setAssignModalShift((prev) => prev && {
        ...prev,
        assignedEmployees: isAssigned
          ? (prev.assignedEmployees || []).filter((id) => id !== employeeId)
          : [...(prev.assignedEmployees || []), employeeId],
      });
      fetchShifts();
    } catch (error: any) { toast.error(error.message); }
  };

  const handleToggleAllEmployees = async (shift: Shift, employees: Employee[]) => {
    if (employees.length === 0) return;
    try {
      const allAssigned = employees.every((e) => shift.assignedEmployees?.includes(e.id));
      const ids = employees
        .filter((e) => allAssigned
          ? shift.assignedEmployees?.includes(e.id)
          : !shift.assignedEmployees?.includes(e.id))
        .map((e) => e.id);
      if (ids.length === 0) return;
      const r = await authenticatedFetch(`/api/shifts/${shift.id}/${allAssigned ? 'unassign' : 'assign'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeIds: ids }),
      });
      if (!r.ok) { const err = await r.json(); throw new Error(err.message || 'Failed'); }
      toast.success(allAssigned ? 'Employees unassigned' : 'Employees assigned');
      setAssignModalShift((prev) => prev && {
        ...prev,
        assignedEmployees: allAssigned
          ? (prev.assignedEmployees || []).filter((id) => !ids.includes(id))
          : Array.from(new Set([...(prev.assignedEmployees || []), ...ids])),
      });
      fetchShifts();
    } catch (error: any) { toast.error(error.message); }
  };

  const updateShiftForm = (field: keyof ShiftFormData, value: any) => {
    setShiftForm((prev) => ({ ...prev, [field]: value }));
  };

  const filteredAssignEmployees = employees.filter((emp) =>
    !assignSearch ||
    emp.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
    emp.email.toLowerCase().includes(assignSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Attendance Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Configure attendance policies, grace periods, and late detection rules</p>
      </div>

      <Tabs defaultValue="policies">
        <TabsList className="mb-6">
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Attendance Policies
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Shift Configuration
          </TabsTrigger>
        </TabsList>

        {/* ==================== POLICIES TAB ==================== */}
        <TabsContent value="policies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attendance Policies</CardTitle>
              <Button onClick={handleCreatePolicy} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Policy</Button>
            </CardHeader>
            <CardContent>
              {policies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No policies configured. Create one to get started.</div>
              ) : (
                <div className="space-y-4">
                  {policies.map((policy) => (
                    <div key={policy.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">{policy.name}</h3>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div><span className="font-medium">Grace:</span> {policy.graceMinutes} min</div>
                            <div><span className="font-medium">Max Delays:</span> {policy.maxMonthlyDelayRequests}/mo</div>
                            <div><span className="font-medium">Geolocation:</span> {policy.geolocationRequired ? 'Required' : 'Optional'}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditPolicy(policy)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeletePolicy(policy.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== SHIFTS TAB ==================== */}
        <TabsContent value="shifts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Shifts</CardTitle>
              <Button onClick={handleCreateShift} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Shift</Button>
            </CardHeader>
            <CardContent>
              {shiftLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No shifts configured. Create one to get started.</div>
              ) : (
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <div key={shift.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} />
                            <h3 className="font-medium text-gray-900 dark:text-white">{shift.name}</h3>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div><span className="font-medium">Start:</span> {shift.startTime}</div>
                            <div>
                              <span className="font-medium">Assigned:</span>{' '}
                              {shift.assignedEmployees?.length || 0} employees
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setAssignSearch(''); setAssignModalShift(shift); }} title="Assign employees">
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditShift(shift)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteShift(shift.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== POLICY MODAL ==================== */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'Edit Policy' : 'Create Policy'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="policy-name">Policy Name</Label>
                <Input id="policy-name" value={formData.name} onChange={(e) => updateFormData('name', e.target.value)} placeholder="e.g., Default Policy" />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Late Detection & Delay Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grace Period (min)</Label>
                  <Input type="number" min={0} max={60} value={formData.graceMinutes} onChange={(e) => updateFormData('graceMinutes', parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Max Monthly Delays</Label>
                  <Input type="number" min={0} max={31} value={formData.maxMonthlyDelayRequests} onChange={(e) => updateFormData('maxMonthlyDelayRequests', parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Break & Working Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Daily Hours</Label>
                  <Input type="number" min={0} max={24} step={0.5} value={formData.minDailyHours} onChange={(e) => updateFormData('minDailyHours', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Max Daily Hours</Label>
                  <Input type="number" min={0} max={24} step={0.5} value={formData.maxDailyHours} onChange={(e) => updateFormData('maxDailyHours', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Overtime Multiplier</Label>
                  <Input type="number" min={1} max={3} step={0.1} value={formData.overtimeMultiplier} onChange={(e) => updateFormData('overtimeMultiplier', parseFloat(e.target.value) || 1)} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Geolocation</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Geolocation</Label>
                  <p className="text-xs text-gray-500">Employees must be within radius to clock in</p>
                </div>
                <Button type="button" variant={formData.geolocationRequired ? 'default' : 'outline'} size="sm"
                  onClick={() => updateFormData('geolocationRequired', !formData.geolocationRequired)}>
                  {formData.geolocationRequired ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              {formData.geolocationRequired && (
                <div className="space-y-2">
                  <Label>Radius (meters)</Label>
                  <Input type="number" min={0} max={10000} value={formData.geolocationRadius} onChange={(e) => updateFormData('geolocationRadius', parseInt(e.target.value) || 0)} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPolicyModal(false)}><X className="h-4 w-4 mr-2" /> Cancel</Button>
            <Button onClick={handleSavePolicy} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingPolicy ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== SHIFT MODAL ==================== */}
      <Dialog open={showShiftModal} onOpenChange={setShowShiftModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Edit Shift' : 'Create Shift'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Shift Name</Label>
              <Input value={shiftForm.name} onChange={(e) => updateShiftForm('name', e.target.value)} placeholder="e.g., Morning Shift" />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={shiftForm.startTime} onChange={(e) => updateShiftForm('startTime', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShiftModal(false)}><X className="h-4 w-4 mr-2" /> Cancel</Button>
            <Button onClick={handleSaveShift} disabled={shiftSaving}>
              {shiftSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingShift ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== ASSIGN EMPLOYEES MODAL ==================== */}
      <Dialog open={!!assignModalShift} onOpenChange={() => setAssignModalShift(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Employees – {assignModalShift?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {employees.length === 0 ? (
              <p className="text-gray-500 text-sm">No employees found.</p>
            ) : (
              <>
                <Input
                  type="search"
                  placeholder="Search by name or email..."
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  className="mb-3"
                />
                {filteredAssignEmployees.length > 0 && (() => {
                  const assigned = filteredAssignEmployees.filter((e) => assignModalShift?.assignedEmployees?.includes(e.id));
                  const allAssigned = assigned.length === filteredAssignEmployees.length;
                  return (
                    <label className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white cursor-pointer select-none">
                      <input type="checkbox" checked={allAssigned}
                        ref={(el) => { if (el) el.indeterminate = assigned.length > 0 && !allAssigned; }}
                        onChange={() => assignModalShift && handleToggleAllEmployees(assignModalShift, filteredAssignEmployees)}
                        className="rounded animate-check" />
                      Select All ({filteredAssignEmployees.length})
                    </label>
                  );
                })()}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                  {filteredAssignEmployees.map((emp) => {
                    const assigned = assignModalShift?.assignedEmployees?.includes(emp.id) ?? false;
                    return (
                      <label key={emp.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <input type="checkbox" checked={assigned}
                          onChange={() => assignModalShift && handleToggleEmployee(assignModalShift, emp.id)}
                          className="rounded" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</div>
                          <div className="text-xs text-gray-500">{emp.email}</div>
                        </div>
                      </label>
                    );
                  })}
                  {filteredAssignEmployees.length === 0 && (
                    <p className="text-sm text-gray-500 col-span-full">No employees match your search.</p>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalShift(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
