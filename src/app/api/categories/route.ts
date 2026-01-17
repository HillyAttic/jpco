import { NextRequest, NextResponse } from 'next/server';
import { Category, CreateCategoryInput } from '@/types/category.types';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for category creation
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (must be hex color)'),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Mock data store (replace with actual database in production)
let categories: Category[] = [
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
 * GET /api/categories
 * List all categories
 * Validates Requirements: 6.7
 */
export async function GET() {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/categories
 * Create a new category
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

    const newCategory: Category = {
      id: Date.now().toString(),
      name: categoryData.name,
      description: categoryData.description,
      color: categoryData.color,
      icon: categoryData.icon,
      taskCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: categoryData.isActive,
    };

    categories.push(newCategory);

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
