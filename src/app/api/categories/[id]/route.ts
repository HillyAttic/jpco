import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { categoryService } from '@/services/category.service';

// Validation schema for category update
const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (must be hex color)').optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/categories/[id]
 * Get a single category by ID from Firestore
 * Validates Requirements: 6.7
 */
export async function GET(
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
    const category = await categoryService.getById(id);

    if (!category) {
      return ErrorResponses.notFound('Category');
    }

    return NextResponse.json(category);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/categories/[id]
 * Update a category in Firestore
 * Validates Requirements: 6.7
 */
export async function PUT(
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
    const validationResult = updateCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    // Check if category exists
    const existingCategory = await categoryService.getById(id);
    if (!existingCategory) {
      return ErrorResponses.notFound('Category');
    }

    // Update category in Firestore
    const updatedCategory = await categoryService.update(id, validationResult.data);

    return NextResponse.json(updatedCategory);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/categories/[id]
 * Delete a category from Firestore
 * Validates Requirements: 6.7
 */
export async function DELETE(
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
    
    // Check if category exists
    const existingCategory = await categoryService.getById(id);
    if (!existingCategory) {
      return ErrorResponses.notFound('Category');
    }

    // Delete category from Firestore
    await categoryService.delete(id);

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
