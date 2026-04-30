import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/server-auth';
import { formTemplateService } from '@/services/form-template.service';

/**
 * POST /api/forms/seed
 * Create sample form templates for testing (Admin only)
 */
export const POST = withAdminAuth(async (request) => {
  try {
    const { uid } = request.user!;

    const sampleTemplate = {
      title: 'Sample Contact Form',
      description: 'A simple contact form for testing',
      createdBy: uid,
      status: 'published' as const,
      fields: [
        {
          id: 'field_name',
          type: 'text' as const,
          label: 'Full Name',
          required: true,
          order: 0,
        },
        {
          id: 'field_email',
          type: 'email' as const,
          label: 'Email Address',
          required: true,
          order: 1,
        },
        {
          id: 'field_message',
          type: 'textarea' as const,
          label: 'Message',
          required: true,
          order: 2,
        },
      ],
      settings: {
        submitButtonText: 'Submit',
        successMessage: 'Thank you for your submission!',
        allowMultipleSubmissions: false,
      },
      accessControl: {
        type: 'authenticated' as const,
      },
    };

    const template = await formTemplateService.create(sampleTemplate, uid);

    return NextResponse.json({
      success: true,
      message: 'Sample template created',
      template,
    });
  } catch (error) {
    console.error('[Seed API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
});
