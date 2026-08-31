import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { MISConfigService } from '@/services/mis-config.service';
import { flattenFormFields } from '@/utils/submission-utils';
import type { FormTemplate, FormSubmission, FormField } from '@/types/form.types';
import { Timestamp } from 'firebase-admin/firestore';

type DateFilter = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'all-time';
type AnalyticsMode = 'completion' | 'dashboard' | 'branch-report';
type ReportPreset = 'day' | 'yesterday' | 'week' | 'month';

interface CompletionAnalyticsData {
  formId: string;
  formTitle: string;
  dateFilter: DateFilter;
  dateRange: { start: string; end: string } | null;
  totalAssigned: number;
  submittedCount: number;
  notSubmittedCount: number;
  submittedUserIds: string[];
  notSubmittedUserIds: string[];
  submissionsWithTimestamps: Record<string, string>;
  zeroResponseField: {
    fieldId: string;
    fieldLabel: string;
    count: number;
    userIds: string[];
  } | null;
}

interface DashboardChartDatum {
  label: string;
  count: number;
  pct: number;
}

interface DashboardQuestionChart {
  fieldId: string;
  label: string;
  type: string;
  chartType: 'pie' | 'bar';
  data: DashboardChartDatum[];
  totalAnswered: number;
}

interface DashboardAnalyticsData {
  formId: string;
  formTitle: string;
  month: string;
  businessUnit: string;
  businessUnitOptions: string[];
  selectedMonthCount: number;
  visitsByMonth: Array<{ month: string; total: number }>;
  questionCharts: DashboardQuestionChart[];
}

interface BranchReportColumn {
  id: string;
  label: string;
  type: 'number' | 'yesno';
  align: 'right';
}

interface BranchReportData {
  formId: string;
  formTitle: string;
  dateRange: { start: string; end: string };
  columns: BranchReportColumn[];
  groupingField: string | null;
  rows: Array<{ key: string; name: string; submissionCount: number; data: Record<string, number> }>;
  totals: { submissionCount: number; data: Record<string, number> };
  daywiseGroupVisits: Array<{ date: string; total: number }>;
}


const BUSINESS_UNIT_LABEL = 'name of business unit visited today';

