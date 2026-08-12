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
import { AttendancePolicy, AttendancePolicyFormData } from '@/types/attendance.types';
import {
  Settings,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  X,
} from 'lucide-react';

const DEFAULT_POLICY_FORM: AttendancePolicyFormData = {
  name: '',
  graceMinutes: 30,
  maxMonthlyDelayRequests: 2,
  maxBreakMinutes: 60,
  autoClockOutTime: '18:30',
  geolocationRequired: true,
  geolocationRadius: 100,
  overtimeMultiplier: 1.5,
  minDailyHours: 8,
  maxDailyHours: 12,
};

export default function AdminAttendanceSettingsPage() {
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AttendancePolicy | null>(null);
  const [formData, setFormData] = useState<AttendancePolicyFormData>(DEFAULT_POLICY_FORM);
  const [saving, setSaving] = useState(false);

  // Fetch policies on mount
  useEffect(() => {
    fetchPolicies();
  }, []);

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
      maxBreakMinutes: policy.maxBreakMinutes,
      autoClockOutTime: policy.autoClockOutTime,
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

      // Validate required fields
      if (!formData.name.trim()) {
        toast.error('Policy name is required');
        return;
      }

      if (formData.graceMinutes < 0 || formData.graceMinutes > 60) {
        toast.error('Grace period must be between 0 and 60 minutes');
        return;
      }

      if (formData.maxMonthlyDelayRequests < 0 || formData.maxMonthlyDelayRequests > 31) {
        toast.error('Max monthly delays must be between 0 and 31');
        return;
      }

      let response;
      if (editingPolicy) {
        // Update existing policy
        response = await authenticatedFetch(`/api/attendance/policies/${editingPolicy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        // Create new policy
        response = await authenticatedFetch('/api/attendance/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save policy');
      }

      toast.success(editingPolicy ? 'Policy updated successfully' : 'Policy created successfully');
      setShowPolicyModal(false);
      fetchPolicies();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      const response = await authenticatedFetch(`/api/attendance/policies/${policyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete policy');

      toast.success('Policy deleted successfully');
      fetchPolicies();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete policy');
    }
  };

  const updateFormData = (field: keyof AttendancePolicyFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Attendance Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Configure attendance policies, grace periods, and late detection rules
        </p>
      </div>

      <Tabs defaultValue="policies">
        <TabsList className="mb-6">
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Attendance Policies
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Shift Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attendance Policies</CardTitle>
              <Button onClick={handleCreatePolicy} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Policy
              </Button>
            </CardHeader>
            <CardContent>
              {policies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No attendance policies configured. Create one to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {policy.name}
                          </h3>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div>
                              <span className="font-medium">Grace Period:</span>{' '}
                              {policy.graceMinutes} min
                            </div>
                            <div>
                              <span className="font-medium">Max Monthly Delays:</span>{' '}
                              {policy.maxMonthlyDelayRequests}
                            </div>
                            <div>
                              <span className="font-medium">Auto Clock Out:</span>{' '}
                              {policy.autoClockOutTime}
                            </div>
                            <div>
                              <span className="font-medium">Geolocation:</span>{' '}
                              {policy.geolocationRequired ? 'Required' : 'Optional'}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPolicy(policy)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePolicy(policy.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts">
          <Card>
            <CardHeader>
              <CardTitle>Shift Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Manage shift definitions and employee assignments. Shift start times are used
                for late detection.
              </p>
              <Button onClick={() => window.location.href = '/admin/attendance-roster'}>
                Go to Shift Management
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Policy Create/Edit Modal */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? 'Edit Attendance Policy' : 'Create Attendance Policy'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Basic Information</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Policy Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="e.g., Default Policy, Night Shift Policy"
                />
              </div>
            </div>

            {/* Late Detection Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Late Detection & Delay Limits
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="graceMinutes">Grace Period (minutes)</Label>
                  <Input
                    id="graceMinutes"
                    type="number"
                    min={0}
                    max={60}
                    value={formData.graceMinutes}
                    onChange={(e) =>
                      updateFormData('graceMinutes', parseInt(e.target.value) || 0)
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Minutes after shift start before employee is considered late
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxMonthlyDelayRequests">Max Monthly Delays</Label>
                  <Input
                    id="maxMonthlyDelayRequests"
                    type="number"
                    min={0}
                    max={31}
                    value={formData.maxMonthlyDelayRequests}
                    onChange={(e) =>
                      updateFormData(
                        'maxMonthlyDelayRequests',
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Maximum delay sign-in requests allowed per month
                  </p>
                </div>
              </div>
            </div>

            {/* Break & Hours Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Break & Working Hours
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxBreakMinutes">Max Break Duration (minutes)</Label>
                  <Input
                    id="maxBreakMinutes"
                    type="number"
                    min={0}
                    max={480}
                    value={formData.maxBreakMinutes}
                    onChange={(e) =>
                      updateFormData('maxBreakMinutes', parseInt(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoClockOutTime">Auto Clock Out Time</Label>
                  <Input
                    id="autoClockOutTime"
                    type="time"
                    value={formData.autoClockOutTime}
                    onChange={(e) => updateFormData('autoClockOutTime', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minDailyHours">Min Daily Hours</Label>
                  <Input
                    id="minDailyHours"
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={formData.minDailyHours}
                    onChange={(e) =>
                      updateFormData('minDailyHours', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxDailyHours">Max Daily Hours</Label>
                  <Input
                    id="maxDailyHours"
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={formData.maxDailyHours}
                    onChange={(e) =>
                      updateFormData('maxDailyHours', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overtimeMultiplier">Overtime Multiplier</Label>
                  <Input
                    id="overtimeMultiplier"
                    type="number"
                    min={1}
                    max={3}
                    step={0.1}
                    value={formData.overtimeMultiplier}
                    onChange={(e) =>
                      updateFormData(
                        'overtimeMultiplier',
                        parseFloat(e.target.value) || 1
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Geolocation Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Geolocation Settings
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="geolocationRequired">Require Geolocation</Label>
                  <p className="text-xs text-gray-500">
                    Employees must be within radius to clock in
                  </p>
                </div>
                <Button
                  type="button"
                  variant={formData.geolocationRequired ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    updateFormData('geolocationRequired', !formData.geolocationRequired)
                  }
                >
                  {formData.geolocationRequired ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              {formData.geolocationRequired && (
                <div className="space-y-2">
                  <Label htmlFor="geolocationRadius">Geolocation Radius (meters)</Label>
                  <Input
                    id="geolocationRadius"
                    type="number"
                    min={0}
                    max={10000}
                    value={formData.geolocationRadius}
                    onChange={(e) =>
                      updateFormData('geolocationRadius', parseInt(e.target.value) || 0)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPolicyModal(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSavePolicy} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingPolicy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
