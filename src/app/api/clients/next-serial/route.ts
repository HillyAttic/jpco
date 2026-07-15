import { NextResponse } from 'next/server';
import { withManagerAuth } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/clients/next-serial
 * Returns the next available serial number (max existing + 1, zero-padded to 3 digits)
 */
export const GET = withManagerAuth(async () => {
  try {
    console.log('[API next-serial] Fetching all clients...');
    const clientsSnapshot = await adminDb.collection('clients').get();
    console.log(`[API next-serial] Found ${clientsSnapshot.size} clients`);

    let maxNumber = 0;

    clientsSnapshot.forEach((doc) => {
      const data = doc.data();
      const serial = data.serialNumber;
      if (serial) {
        // Extract numeric part from serial number (e.g., "001" -> 1, "407" -> 407)
        const num = parseInt(serial.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    console.log(`[API next-serial] Max serial number: ${maxNumber}`);
    const nextNumber = maxNumber + 1;
    // Zero-pad to 3 digits (001, 002, ..., 999, 1000, ...)
    const nextSerial = nextNumber.toString().padStart(3, '0');
    console.log(`[API next-serial] Next serial: ${nextSerial}`);

    return NextResponse.json({
      success: true,
      nextSerial,
      nextNumber,
    });
  } catch (error) {
    console.error('Error getting next serial number:', error);
    return NextResponse.json(
      { error: 'Failed to get next serial number' },
      { status: 500 }
    );
  }
});
