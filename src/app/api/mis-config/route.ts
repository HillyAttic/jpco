import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withAdminAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { misConfigService } from '@/services/mis-config.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user!;
    const config = await misConfigService.getMISConfig();

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          dailyFormTemplateId: '',
          formAssignedUsers: [],
          sheetAssignedUsers: [],
          formRequiredForClockout: false,
          hasFormAccess: false,
          hasSheetAccess: false,
        },
      });
    }

    const isAdmin = user.claims.role === 'admin';

    if (isAdmin) {
      return NextResponse.json({
        success: true,
        data: {
          dailyFormTemplateId: config.dailyFormTemplateId || '',
          formAssignedUsers: config.formAssignedUsers,
          sheetAssignedUsers: config.sheetAssignedUsers,
          formRequiredForClockout: config.formRequiredForClockout || false,
          hasFormAccess: true,
          hasSheetAccess: true,
        },
      });
    }

    const hasFormAccess = config.formAssignedUsers.includes(user.uid);
    const hasSheetAccess = config.sheetAssignedUsers.includes(user.uid);

    return NextResponse.json({
      success: true,
      data: {
        dailyFormTemplateId: hasFormAccess ? config.dailyFormTemplateId || '' : '',
        formAssignedUsers: [],
        sheetAssignedUsers: [],
        formRequiredForClockout: config.formRequiredForClockout || false,
        hasFormAccess,
        hasSheetAccess,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PUT = withAdminAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user!;
    const body = await request.json();

    const {
      dailyFormTemplateId,
      formAssignedUsers,
      sheetAssignedUsers,
      formRequiredForClockout,
    } = body;

    // Validate form template ID if provided
    if (dailyFormTemplateId) {
      const { formTemplateService } = await import('@/services/form-template.service');
      const template = await formTemplateService.getById(dailyFormTemplateId);

      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Form template not found' },
          { status: 400 }
        );
      }

      if (template.status !== 'published') {
        return NextResponse.json(
          { success: false, error: 'Only published forms can be used as daily forms' },
          { status: 400 }
        );
      }
    }

    // Validate user arrays
    if (formAssignedUsers && !Array.isArray(formAssignedUsers)) {
      return NextResponse.json(
        { success: false, error: 'formAssignedUsers must be an array' },
        { status: 400 }
      );
    }

    if (sheetAssignedUsers && !Array.isArray(sheetAssignedUsers)) {
      return NextResponse.json(
        { success: false, error: 'sheetAssignedUsers must be an array' },
        { status: 400 }
      );
    }

    const updatedConfig = await misConfigService.updateMISConfig({
      dailyFormTemplateId,
      formAssignedUsers,
      sheetAssignedUsers,
      formRequiredForClockout,
      updatedBy: user.uid,
    });

    return NextResponse.json({
      success: true,
      data: updatedConfig,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
