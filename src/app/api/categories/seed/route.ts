import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { CreateCategoryInput } from '@/types/category.types';

const initialCategories: CreateCategoryInput[] = [
  {
    name: 'Development',
    description: 'Software development and coding tasks',
    color: '#3B82F6',
    icon: '💻',
    isActive: true,
  },
  {
    name: 'Design',
    description: 'UI/UX design and creative work',
    color: '#EC4899',
    icon: '🎨',
    isActive: true,
  },
  {
    name: 'Marketing',
    description: 'Marketing campaigns and promotions',
    color: '#F59E0B',
    icon: '📢',
    isActive: true,
  },
  {
    name: 'Research',
    description: 'Research and analysis tasks',
    color: '#8B5CF6',
    icon: '🔬',
    isActive: true,
  },
  {
    name: 'Documentation',
    description: 'Writing and maintaining documentation',
    color: '#10B981',
    icon: '📚',
    isActive: true,
  },
  {
    name: 'Testing',
    description: 'Quality assurance and testing tasks',
    color: '#EF4444',
    icon: '🧪',
    isActive: true,
  },
  {
    name: 'Planning',
    description: 'Project planning and strategy',
    color: '#F97316',
    icon: '📋',
    isActive: true,
  },
  {
    name: 'Support',
    description: 'Customer support and maintenance',
    color: '#06B6D4',
    icon: '🛠️',
    isActive: true,
  },
];

/**
 * POST /api/categories/seed
 * Seed initial categories in Firestore using Admin SDK
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Admin access required');
    }

    // Check if categories already exist
    const existingSnapshot = await adminDb.collection('categories').get();

    if (!existingSnapshot.empty) {
      const existingCategories = existingSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return NextResponse.json({
        message: `Found ${existingCategories.length} existing categories. Skipping seed.`,
        existingCount: existingCategories.length,
        categories: existingCategories,
      });
    }

    // Create initial categories
    const createdCategories = [];
    const errors = [];

    for (const categoryData of initialCategories) {
      try {
        const now = Timestamp.now();
        const docRef = await adminDb.collection('categories').add({
          ...categoryData,
          taskCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        const created = await docRef.get();
        createdCategories.push({ id: created.id, ...created.data() });
      } catch (error) {
        errors.push({
          category: categoryData.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Successfully seeded ${createdCategories.length} categories!`,
      createdCount: createdCategories.length,
      categories: createdCategories,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}