function toDate(value: Timestamp | { toDate?: () => Date } | string | Date | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

function parseMonthInput(monthInput: string | null): { month: string; start: Date; end: Date } {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const safeMonth = monthInput && /^\d{4}-\d{2}$/.test(monthInput) ? monthInput : defaultMonth;

  const [yearStr, monthStr] = safeMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return { month: safeMonth, start, end };
}

function getDateRange(filter: DateFilter): { start: Date; end: Date } | null {
  const start = new Date();
  const end = new Date();

  switch (filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this-week': {
      const dayOfWeek = start.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'this-month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'all-time':
      return null;
    default:
      return null;
  }

  return { start, end };
}

function normalizeValue(raw: any): string[] {
  if (raw === null || raw === undefined || raw === '') return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
      .filter((item) => item.length > 0);
  }

  if (typeof raw === 'object') {
    return [JSON.stringify(raw)];
  }

  const value = String(raw).trim();
  return value ? [value] : [];
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildDateBuckets(start: Date, end: Date): Map<string, number> {
  const buckets = new Map<string, number>();
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    buckets.set(formatDateInput(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

function parseDateInput(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getReportDateRange(startInput: string | null, endInput: string | null, presetInput: string | null): { start: Date; end: Date } {
  const today = new Date();
  let start = parseDateInput(startInput);
  let end = parseDateInput(endInput);

  if (!start || !end) {
    start = new Date(today);
    end = new Date(today);

    if (presetInput === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (presetInput === 'week') {
      start.setDate(start.getDate() - 6);
    } else if (presetInput === 'month') {
      start.setDate(1);
    }
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function toNumber(raw: any): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === 'string') {
    const parsed = Number.parseFloat(raw.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isYes(raw: any): boolean {
  const values = normalizeValue(raw).map((value) => value.toLowerCase());
  return values.some((value) => ['yes', 'y', 'true', '1'].includes(value));
}

function isNo(raw: any): boolean {
  const values = normalizeValue(raw).map((value) => value.toLowerCase());
  return values.some((value) => ['no', 'n', 'false', '0'].includes(value));
}

function findBusinessUnitField(fields: FormField[]): FormField | undefined {
  return fields.find((field) => field.label.trim().toLowerCase() === BUSINESS_UNIT_LABEL);
}

function buildQuestionCharts(fields: FormField[], submissions: FormSubmission[]): DashboardQuestionChart[] {
  const chartableTypes = new Set<FormField['type']>([
    'select',
    'radio',
    'checkbox',
    'multiselect',
    'text',
    'textarea',
    'number',
    'date',
    'time',
    'email',
    'phone',
  ]);

  const charts: DashboardQuestionChart[] = [];

  fields.forEach((field) => {
    if (!chartableTypes.has(field.type)) {
      return;
    }

    const counts = new Map<string, number>();

    submissions.forEach((submission) => {
      const rawValue = submission.data?.[field.id];
      const values = normalizeValue(rawValue);

      values.forEach((value) => {
        counts.set(value, (counts.get(value) || 0) + 1);
      });
    });

    const totalAnswered = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
    if (totalAnswered === 0) {
      return;
    }

    const sorted = Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const isPieType =
      field.type === 'select' ||
      field.type === 'radio' ||
      field.type === 'checkbox' ||
      field.type === 'multiselect';

    const limit = isPieType ? 8 : 10;
    const top = sorted.slice(0, limit);
    const rest = sorted.slice(limit);
    const otherCount = rest.reduce((sum, item) => sum + item.count, 0);

    const merged = otherCount > 0 ? [...top, { label: 'Other', count: otherCount }] : top;
    const data: DashboardChartDatum[] = merged.map((item) => ({
      label: item.label,
      count: item.count,
      pct: totalAnswered > 0 ? Number(((item.count / totalAnswered) * 100).toFixed(2)) : 0,
    }));

    charts.push({
      fieldId: field.id,
      label: field.label,
      type: field.type,
      chartType: isPieType ? 'pie' : 'bar',
      data,
      totalAnswered,
    });
  });

  return charts;
}

async function buildDashboardAnalytics(formId: string, businessUnit: string, monthInput: string | null): Promise<DashboardAnalyticsData> {
  const templateDoc = await adminDb.collection('form_templates').doc(formId).get();

  if (!templateDoc.exists) {
    throw new Error('Form template not found');
  }

  const template = { id: templateDoc.id, ...templateDoc.data() } as FormTemplate;
  const fields = flattenFormFields(template.fields || []);
  const businessUnitField = findBusinessUnitField(fields);

  const { month, start, end } = parseMonthInput(monthInput);

  const submissionsSnapshot = await adminDb
    .collection('form_submissions')
    .where('formId', '==', formId)
    .where('submittedAt', '>=', start)
    .where('submittedAt', '<=', end)
    .get();

  const monthSubmissions = submissionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FormSubmission[];

  const businessUnitOptions = new Set<string>();
  monthSubmissions.forEach((submission) => {
    if (!businessUnitField) return;
    const values = normalizeValue(submission.data?.[businessUnitField.id]);
    values.forEach((value) => businessUnitOptions.add(value));
  });

  const filteredSubmissions = monthSubmissions.filter((submission) => {
    if (businessUnit === 'all' || !businessUnitField) return true;
    const values = normalizeValue(submission.data?.[businessUnitField.id]);
    return values.includes(businessUnit);
  });

  const monthKeys: string[] = [];
  const selectedDate = new Date(`${month}-01T00:00:00`);
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
    monthKeys.push(getMonthKey(d));
  }

  let trendQuery = adminDb
    .collection('form_submissions')
    .where('formId', '==', formId)
    .where('submittedAt', '>=', new Date(new Date(`${monthKeys[0]}-01T00:00:00`).getFullYear(), new Date(`${monthKeys[0]}-01T00:00:00`).getMonth(), 1, 0, 0, 0, 0))
    .where('submittedAt', '<=', end);

  const trendSnapshot = await trendQuery.get();
  const trendSubmissions = trendSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FormSubmission[];

  const trendCounts = new Map<string, number>(monthKeys.map((key) => [key, 0]));
  trendSubmissions.forEach((submission) => {
    const date = toDate(submission.submittedAt);
    if (!date) return;

    if (businessUnit !== 'all' && businessUnitField) {
      const values = normalizeValue(submission.data?.[businessUnitField.id]);
      if (!values.includes(businessUnit)) return;
    }

    const key = getMonthKey(date);
    if (trendCounts.has(key)) {
      trendCounts.set(key, (trendCounts.get(key) || 0) + 1);
    }
  });

  const visitsByMonth = monthKeys.map((key) => ({
    month: key,
    total: trendCounts.get(key) || 0,
  }));

  const questionCharts = buildQuestionCharts(fields, filteredSubmissions);

  return {
    formId,
    formTitle: template.title,
    month,
    businessUnit,
    businessUnitOptions: Array.from(businessUnitOptions).sort((a, b) => a.localeCompare(b)),
    selectedMonthCount: filteredSubmissions.length,
    visitsByMonth,
    questionCharts,
  };
}

async function buildBranchReportAnalytics(
  formId: string,
  startInput: string | null,
  endInput: string | null,
  presetInput: string | null
): Promise<BranchReportData> {
  const templateDoc = await adminDb.collection('form_templates').doc(formId).get();

  if (!templateDoc.exists) {
    throw new Error('Form template not found');
  }

  const template = { id: templateDoc.id, ...templateDoc.data() } as FormTemplate;
  const fields = flattenFormFields(template.fields || []);
  const { start, end } = getReportDateRange(startInput, endInput, presetInput as ReportPreset | null);

  // Find grouping field: prefer "business unit" field, else first text-like field
  const BUSINESS_UNIT_PATTERN = /business\s*unit/i;
  let groupingField = fields.find((f) => BUSINESS_UNIT_PATTERN.test(f.label));
  if (!groupingField) {
    groupingField = fields.find((f) =>
      !['number', 'file', 'section'].includes(f.type) && !/^(s\.?\s*no|serial|date|name)$/i.test(f.label.trim())
    );
  }

  // Detect number and yes/no fields (exclude the grouping field)
  const numberFields = fields.filter((f) => f.type === 'number' && f.id !== groupingField?.id);
  const yesNoFields = fields.filter((f) => {
    if (f.id === groupingField?.id) return false;
    if (f.type === 'select' || f.type === 'radio') {
      const opts = (f.options || []).map((o) => (typeof o === 'string' ? o : o.label || o.value || '').toLowerCase());
      return opts.some((o) => /^(yes|no|y|n)$/.test(o));
    }
    if (f.type === 'checkbox') return true;
    return false;
  });

  const columns: BranchReportColumn[] = [
    ...numberFields.map((f) => ({ id: f.id, label: f.label, type: 'number' as const, align: 'right' as const })),
    ...yesNoFields.map((f) => ({ id: f.id, label: f.label, type: 'yesno' as const, align: 'right' as const })),
  ];

  const emptyReturn: BranchReportData = {
    formId,
    formTitle: template.title,
    dateRange: { start: formatDateInput(start), end: formatDateInput(end) },
    columns,
    groupingField: groupingField?.id || null,
    rows: [],
    totals: { submissionCount: 0, data: {} },
    daywiseGroupVisits: [],
  };

  if (!groupingField) {
    return emptyReturn;
  }

  const submissionsSnapshot = await adminDb
    .collection('form_submissions')
    .where('formId', '==', formId)
    .where('submittedAt', '>=', start)
    .where('submittedAt', '<=', end)
    .get();
  const submissions = submissionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FormSubmission[];

  // Resolve submitter names
  const submitterIds = Array.from(new Set(submissions.map((s) => s.submittedBy).filter(Boolean))) as string[];
  const submitterNames = new Map<string, string>();
  await Promise.all(
    submitterIds.map(async (uid) => {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      const userData = userDoc.data();
      if (userData) {
        submitterNames.set(uid, userData.name || userData.displayName || userData.email || uid);
      }
    })
  );

  const rowMap = new Map<string, { key: string; name: string; submissionCount: number; names: Set<string>; data: Record<string, number> }>();
  const daywiseGroupVisits = buildDateBuckets(start, end);

  // Track which numeric field is used for the daywise chart (first number field, if any)
  const daywiseFieldId = numberFields[0]?.id;

  submissions.forEach((submission) => {
    const groupingValue = normalizeValue(submission.data?.[groupingField!.id])[0] || 'Unknown';
    const existing = rowMap.get(groupingValue) || {
      key: groupingValue,
      name: '',
      submissionCount: 0,
      names: new Set<string>(),
      data: Object.fromEntries(columns.map((col) => [col.id, 0])),
    };

    existing.submissionCount += 1;

    // Resolve name
    const names = normalizeValue(submission.data?.[groupingField!.id]);
    // Try to find a "name" field in the form
    const nameField = fields.find((f) => /^name$/i.test(f.label.trim()) && f.id !== groupingField!.id);
    const nameValues = nameField ? normalizeValue(submission.data?.[nameField.id]) : [];
    if (nameValues.length > 0) {
      nameValues.forEach((n) => existing.names.add(n));
    } else if (submission.submitterName) {
      existing.names.add(submission.submitterName);
    } else if (submission.submittedBy && submitterNames.has(submission.submittedBy)) {
      existing.names.add(submitterNames.get(submission.submittedBy)!);
    } else if (submission.submitterEmail) {
      existing.names.add(submission.submitterEmail);
    }

    // Aggregate numeric fields
    numberFields.forEach((field) => {
      const val = toNumber(submission.data?.[field.id]);
      existing.data[field.id] = (existing.data[field.id] || 0) + val;

      // Daywise chart uses the first numeric field
      if (field.id === daywiseFieldId) {
        const submittedAtDate = toDate(submission.submittedAt);
        if (submittedAtDate) {
          const dateKey = formatDateInput(submittedAtDate);
          if (daywiseGroupVisits.has(dateKey)) {
            daywiseGroupVisits.set(dateKey, (daywiseGroupVisits.get(dateKey) || 0) + val);
          }
        }
      }
    });

    // Aggregate yes/no fields
    yesNoFields.forEach((field) => {
      const value = submission.data?.[field.id];
      if (isYes(value)) existing.data[`${field.id}_yes`] = (existing.data[`${field.id}_yes`] || 0) + 1;
      if (isNo(value)) existing.data[`${field.id}_no`] = (existing.data[`${field.id}_no`] || 0) + 1;
    });

    rowMap.set(groupingValue, existing);
  });

  const rows = Array.from(rowMap.values())
    .map(({ names, ...row }) => ({
      ...row,
      name: Array.from(names).sort((a, b) => a.localeCompare(b)).join(', '),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  // Build totals
  const totalsData: Record<string, number> = {};
  columns.forEach((col) => {
    if (col.type === 'number') {
      totalsData[col.id] = rows.reduce((sum, row) => sum + (row.data[col.id] || 0), 0);
    } else {
      totalsData[`${col.id}_yes`] = rows.reduce((sum, row) => sum + (row.data[`${col.id}_yes`] || 0), 0);
      totalsData[`${col.id}_no`] = rows.reduce((sum, row) => sum + (row.data[`${col.id}_no`] || 0), 0);
    }
  });

  return {
    formId,
    formTitle: template.title,
    dateRange: { start: formatDateInput(start), end: formatDateInput(end) },
    columns,
    groupingField: groupingField.id,
    rows,
    totals: {
      submissionCount: rows.reduce((sum, row) => sum + row.submissionCount, 0),
      data: totalsData,
    },
    daywiseGroupVisits: Array.from(daywiseGroupVisits.entries()).map(([date, total]) => ({ date, total })),
  };
}

async function buildCompletionAnalytics(formId: string, dateFilter: DateFilter): Promise<CompletionAnalyticsData> {
  const misConfigService = new MISConfigService();
  const misConfig = await misConfigService.getMISConfig();

  if (!misConfig) {
    throw new Error('MIS configuration not found');
  }

  const formMapping = misConfig.formToUserMappings?.find((mapping) => mapping.formId === formId);

  if (!formMapping) {
    throw new Error('Form not found in MIS configuration');
  }

  const assignedUserIds = formMapping.assignedUserIds || [];
  const totalAssigned = assignedUserIds.length;

  const templateDoc = await adminDb.collection('form_templates').doc(formId).get();

  if (!templateDoc.exists) {
    throw new Error('Form template not found');
  }

  const template = { id: templateDoc.id, ...templateDoc.data() } as FormTemplate;

  const flattenedFields = flattenFormFields(template.fields);
  const groupVisitField = flattenedFields.find(
    (field) => field.type === 'number' && field.label.toLowerCase().includes('group visit')
  );

  const dateRange = getDateRange(dateFilter);

  let submissionsQuery = adminDb.collection('form_submissions').where('formId', '==', formId);

  if (dateRange) {
    submissionsQuery = submissionsQuery
      .where('submittedAt', '>=', dateRange.start)
      .where('submittedAt', '<=', dateRange.end);
  }

  const submissionsSnapshot = await submissionsQuery.get();
  const submissions = submissionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FormSubmission[];

  const submittedUserIds = new Set<string>();
  const submissionsWithTimestamps: Record<string, string> = {};
  const zeroResponseUserIds = new Set<string>();

  submissions.forEach((submission) => {
    if (!submission.submittedBy) return;

    submittedUserIds.add(submission.submittedBy);

    const submittedAtDate = toDate(submission.submittedAt);
    const submittedAtIso = submittedAtDate ? submittedAtDate.toISOString() : new Date().toISOString();

    if (
      !submissionsWithTimestamps[submission.submittedBy] ||
      submittedAtIso > submissionsWithTimestamps[submission.submittedBy]
    ) {
      submissionsWithTimestamps[submission.submittedBy] = submittedAtIso;
    }

    if (groupVisitField && submission.data) {
      const fieldValue = submission.data[groupVisitField.id];
      if (fieldValue === 0 || fieldValue === '0') {
        zeroResponseUserIds.add(submission.submittedBy);
      }
    }
  });

  const submittedUserIdsArray = Array.from(submittedUserIds);
  const notSubmittedUserIds = assignedUserIds.filter((uid) => !submittedUserIds.has(uid));

  return {
    formId,
    formTitle: template.title,
    dateFilter,
    dateRange: dateRange
      ? {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        }
      : null,
    totalAssigned,
    submittedCount: submittedUserIdsArray.length,
    notSubmittedCount: notSubmittedUserIds.length,
    submittedUserIds: submittedUserIdsArray,
    notSubmittedUserIds,
    submissionsWithTimestamps,
    zeroResponseField:
      groupVisitField && zeroResponseUserIds.size > 0
        ? {
            fieldId: groupVisitField.id,
            fieldLabel: groupVisitField.label,
            count: zeroResponseUserIds.size,
            userIds: Array.from(zeroResponseUserIds),
          }
        : null,
  };
}

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const dateFilter = (searchParams.get('dateFilter') || 'today') as DateFilter;
    const mode = (searchParams.get('mode') || 'completion') as AnalyticsMode;
    const businessUnit = searchParams.get('businessUnit') || 'all';
    const month = searchParams.get('month');
    const reportStartDate = searchParams.get('reportStartDate');
    const reportEndDate = searchParams.get('reportEndDate');
    const reportPreset = searchParams.get('reportPreset');

    if (!formId) {
      return NextResponse.json({ success: false, error: 'formId is required' }, { status: 400 });
    }

    const misConfigService = new MISConfigService();
    const misConfig = await misConfigService.getMISConfig();

    if (!misConfig) {
      return NextResponse.json({ success: false, error: 'MIS configuration not found' }, { status: 404 });
    }

    const userUid = request.user!.uid;
    const hasSheetAccess = misConfig.sheetAssignedUsers?.includes(userUid) || false;

    if (!hasSheetAccess) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (mode === 'dashboard') {
      const dashboardData = await buildDashboardAnalytics(formId, businessUnit, month);
      return NextResponse.json({ success: true, data: dashboardData });
    }

    if (mode === 'branch-report') {
      const branchReportData = await buildBranchReportAnalytics(formId, reportStartDate, reportEndDate, reportPreset);
      return NextResponse.json({ success: true, data: branchReportData });
    }

    const completionData = await buildCompletionAnalytics(formId, dateFilter);
    return NextResponse.json({ success: true, data: completionData });
  } catch (error) {
    console.error('Error calculating analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate analytics',
      },
      { status: 500 }
    );
  }
});
