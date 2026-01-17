import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for category update
const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (must be hex color)').optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Mock data store (in production, use a real database)
let categories = [
  {
    id: '1',
    name: 'Development',
    description: 'Software development and coding tasks',
    color: '#3B82F6',
    icon: '💻',
    taskCount: 12,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    isActive: true,
  },
  {
    id: '2',
    name: 'Design',
    description: 'UI/UX design and creative work',
    color: '#EC4899',
    icon: '🎨',
    taskCount: 8,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
    isActive: true,
  },
  {
    id: '3',
    name: 'Marketing',
    description: 'Marketing campaigns and promotions',
    color: '#F59E0B',
    icon: '📢',
    taskCount: 15,
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17'),
    isActive: true,
  },
  {
    id: '4',
    name: 'Research',
    description: 'Research and analysis tasks',
    color: '#8B5CF6',
    icon: '🔬',
    taskCount: 5,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18'),
    isActive: true,
  },
  {
    id: '5',
    name: 'Documentation',
    description: 'Writing and maintaining documentation',
    color: '#10B981',
    icon: '📚',
    taskCount: 7,
    createdAt: new Date('2024-01-19'),
    updatedAt: new Date('2024-01-19'),
    isActive: false,
  },
];

/**
 * GET /api/categories/[id]
 * Get a single category by ID
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
    const category = categories.find((c) => c.id === id);

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
 * Update a category
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

    const categoryIndex = categories.findIndex((c) => c.id === id);

    if (categoryIndex === -1) {
      return ErrorResponses.notFound('Category');
    }

    categories[categoryIndex] = {
      ...categories[categoryIndex],
      ...validationResult.data,
      updatedAt: new Date(),
    };

    return NextResponse.json(categories[categoryIndex]);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/categories/[id]
 * Delete a category
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
    const categoryIndex = categories.findIndex((c) => c.id === id);

    if (categoryIndex === -1) {
      return ErrorResponses.notFound('Category');
    }

    categories = categories.filter((c) => c.id !== id);

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
