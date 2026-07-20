/**
 * TemplateManager Component
 * CRUD interface for salary slip templates on the admin salary-config page.
 *
 * Admins can:
 *   - View all templates in a list
 *   - Create a new template (seeded from the default layout)
 *   - Edit a template (rename, toggle sections/fields, rename field labels)
 *   - Delete a template
 *   - View a preview of the template
 */

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import * as Dialog from '@radix-ui/react-dialog';
import { payrollService } from '@/services/payroll.service';
import {
  SalarySlipTemplate,
  SalarySlipTemplateSection,
  SalarySlipTemplateField,
  DEFAULT_SALARY_SLIP_TEMPLATE,
} from '@/types/payroll.types';
import { Plus, Pencil, Trash2, Copy, X } from 'lucide-react';

// ─── Editor State ────────────────────────────────────────────────────────────
// A mutable working copy that's easier to edit than the nested Firestore shape.

type DraftTemplate = {
  title: string;
  sections: SalarySlipTemplateSection[];
  showFooterNote: boolean;
  showSlipNumber: boolean;
  footerNote: string;
};

const toDraft = (tpl: SalarySlipTemplate): DraftTemplate => ({
  title: tpl.title,
  sections: tpl.sections.map((s) => ({
    ...s,
    fields: s.fields.map((f) => ({ ...f })),
  })),
  showFooterNote: tpl.showFooterNote,
  showSlipNumber: tpl.showSlipNumber,
  footerNote: tpl.footerNote ?? '',
});

const emptyDraft = (): DraftTemplate => ({
  title: 'New Template',
  sections: DEFAULT_SALARY_SLIP_TEMPLATE.sections.map((s) => ({
    ...s,
    fields: s.fields.map((f) => ({ ...f })),
  })),
  showFooterNote: true,
  showSlipNumber: true,
  footerNote: '',
});

