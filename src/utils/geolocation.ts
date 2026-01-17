import { GeolocationCoordinates } from '@/types/attendance.types';

/**
 * Request geolocation permission from the user
 * @returns Promise that resolves to permission state
 */
export async function requestGeolocationPermission(): Promise<PermissionState> {
  if (!('permissions' in navigator)) {
    throw new Error('Permissions API not supported');
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch (error) {
    console.error('Error requesting geolocation permission:', error);
    throw new Error('Failed to request geolocation permission');
  }
}

/**
 * Get current position with timeout
 * @param timeout - Timeout in milliseconds (default: 10000)
 * @returns Promise that resolves to GeolocationCoordinates
 */
export async function getCurrentPosition(
  timeout: number = 10000
): Promise<GeolocationCoordinates> {
  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation not supported by this browser');
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Geolocation request timed out'));
    }, timeout);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        let errorMessage = 'Failed to get current position';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Geolocation permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Geolocation request timed out';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in meters
 */
export function calculateDistance(
  coord1: GeolocationCoordinates,
  coord2: GeolocationCoordinates
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Validate if coordinates are within allowed radius of workplace
 * @param currentLocation - Current user location
 * @param workplaceLocation - Workplace location
 * @param allowedRadius - Allowed radius in meters
 * @returns true if within radius, false otherwise
 */
export function isWithinRadius(
  currentLocation: GeolocationCoordinates,
  workplaceLocation: GeolocationCoordinates,
  allowedRadius: number
): boolean {
  const distance = calculateDistance(currentLocation, workplaceLocation);
  return distance <= allowedRadius;
}

/**
 * Location cache for faster subsequent requests
 */
interface CachedLocation {
  coordinates: GeolocationCoordinates;
  timestamp: number;
}

let cachedLocation: CachedLocation | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get current position with caching
 * @param timeout - Timeout in milliseconds
 * @param useCache - Whether to use cached location if available
 * @returns Promise that resolves to GeolocationCoordinates
 */
export async function getCurrentPositionCached(
  timeout: number = 10000,
  useCache: boolean = true
): Promise<GeolocationCoordinates> {
  // Check if we have a valid cached location
  if (
    useCache &&
    cachedLocation &&
    Date.now() - cachedLocation.timestamp < CACHE_DURATION
  ) {
    return cachedLocation.coordinates;
  }

  // Get fresh location
  const coordinates = await getCurrentPosition(timeout);

  // Update cache
  cachedLocation = {
    coordinates,
    timestamp: Date.now(),
  };

  return coordinates;
}

/**
 * Clear the location cache
 */
export function clearLocationCache(): void {
  cachedLocation = null;
}

/**
 * Format coordinates for display
 * @param coordinates - Coordinates to format
 * @returns Formatted string
 */
export function formatCoordinates(coordinates: GeolocationCoordinates): string {
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}

/**
 * Validate coordinates are valid
 * @param coordinates - Coordinates to validate
 * @returns true if valid, false otherwise
 */
export function isValidCoordinates(coordinates: GeolocationCoordinates): boolean {
  return (
    typeof coordinates.latitude === 'number' &&
    typeof coordinates.longitude === 'number' &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
}
