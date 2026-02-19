import { auth } from '@/lib/firebase';

/**
 * Make authenticated API requests
 * Automatically adds Firebase ID token to Authorization header
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get fresh ID token
    const token = await user.getIdToken();

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
