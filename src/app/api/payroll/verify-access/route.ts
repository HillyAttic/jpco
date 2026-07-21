/**
 * Payroll Access Verification API
 * Validates the payroll panel password against the server-side env variable.
 * This keeps the password secret — never exposes it to the client.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const expectedPassword = process.env.PAYROLL_ACCESS_PASSWORD;

    // If no env var is set, deny access by default (fail secure)
    if (!expectedPassword) {
      console.warn(
        '[PayrollAccess] PAYROLL_ACCESS_PASSWORD is not set in environment variables. ' +
        'Set it to enable access to the Payroll Panel.'
      );
      return NextResponse.json(
        { success: false, error: 'Access not configured. Contact administrator.' },
        { status: 403 }
      );
    }

    const isValid = password === expectedPassword;

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PayrollAccess] Verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
