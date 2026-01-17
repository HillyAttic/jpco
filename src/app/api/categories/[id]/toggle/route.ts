import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { categoryService } from '@/services/category.service';

// Validation schema for toggle request
const toggleSchema = z.object({
  isActive: z.boolean(),
});

/**
 * PATCH /api/categories/[id]/toggle
 * Toggle category active status in Firestore
 * Validates Requirements: 6.7
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = toggleSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { isActive } = validationResult.data;

    // Check if category exists
    const existingCategory = await categoryService.getById(id);
    if (!existingCategory) {
      return ErrorResponses.notFound('Category');
    }

    // Toggle category status in Firestore
    const updatedCategory = await categoryService.toggleStatus(id, isActive);

    return NextResponse.json(updatedCategory);
  } catch (error) {
    return handleApiError(error);
  }
}
