import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { adminAuth } from '@/lib/firebase-admin';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// ponytail: public web API key, duplicated from src/lib/firebase.ts because
// importing that module server-side boots Firestore with a browser-only
// persistent cache. Swap for NEXT_PUBLIC_FIREBASE_API_KEY once it is in .env.
const WEB_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBkxT1xMRCj2iAoig87tBkFXSGcoZyuQDw';

/**
 * POST /api/auth/change-password
 * Self-service: any signed-in user changes THEIR OWN password. The target is
 * always the caller's uid, so no role can reach another account this way.
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const parsed = changePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { currentPassword, newPassword } = parsed.data;
    const uid = request.user!.uid;

    // Read the email from the Auth record rather than the token: a token issued
    // before an address change would otherwise verify against the old address.
    const self = await adminAuth.getUser(uid);

    // Verify the current password over REST. Signing in through the client SDK
    // here would mutate auth state shared by every request in this process.
    const verify = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: self.email, password: currentPassword, returnSecureToken: false }),
      }
    );

    if (!verify.ok) {
      const reason = await verify.json().catch(() => null);
      const code: string | undefined = reason?.error?.message;

      // Email enumeration protection is on for this project, so Firebase answers
      // INVALID_LOGIN_CREDENTIALS for a wrong password and an unknown email alike.
      if (code === 'INVALID_PASSWORD' || code === 'INVALID_LOGIN_CREDENTIALS') {
        return ErrorResponses.unauthorized('Current password is incorrect');
      }

      // Bad key, referrer block, disabled user, rate limit. Never let these
      // masquerade as a wrong password.
      console.error('[change-password] Identity Toolkit rejected the attempt:', code, reason);
      return NextResponse.json(
        {
          error: 'Verification failed',
          message: `Could not verify the current password (${code || `HTTP ${verify.status}`})`,
        },
        { status: 502 }
      );
    }

    await adminAuth.updateUser(uid, { password: newPassword });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return handleApiError(error);
  }
});
