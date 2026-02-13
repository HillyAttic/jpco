import { NextRequest, NextResponse } from 'next/server';
import { Category, CreateCategoryInput } from '@/types/category.types';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { categoryAdminService } from '@/services/category-admin.service';

// Validation schema for category creation
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (must be hex color)'),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/categories
 * List all categories from Firestore
 * Validates Requirements: 6.7
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search');
    const isActiveParam = searchParams.get('isActive');
    
    let isActive: boolean | undefined;
    if (isActiveParam !== null) {
      isActive = isActiveParam === 'true';
    }

    // Get filtered categories from Firestore using Admin SDK
    const categories = await categoryAdminService.getAll({
      search: searchTerm || undefined,
      isActive,
    });

    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/categories
 * Create a new category in Firestore
 * Validates Requirements: 6.7
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const body = await request.json();

    // Validate request body
    const validationResult = createCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const categoryData = validationResult.data;

    // Create category in Firestore using Admin SDK
    const newCategory = await categoryAdminService.create(categoryData);

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
