import { NextRequest, NextResponse } from 'next/server';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { isActive } = await request.json();
    const categoryIndex = categories.findIndex((c) => c.id === id);

    if (categoryIndex === -1) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    categories[categoryIndex] = {
      ...categories[categoryIndex],
      isActive,
      updatedAt: new Date(),
    };

    return NextResponse.json(categories[categoryIndex]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to toggle category status' },
      { status: 500 }
    );
  }
}
