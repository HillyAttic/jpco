import { NextResponse } from 'next/server';
import { withManagerAuth } from '@/lib/server-auth';
import { formSubmissionService } from '@/services/form-submission.service';
import { formTemplateService } from '@/services/form-template.service';
import { formExportService } from '@/services/form-export.service';
import { handleApiError } from '@/lib/api-error-handler';
import type { ExportFormat, FormSubmissionFilters } from '@/types/form.types';

/**
 * POST /api/forms/submissions/export
 * Export form submissions to CSV or Excel
 * Auth: Manager or Admin
 */
export const POST = withManagerAuth(async (request) => {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.formId || !body.format) {
      return NextResponse.json(
        { error: 'Form ID and format are required' },
        { status: 400 }
      );
    }

    const format: ExportFormat = body.format;
    if (format !== 'csv' && format !== 'excel') {
      return NextResponse.json(
        { error: 'Format must be "csv" or "excel"' },
        { status: 400 }
      );
    }

    // Get form template
    const template = await formTemplateService.getById(body.formId);
    if (!template) {
      return NextResponse.json(
        { error: 'Form template not found' },
        { status: 404 }
      );
    }

    // Build filters
    const filters: FormSubmissionFilters = {
      formId: body.formId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      submittedBy: body.submittedBy || undefined,
    };

    console.log('[Export API] Fetching submissions with filters:', {
      formId: filters.formId,
      startDate: filters.startDate?.toISOString(),
      endDate: filters.endDate?.toISOString(),
      submittedBy: filters.submittedBy,
    });

    // Get all submissions (no pagination for export)
    const { submissions, total } = await formSubmissionService.getAll(filters);

    console.log('[Export API] Found submissions:', {
      count: submissions.length,
      total,
    });

    if (submissions.length === 0) {
      // Provide more helpful error message
      let errorMessage = 'No submissions found to export';

      if (filters.startDate || filters.endDate) {
        errorMessage += ' for the selected date range';
      }

      // Check if there are ANY submissions for this form
      const allSubmissions = await formSubmissionService.getAll({
        formId: body.formId,
      });

      if (allSubmissions.total === 0) {
        errorMessage = 'This form has no submissions yet';
      } else {
        errorMessage += `. This form has ${allSubmissions.total} total submission${allSubmissions.total === 1 ? '' : 's'}`;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    // Generate export file
    let fileData: string | ArrayBuffer;
    let mimeType: string;

    if (format === 'csv') {
      fileData = await formExportService.exportToCSV(submissions, template);
      mimeType = 'text/csv;charset=utf-8;';
    } else {
      fileData = await formExportService.exportToExcel(submissions, template);
      mimeType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    // Generate filename
    const filename = formExportService.generateFilename(template.title, format);

    // Return file as download
    return new NextResponse(fileData, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