export function TemplateManager() {
  const [templates, setTemplates] = useState<SalarySlipTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftTemplate>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<SalarySlipTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const list = await payrollService.getTemplates();
      setTemplates(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load salary slip templates');
    } finally {
      setLoading(false);
    }
  };

  // ── Editor handlers ───────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setEditorOpen(true);
  };

  const openEdit = (tpl: SalarySlipTemplate) => {
    setEditingId(tpl.id ?? null);
    setDraft(toDraft(tpl));
    setEditorOpen(true);
  };

  const openDuplicate = (tpl: SalarySlipTemplate) => {
    setEditingId(null);
    setDraft({ ...toDraft(tpl), title: `${tpl.title} (Copy)` });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error('Template name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(),
        sections: draft.sections,
        showFooterNote: draft.showFooterNote,
        showSlipNumber: draft.showSlipNumber,
        footerNote: draft.footerNote,
      };

      let ok = false;
      if (editingId) {
        ok = await payrollService.updateTemplate(editingId, payload);
      } else {
        const created = await payrollService.createTemplate(payload);
        ok = !!created;
      }

      if (ok) {
        toast.success(editingId ? 'Template updated' : 'Template created');
        setEditorOpen(false);
        await fetchTemplates();
      } else {
        toast.error('Failed to save template');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tpl: SalarySlipTemplate) => {
    if (!tpl.id) return;
    if (!confirm(`Delete template "${tpl.title}"? This cannot be undone.`)) return;
    try {
      const ok = await payrollService.deleteTemplate(tpl.id);
      if (ok) {
        toast.success('Template deleted');
        await fetchTemplates();
      } else {
        toast.error('Failed to delete template');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete template');
    }
  };

  // ── Draft mutation helpers ────────────────────────────────────────────────

  const updateSection = (
    sectionIdx: number,
    patch: Partial<SalarySlipTemplateSection>
  ) => {
    setDraft((d) => {
      const sections = [...d.sections];
      sections[sectionIdx] = { ...sections[sectionIdx], ...patch };
      return { ...d, sections };
    });
  };

  const updateField = (
    sectionIdx: number,
    fieldIdx: number,
    patch: Partial<SalarySlipTemplateField>
  ) => {
    setDraft((d) => {
      const sections = d.sections.map((s, si) => {
        if (si !== sectionIdx) return s;
        return {
          ...s,
          fields: s.fields.map((f, fi) =>
            fi === fieldIdx ? { ...f, ...patch } : f
          ),
        };
      });
      return { ...d, sections };
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Salary Slip Templates
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure which fields and sections appear on generated salary slips.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Template
        </Button>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-3">
              No templates yet. Create one to customise the layout of salary slips.
            </p>
            <Button onClick={openCreate} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Create Template
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {templates.map((tpl) => {
              const visibleSections = tpl.sections.filter((s) => s.visible).length;
              const totalSections = tpl.sections.length;
              const visibleFields = tpl.sections.reduce(
                (acc, s) => acc + (s.visible ? s.fields.filter((f) => f.visible).length : 0),
                0
              );
              return (
                <li
                  key={tpl.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {tpl.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {visibleSections}/{totalSections} sections visible ·{' '}
                      {visibleFields} fields shown
                      {tpl.showFooterNote ? ' · footer note on' : ' · footer note off'}
                      {!tpl.showSlipNumber ? ' · slip number hidden' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewTemplate(tpl);
                        setPreviewOpen(true);
                      }}
                      title="Preview"
                    >
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(tpl)}
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDuplicate(tpl)}
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tpl)}
                      title="Delete"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Editor Dialog */}
      <Dialog.Root open={editorOpen} onOpenChange={setEditorOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content
            className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-gray-800 z-50 overflow-y-auto shadow-xl"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingId ? 'Edit Template' : 'New Template'}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-gray-500 dark:text-gray-400">
                  Toggle sections and fields; rename labels. Changes apply to future
                  generated slips.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon">
                  <X className="w-4 h-4" />
                </Button>
              </Dialog.Close>
            </div>

            <div className="p-4 space-y-6">
              {/* Template name */}
              <div className="space-y-2">
                <Label htmlFor="tpl-title">Template Name</Label>
                <Input
                  id="tpl-title"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="e.g. Default Template"
                />
              </div>

              {/* Sections */}
              {draft.sections.map((section, si) => (
                <div
                  key={section.key}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={section.visible}
                        onChange={(e) =>
                          updateSection(si, { visible: e.target.checked })
                        }
                        className="rounded border-gray-300"
                      />
                      <span
                        className={`font-semibold ${
                          section.visible
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-400 line-through'
                        }`}
                      >
                        {section.title}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {section.fields.filter((f) => f.visible).length}/
                      {section.fields.length} fields
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {section.fields.map((field, fi) => (
                      <div
                        key={field.key}
                        className="flex items-center gap-3 p-2 pl-4"
                      >
                        <input
                          type="checkbox"
                          checked={field.visible}
                          disabled={!section.visible}
                          onChange={(e) =>
                            updateField(si, fi, { visible: e.target.checked })
                          }
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1 grid grid-cols-[120px_1fr] gap-2 items-center">
                          <span className="text-xs text-gray-500 font-mono">
                            {field.key}
                          </span>
                          <Input
                            value={field.label}
                            disabled={!section.visible}
                            onChange={(e) =>
                              updateField(si, fi, { label: e.target.value })
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Footer options */}
              <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.showFooterNote}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, showFooterNote: e.target.checked }))
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Show footer note
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.showSlipNumber}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, showSlipNumber: e.target.checked }))
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Show slip number
                  </span>
                </label>

                {draft.showFooterNote && (
                  <div className="pt-2">
                    <Label htmlFor="tpl-footer">Footer note override (optional)</Label>
                    <Textarea
                      id="tpl-footer"
                      value={draft.footerNote}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, footerNote: e.target.value }))
                      }
                      placeholder="Leave blank to use the global payroll settings footer note"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Preview Dialog */}
      <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <Dialog.Title className="font-semibold">
                  Template Preview: {previewTemplate?.title}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon">
                    <X className="w-4 h-4" />
                  </Button>
                </Dialog.Close>
              </div>
              <div className="p-6">
                {previewTemplate && <TemplatePreview template={previewTemplate} />}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// ─── Static Preview ──────────────────────────────────────────────────────────
// Renders a mini salary slip honouring the template's visibility/labels.
// Uses mock data so admins can see the layout before any slips exist.

function TemplatePreview({ template }: { template: SalarySlipTemplate }) {
  const visibleField = (sectionKey: string, fieldKey: string) => {
    const section = template.sections.find((s) => s.key === sectionKey);
    if (!section || !section.visible) return null;
    return section.fields.find((f) => f.key === fieldKey && f.visible);
  };

  const fieldLabel = (sectionKey: string, fieldKey: string) =>
    visibleField(sectionKey, fieldKey)?.label ?? null;

  const mock = {
    name: 'Amit Sharma',
    pan: 'ABCDE1234F',
    employeeId: 'EMP001',
    department: 'Engineering',
    designation: 'Senior Engineer',
    doj: '15/01/2023',
    totalDaysInMonth: 31,
    paidDays: 22,
    lopDays: 0,
    present: 20,
    wfh: 2,
    holiday: 0,
    approvedLeave: 0,
    unapprovedLeave: 0,
    halfDay: 0,
    basic: 40000,
    hra: 20000,
    special: 40000,
    epf: 0,
    esi: 0,
    professionalTax: 0,
    tds: 0,
    loanRecovery: 0,
    otherDeduction: 0,
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="border border-gray-300 p-6 text-sm text-black bg-white max-w-[720px] mx-auto font-sans">
      <div className="text-center mb-4">
        <div className="font-bold text-lg">Company Name</div>
        <div className="text-xs text-gray-600">Company Address Line</div>
      </div>

      <div className="border-b-2 border-gray-800 pb-2 mb-4">
        <div className="font-bold text-center text-base">SALARY SLIP</div>
        <div className="text-center text-xs">Pay Slip for July 2026</div>
      </div>

      {/* Employee details */}
      {(() => {
        const section = template.sections.find((s) => s.key === 'employeeDetails');
        if (!section || !section.visible) return null;
        const visibleFields = section.fields.filter((f) => f.visible);
        if (visibleFields.length === 0) return null;
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 text-xs">
            {visibleFields.map((f) => (
              <div key={f.key} className="flex">
                <span className="font-semibold w-36">{f.label}:</span>
                <span>
                  {String((mock as any)[f.key] ?? '-') || '-'}
                </span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Attendance */}
      {(() => {
        const section = template.sections.find((s) => s.key === 'attendance');
        if (!section || !section.visible) return null;
        const visibleFields = section.fields.filter((f) => f.visible);
        if (visibleFields.length === 0) return null;
        return (
          <div className="border-t pt-3 mb-4">
            <div className="font-bold text-sm mb-2">{section.title}</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {visibleFields.map((f) => (
                <div key={f.key} className="flex justify-between">
                  <span>{f.label}:</span>
                  <span className="font-semibold">
                    {String((mock as any)[f.key] ?? '-')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Earnings & Deductions */}
      <div className="border-t pt-3 mb-4 grid grid-cols-2 gap-6">
        {(() => {
          const section = template.sections.find((s) => s.key === 'earnings');
          if (!section || !section.visible) return null;
          const visibleFields = section.fields.filter((f) => f.visible);
          if (visibleFields.length === 0) return null;
          const total = visibleFields.reduce(
            (acc, f) => acc + ((mock as any)[f.key] ?? 0),
            0
          );
          return (
            <div>
              <div className="font-bold text-sm text-center border-b pb-1 mb-2">
                {section.title}
              </div>
              <div className="space-y-1 text-xs">
                {visibleFields.map((f) => (
                  <div key={f.key} className="flex justify-between">
                    <span>{f.label}</span>
                    <span>{fmt((mock as any)[f.key] ?? 0)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Total Earnings</span>
                  <span>{fmt(total)}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {(() => {
          const section = template.sections.find((s) => s.key === 'deductions');
          if (!section || !section.visible) return null;
          const visibleFields = section.fields.filter((f) => f.visible);
          if (visibleFields.length === 0) return null;
          const total = visibleFields.reduce(
            (acc, f) => acc + ((mock as any)[f.key] ?? 0),
            0
          );
          return (
            <div>
              <div className="font-bold text-sm text-center border-b pb-1 mb-2">
                {section.title}
              </div>
              <div className="space-y-1 text-xs">
                {visibleFields.map((f) => (
                  <div key={f.key} className="flex justify-between">
                    <span>{f.label}</span>
                    <span>{fmt((mock as any)[f.key] ?? 0)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Total Deductions</span>
                  <span>{fmt(total)}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="bg-gray-200 p-3 rounded flex justify-between items-center mb-4">
        <span className="font-bold">Net Salary</span>
        <span className="font-bold">
          {fmt(
            (mock.basic ?? 0) +
              (mock.hra ?? 0) +
              (mock.special ?? 0) -
              (mock.epf ?? 0) -
              (mock.esi ?? 0) -
              (mock.professionalTax ?? 0) -
              (mock.tds ?? 0) -
              (mock.loanRecovery ?? 0) -
              (mock.otherDeduction ?? 0)
          )}
        </span>
      </div>

      {template.showFooterNote && (
        <div className="text-xs text-gray-600 italic border-t pt-3">
          {template.footerNote || 'This is a computer generated statement.'}
        </div>
      )}
      {template.showSlipNumber && (
        <div className="text-xs text-gray-500 mt-2">Slip No: SAL-202607-EMP001</div>
      )}
    </div>
  );
}
