import { NextRequest, NextResponse } from 'next/server';
import { seedEmployees } from '@/scripts/seed-employees';

/**
 * POST /api/employees/seed
 * Seed initial employees in Firestore
 * This endpoint is for development/setup purposes
 */
export async function POST(request: NextRequest) {
  try {
    const result = await seedEmployees();
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error seeding employees:', error);
    return NextResponse.json(
      { 
        error: 'Failed to seed employees',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}