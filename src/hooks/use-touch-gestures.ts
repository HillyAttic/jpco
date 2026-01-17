import { useEffect, useRef, useCallback } from 'react';
import { useResponsive } from './use-responsive';

export interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: (event: TouchEvent) => void;
  onPinch?: (scale: number) => void;
  onTap?: (event: TouchEvent) => void;
  onDoubleTap?: (event: TouchEvent) => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pinchThreshold?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  longPressTimer: NodeJS.Timeout | null;
  initialDistance: number;
  isLongPress: boolean;
  touchCount: number;
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: TouchGestureOptions = {}
) {
  const { isTouchDevice } = useResponsive();
  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    longPressTimer: null,
    initialDistance: 0,
    isLongPress: false,
    touchCount: 0
  });

  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    onPinch,
    onTap,
    onDoubleTap,
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
    pinchThreshold = 0.1
  } = options;

  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!isTouchDevice) return;

    const touch = event.touches[0];
    const currentTime = Date.now();
    
    touchState.current = {
      ...touchState.current,
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: currentTime,
      touchCount: event.touches.length,
      isLongPress: false
    };

    // Multi-touch handling for pinch gestures
    if (event.touches.length === 2 && onPinch) {
      touchState.current.initialDistance = getDistance(event.touches[0], event.touches[1]);
    }

    // Long press detection
    if (onLongPress && event.touches.length === 1) {
      touchState.current.longPressTimer = setTimeout(() => {
        touchState.current.isLongPress = true;
        onLongPress(event);
        
        // Haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, longPressDelay);
    }
  }, [isTouchDevice, onLongPress, onPinch, longPressDelay, getDistance]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!isTouchDevice) return;

    // Cancel long press if finger moves too much
    if (touchState.current.longPressTimer) {
      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - touchState.current.startX);
      const deltaY = Math.abs(touch.clientY - touchState.current.startY);
      
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(touchState.current.longPressTimer);
        touchState.current.longPressTimer = null;
      }
    }

    // Handle pinch gestures
    if (event.touches.length === 2 && onPinch && touchState.current.initialDistance > 0) {
      const currentDistance = getDistance(event.touches[0], event.touches[1]);
      const scale = currentDistance / touchState.current.initialDistance;
      
      if (Math.abs(scale - 1) > pinchThreshold) {
        onPinch(scale);
      }
    }
  }, [isTouchDevice, onPinch, pinchThreshold, getDistance]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!isTouchDevice) return;

    // Clear long press timer
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = null;
    }

    // Skip gesture detection if it was a long press
    if (touchState.current.isLongPress) {
      return;
    }

    const touch = event.changedTouches[0];
    const endTime = Date.now();
    const deltaX = touch.clientX - touchState.current.startX;
    const deltaY = touch.clientY - touchState.current.startY;
    const deltaTime = endTime - touchState.current.startTime;

    // Swipe detection
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > swipeThreshold || absDeltaY > swipeThreshold) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
      return;
    }

    // Tap detection (only for single touch, quick taps)
    if (touchState.current.touchCount === 1 && deltaTime < 300 && absDeltaX < 10 && absDeltaY < 10) {
      const timeSinceLastTap = endTime - touchState.current.lastTapTime;
      
      if (timeSinceLastTap < doubleTapDelay && onDoubleTap) {
        onDoubleTap(event);
        touchState.current.lastTapTime = 0; // Reset to prevent triple tap
      } else {
        touchState.current.lastTapTime = endTime;
        
        // Delay single tap to check for double tap
        setTimeout(() => {
          if (endTime === touchState.current.lastTapTime && onTap) {
            onTap(event);
          }
        }, doubleTapDelay);
      }
    }
  }, [
    isTouchDevice,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    swipeThreshold,
    doubleTapDelay
  ]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !isTouchDevice) return;

    // Add touch event listeners with passive option for better performance
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      // Clean up any pending timers
      if (touchState.current.longPressTimer) {
        clearTimeout(touchState.current.longPressTimer);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isTouchDevice]);

  return {
    isTouchDevice,
    isGestureSupported: isTouchDevice && 'ontouchstart' in window
  };
}

// Haptic feedback utility
export const hapticFeedback = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 25, 50]);
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  }
};