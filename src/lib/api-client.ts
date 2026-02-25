import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Cached auth promise to avoid re-subscribing
let authReadyPromise: Promise<void> | null = null;

/**
 * Wait for Firebase auth to be ready using onAuthStateChanged (event-driven, not polling)
 */
function waitForAuth(maxWaitMs: number = 5000): Promise<void> {
  // If user is already available, resolve immediately
  if (auth.currentUser) return Promise.resolve();

  // Reuse existing promise if already waiting
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      authReadyPromise = null;
      reject(new Error('User not authenticated - auth timeout'));
    }, maxWaitMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timeout);
        unsubscribe();
        authReadyPromise = null;
        resolve();
      }
    });
  });

  return authReadyPromise;
}

/**
 * Make authenticated API requests
 * Automatically adds Firebase ID token to Authorization header
 * Uses cached token when possible (avoids network call on every request)
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    // Wait for auth to be ready (event-driven, not polling)
    await waitForAuth();

    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Use cached ID token (false = don't force refresh unless expired)
    // This is much faster than getIdToken(true) which always makes a network call
    const token = await user.getIdToken(false);

    // Add Authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    throw error;
  }
}

/**
 * Helper for GET requests
 */
export async function apiGet(url: string): Promise<any> {
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }
  return response.json();
}

/**
 * Helper for POST requests
 */
export async function apiPost(url: string, data: any): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }
  return response.json();
}

/**
 * Helper for PUT requests
 */
export async function apiPut(url: string, data: any): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }
  return response.json();
}

/**
 * Helper for DELETE requests
 */
export async function apiDelete(url: string): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }
  return response.json();
}

/**
 * Helper for PATCH requests
 */
export async function apiPatch(url: string, data: any): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }
  return response.json();
}
