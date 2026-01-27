import { NextRequest, NextResponse } from 'next/server';
import { employeeService } from '@/services/employee.service';
import { handleApiError } from '@/lib/api-error-handler';

/**
 * POST /api/employees/bulk-delete
 * Delete multiple employees
 * 
 * Note: This will only delete from Firestore users collection.
 * Firebase Auth users cannot be deleted from client-side SDK.
 * You would need Firebase Admin SDK for that.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeIds } = body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: 'employeeIds must be a non-empty array' },
        { status: 400 }
      );
    }

    console.log(`=== BULK DELETE REQUEST ===`);
    console.log(`Deleting ${employeeIds.length} employees`);

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    // Delete employees one by one
    for (const id of employeeIds) {
      try {
        await employeeService.delete(id);
        results.success.push(id);
        console.log(`✓ Deleted employee: ${id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ id, error: errorMessage });
        console.error(`✗ Failed to delete employee ${id}:`, errorMessage);
      }
    }

    console.log(`=== BULK DELETE COMPLETE ===`);
    console.log(`Success: ${results.success.length}, Failed: ${results.failed.length}`);

    return NextResponse.json({
      message: `Deleted ${results.success.length} of ${employeeIds.length} employees`,
      results,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return handleApiError(error);
  }
}
