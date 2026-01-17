/**
 * Accessibility Utilities
 * Helper functions for implementing accessibility features
 * Validates Requirements: 7.3, 7.4, 7.5
 */

/**
 * Trap focus within a container (useful for modals)
 */
export function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Generate unique ID for accessibility labels
 */
let idCounter = 0;
export function generateId(prefix: string = 'a11y'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Check if element is keyboard accessible
 */
export function isKeyboardAccessible(element: HTMLElement): boolean {
  const tabIndex = element.getAttribute('tabindex');
  const isInteractive = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
  
  return isInteractive || (tabIndex !== null && tabIndex !== '-1');
}

/**
 * Get keyboard navigation handler
 */
export function getKeyboardNavigationHandler(
  onEnter?: () => void,
  onSpace?: () => void,
  onEscape?: () => void
) {
  return (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        if (onEnter) {
          e.preventDefault();
          onEnter();
        }
        break;
      case ' ':
        if (onSpace) {
          e.preventDefault();
          onSpace();
        }
        break;
      case 'Escape':
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        break;
    }
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get ARIA label for status
 */
export function getStatusAriaLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    active: 'Active status',
    inactive: 'Inactive status',
    pending: 'Pending status',
    completed: 'Completed status',
    'in-progress': 'In progress status',
    'on-leave': 'On leave status',
    terminated: 'Terminated status',
    archived: 'Archived status',
  };

  return statusLabels[status] || `${status} status`;
}

/**
 * Get ARIA label for priority
 */
export function getPriorityAriaLabel(priority: string): string {
  const priorityLabels: Record<string, string> = {
    low: 'Low priority',
    medium: 'Medium priority',
    high: 'High priority',
    urgent: 'Urgent priority',
  };

  return priorityLabels[priority] || `${priority} priority`;
}
