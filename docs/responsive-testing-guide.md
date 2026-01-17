# Responsive Design Testing Guide

## Overview

This guide provides comprehensive testing strategies for the JPCO Dashboard responsive design system, including manual testing procedures, automated testing approaches, and debugging techniques.

## Table of Contents

1. [Testing Strategy Overview](#testing-strategy-overview)
2. [Manual Testing](#manual-testing)
3. [Automated Testing](#automated-testing)
4. [Property-Based Testing](#property-based-testing)
5. [Cross-Browser Testing](#cross-browser-testing)
6. [Device Testing](#device-testing)
7. [Performance Testing](#performance-testing)
8. [Accessibility Testing](#accessibility-testing)
9. [Debugging Tools](#debugging-tools)
10. [Continuous Integration](#continuous-integration)

## Testing Strategy Overview

### Testing Pyramid

```
    /\
   /  \    E2E Tests (Cross-browser, Real devices)
  /____\
 /      \   Integration Tests (Component interactions)
/________\
          \  Unit Tests (Individual components)
           \
            \ Property-Based Tests (Universal properties)
```

### Test Types

1. **Unit Tests**: Individual component behavior
2. **Property-Based Tests**: Universal responsive properties
3. **Integration Tests**: Component interactions across breakpoints
4. **Visual Regression Tests**: Layout consistency
5. **Performance Tests**: Animation and loading performance
6. **Accessibility Tests**: Screen reader and keyboard navigation
7. **Cross-Browser Tests**: Compatibility across browsers
8. **Device Tests**: Real device validation

## Manual Testing

### Breakpoint Testing Checklist

#### Desktop Testing (1024px+)

- [ ] **Navigation**: Full sidebar visible by default
- [ ] **Layout**: Multi-column layouts display correctly
- [ ] **Hover States**: Hover effects work on interactive elements
- [ ] **Content Width**: Content doesn't stretch beyond readable limits on ultra-wide screens
- [ ] **Typography**: Font sizes appropriate for desktop viewing
- [ ] **Images**: High-resolution images load correctly
- [ ] **Forms**: Standard form layouts with appropriate spacing

#### Tablet Testing (768px - 1023px)

- [ ] **Navigation**: Condensed sidebar that expands on hover/tap
- [ ] **Layout**: Adaptive grid layouts (2-3 columns)
- [ ] **Touch Targets**: All interactive elements at least 44px
- [ ] **Tables**: Horizontal scrolling or condensed view
- [ ] **Forms**: Touch-optimized input fields
- [ ] **Orientation**: Both portrait and landscape modes work
- [ ] **Gestures**: Swipe navigation functions correctly

#### Mobile Testing (320px - 767px)

- [ ] **Navigation**: Hamburger menu with overlay
- [ ] **Layout**: Single column, vertically stacked content
- [ ] **Touch Targets**: Minimum 44px, recommended 48px+
- [ ] **Typography**: Readable font sizes (16px+ for inputs)
- [ ] **Images**: Optimized for mobile bandwidth
- [ ] **Forms**: Large touch targets, appropriate keyboards
- [ ] **Gestures**: Swipe, long press, double tap work correctly
- [ ] **Performance**: Smooth scrolling and animations

### Orientation Testing

#### Portrait Mode
- [ ] Content stacks vertically
- [ ] Navigation adapts appropriately
- [ ] Images scale correctly
- [ ] Forms remain usable

#### Landscape Mode
- [ ] Layout adjusts for wider viewport
- [ ] Navigation remains accessible
- [ ] Content doesn't become too wide
- [ ] Virtual keyboard doesn't obscure content

### Browser Testing Matrix

| Browser | Desktop | Tablet | Mobile | Notes |
|---------|---------|--------|--------|-------|
| Chrome | ✅ | ✅ | ✅ | Primary development browser |
| Firefox | ✅ | ✅ | ✅ | Test CSS Grid/Flexbox |
| Safari | ✅ | ✅ | ✅ | iOS-specific behaviors |
| Edge | ✅ | ✅ | ✅ | Windows touch devices |
| Samsung Internet | - | ✅ | ✅ | Android default browser |

## Automated Testing

### Component Testing Setup

```typescript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: [
    '**/__tests__/**/*.test.{js,jsx,ts,tsx}'
  ]
};

// jest.setup.js
import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

### Responsive Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { useResponsive } from '@/hooks/use-responsive';
import { ResponsiveLayout } from '@/components/ui/responsive-layout';

// Mock viewport dimensions
const mockViewport = (width: number, height: number = 768) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  fireEvent(window, new Event('resize'));
};

describe('ResponsiveLayout', () => {
  test('applies mobile styles on small screens', () => {
    mockViewport(375);
    
    render(
      <ResponsiveLayout data-testid="layout">
        <div>Content</div>
      </ResponsiveLayout>
    );
    
    const layout = screen.getByTestId('layout');
    expect(layout).toHaveAttribute('data-device-type', 'mobile');
    expect(layout).toHaveClass('px-4'); // Mobile padding
  });
  
  test('applies desktop styles on large screens', () => {
    mockViewport(1200);
    
    render(
      <ResponsiveLayout data-testid="layout">
        <div>Content</div>
      </ResponsiveLayout>
    );
    
    const layout = screen.getByTestId('layout');
    expect(layout).toHaveAttribute('data-device-type', 'desktop');
    expect(layout).toHaveClass('px-8'); // Desktop padding
  });
});
```

### Touch Interaction Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { TouchOptimizedButton } from '@/components/ui/touch-optimized-input';

describe('TouchOptimizedButton', () => {
  test('meets minimum touch target size', () => {
    render(
      <TouchOptimizedButton touchTargetSize="md">
        Test Button
      </TouchOptimizedButton>
    );
    
    const button = screen.getByRole('button');
    const styles = window.getComputedStyle(button);
    
    // Check minimum touch target size
    expect(button).toHaveClass('min-h-[48px]');
    expect(button).toHaveClass('min-w-[48px]');
  });
  
  test('provides touch feedback on interaction', () => {
    render(
      <TouchOptimizedButton>
        Test Button
      </TouchOptimizedButton>
    );
    
    const button = screen.getByRole('button');
    
    // Should have touch manipulation class
    expect(button).toHaveClass('touch-manipulation');
    expect(button).toHaveClass('active:scale-95');
  });
});
```

## Property-Based Testing

### Running Property Tests

```bash
# Run all property-based tests
npm test -- --testPathPatterns=responsive-design-properties

# Run with verbose output to see all test cases
npm test -- --testPathPatterns=responsive-design-properties --verbose

# Run specific property test
npm test -- --testNamePattern="Property 1: Layout Adaptation"
```

### Property Test Structure

```typescript
import fc from 'fast-check';

describe('Responsive Design Properties', () => {
  test('Property: Layout adapts to viewport changes', () => {
    fc.assert(fc.property(
      fc.integer({ min: 320, max: 3840 }), // Viewport width
      (width) => {
        mockViewport(width);
        
        const { result } = renderHook(() => useResponsive());
        
        // Property: Device type should match viewport width
        if (width < 768) {
          expect(result.current.device.type).toBe('mobile');
        } else if (width < 1024) {
          expect(result.current.device.type).toBe('tablet');
        } else {
          expect(result.current.device.type).toBe('desktop');
        }
        
        return true;
      }
    ), { numRuns: 100 });
  });
});
```

### Property Test Debugging

When property tests fail, use verbose mode to see the failing cases:

```bash
# Enable verbose mode for detailed failure information
npm test -- --testPathPatterns=responsive-design-properties --verbose

# Run with specific seed to reproduce failures
FC_SEED=123456 npm test -- --testPathPatterns=responsive-design-properties
```

## Cross-Browser Testing

### Browser-Specific Test Configuration

```typescript
// browser-specific.test.ts
describe('Browser-specific responsive behavior', () => {
  beforeEach(() => {
    // Mock user agent for different browsers
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    });
  });
  
  test('iOS Safari specific behaviors', () => {
    // Test iOS-specific touch behaviors
    // Test viewport meta tag handling
    // Test safe area insets
  });
  
  test('Android Chrome specific behaviors', () => {
    // Test Android-specific touch behaviors
    // Test viewport handling differences
  });
});
```

### Automated Cross-Browser Testing

```javascript
// playwright.config.js
module.exports = {
  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      }
    },
    {
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      }
    },
    {
      name: 'iPhone 12',
      use: { ...devices['iPhone 12'] }
    },
    {
      name: 'iPad Pro',
      use: { ...devices['iPad Pro'] }
    },
    {
      name: 'Samsung Galaxy S21',
      use: { ...devices['Galaxy S21'] }
    }
  ]
};
```

## Device Testing

### Physical Device Testing Checklist

#### iOS Devices
- [ ] **iPhone SE (375px)**: Smallest modern iPhone
- [ ] **iPhone 12/13 (390px)**: Standard iPhone size
- [ ] **iPhone 12/13 Pro Max (428px)**: Large iPhone
- [ ] **iPad (768px)**: Standard tablet size
- [ ] **iPad Pro (1024px)**: Large tablet

#### Android Devices
- [ ] **Small Android (360px)**: Common small Android size
- [ ] **Medium Android (412px)**: Standard Android size
- [ ] **Large Android (480px)**: Large Android phones
- [ ] **Android Tablet (800px)**: Standard Android tablet

#### Desktop/Laptop
- [ ] **Small Laptop (1366px)**: Common laptop resolution
- [ ] **Desktop (1920px)**: Standard desktop resolution
- [ ] **Ultra-wide (2560px+)**: Large desktop displays

### Device Testing Tools

```typescript
// Device simulation utility
export const deviceSimulator = {
  iPhone12: { width: 390, height: 844, pixelRatio: 3 },
  iPadPro: { width: 1024, height: 1366, pixelRatio: 2 },
  galaxyS21: { width: 412, height: 915, pixelRatio: 2.75 },
  desktop: { width: 1920, height: 1080, pixelRatio: 1 }
};

// Simulate device in tests
const simulateDevice = (device: keyof typeof deviceSimulator) => {
  const config = deviceSimulator[device];
  
  Object.defineProperty(window, 'innerWidth', {
    value: config.width,
    configurable: true
  });
  
  Object.defineProperty(window, 'devicePixelRatio', {
    value: config.pixelRatio,
    configurable: true
  });
  
  fireEvent(window, new Event('resize'));
};
```

## Performance Testing

### Animation Performance Tests

```typescript
describe('Animation Performance', () => {
  test('animations maintain 60fps on desktop', async () => {
    const performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        // Check frame timing
        expect(entry.duration).toBeLessThan(16.67); // 60fps = 16.67ms per frame
      });
    });
    
    performanceObserver.observe({ entryTypes: ['measure'] });
    
    // Trigger animation
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Wait for animation to complete
    await waitFor(() => {
      expect(button).toHaveClass('scale-95');
    });
  });
  
  test('reduces animations on low-performance devices', () => {
    // Mock low-performance device
    Object.defineProperty(performance, 'memory', {
      value: { usedJSHeapSize: 50000000, jsHeapSizeLimit: 100000000 }
    });
    
    const { result } = renderHook(() => usePerformanceOptimization());
    
    expect(result.current.shouldUseReducedAnimations).toBe(true);
  });
});
```

### Loading Performance Tests

```typescript
describe('Loading Performance', () => {
  test('lazy loads components below the fold', async () => {
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null
    });
    
    window.IntersectionObserver = mockIntersectionObserver;
    
    render(
      <LazyComponent
        importFn={() => import('./HeavyComponent')}
        threshold={0.1}
      />
    );
    
    // Component should not be loaded initially
    expect(screen.queryByTestId('heavy-component')).not.toBeInTheDocument();
    
    // Simulate intersection
    const [callback] = mockIntersectionObserver.mock.calls[0];
    callback([{ isIntersecting: true }]);
    
    // Component should load
    await waitFor(() => {
      expect(screen.getByTestId('heavy-component')).toBeInTheDocument();
    });
  });
});
```

## Accessibility Testing

### Automated Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  test('responsive components have no accessibility violations', async () => {
    const { container } = render(
      <ResponsiveLayout>
        <TouchOptimizedButton>Accessible Button</TouchOptimizedButton>
        <TouchOptimizedInput label="Accessible Input" />
      </ResponsiveLayout>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  test('touch targets meet accessibility guidelines', () => {
    render(<TouchOptimizedButton touchTargetSize="sm">Small Button</TouchOptimizedButton>);
    
    const button = screen.getByRole('button');
    
    // WCAG 2.1 AA requires 44x44px minimum
    expect(button).toHaveClass('min-h-[44px]');
    expect(button).toHaveClass('min-w-[44px]');
  });
});
```

### Keyboard Navigation Tests

```typescript
describe('Keyboard Navigation', () => {
  test('all interactive elements are keyboard accessible', () => {
    render(
      <div>
        <TouchOptimizedButton>Button 1</TouchOptimizedButton>
        <TouchOptimizedButton>Button 2</TouchOptimizedButton>
        <TouchOptimizedInput label="Input" />
      </div>
    );
    
    const button1 = screen.getByRole('button', { name: 'Button 1' });
    const button2 = screen.getByRole('button', { name: 'Button 2' });
    const input = screen.getByRole('textbox');
    
    // Test tab navigation
    button1.focus();
    expect(button1).toHaveFocus();
    
    fireEvent.keyDown(button1, { key: 'Tab' });
    expect(button2).toHaveFocus();
    
    fireEvent.keyDown(button2, { key: 'Tab' });
    expect(input).toHaveFocus();
  });
});
```

## Debugging Tools

### Responsive Debug Component

```typescript
function ResponsiveDebugPanel() {
  const { device, breakpoint } = useResponsive();
  const { metrics } = usePerformanceOptimization();
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs z-50 font-mono">
      <div>Device: {device.type}</div>
      <div>Breakpoint: {breakpoint}</div>
      <div>Screen: {device.screenWidth}×{device.screenHeight}</div>
      <div>Touch: {device.touchCapable ? 'Yes' : 'No'}</div>
      <div>Orientation: {device.orientation}</div>
      <div>FPS: {metrics.fps}</div>
      <div>Memory: {metrics.memoryUsage}%</div>
      <div>Connection: {metrics.connectionType}</div>
    </div>
  );
}
```

### Browser DevTools Testing

#### Chrome DevTools
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select device presets or custom dimensions
4. Test different orientations
5. Throttle network and CPU for performance testing

#### Firefox DevTools
1. Open DevTools (F12)
2. Click responsive design mode (Ctrl+Shift+M)
3. Test different devices and orientations
4. Use accessibility inspector

#### Safari DevTools
1. Enable Develop menu in Safari preferences
2. Use responsive design mode
3. Test iOS-specific behaviors
4. Check console for iOS-specific errors

### Testing Utilities

```typescript
// test-utils.ts
export const renderWithResponsive = (
  ui: React.ReactElement,
  viewport: { width: number; height: number } = { width: 1024, height: 768 }
) => {
  // Mock viewport
  Object.defineProperty(window, 'innerWidth', {
    value: viewport.width,
    configurable: true
  });
  
  Object.defineProperty(window, 'innerHeight', {
    value: viewport.height,
    configurable: true
  });
  
  return render(ui);
};

export const simulateTouch = (element: Element, touches: Array<{ x: number; y: number }>) => {
  fireEvent.touchStart(element, {
    touches: touches.map(touch => ({ clientX: touch.x, clientY: touch.y }))
  });
};

export const simulateSwipe = (
  element: Element,
  start: { x: number; y: number },
  end: { x: number; y: number }
) => {
  fireEvent.touchStart(element, {
    touches: [{ clientX: start.x, clientY: start.y }]
  });
  
  fireEvent.touchEnd(element, {
    changedTouches: [{ clientX: end.x, clientY: end.y }]
  });
};
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/responsive-tests.yml
name: Responsive Design Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm test -- --coverage
    
    - name: Run property-based tests
      run: npm test -- --testPathPatterns=responsive-design-properties
    
    - name: Run cross-browser tests
      run: npx playwright test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

### Test Reporting

```typescript
// jest.config.js
module.exports = {
  // ... other config
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results',
      filename: 'report.html'
    }]
  ],
  coverageReporters: ['text', 'lcov', 'html']
};
```

## Test Maintenance

### Regular Testing Schedule

- **Daily**: Automated unit and property tests
- **Weekly**: Cross-browser testing on major browsers
- **Monthly**: Physical device testing
- **Release**: Full regression testing across all devices and browsers

### Test Data Management

```typescript
// test-data.ts
export const testViewports = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Desktop', width: 1920, height: 1080 },
  { name: 'Ultra-wide', width: 2560, height: 1440 }
];

export const testBreakpoints = [320, 375, 768, 1024, 1280, 1920, 2560];

export const testDevices = {
  mobile: testViewports.filter(v => v.width < 768),
  tablet: testViewports.filter(v => v.width >= 768 && v.width < 1024),
  desktop: testViewports.filter(v => v.width >= 1024)
};
```

## Conclusion

Comprehensive testing of responsive design requires a multi-layered approach combining automated testing, manual verification, and continuous monitoring. Key principles:

1. **Test Early and Often**: Integrate responsive testing into your development workflow
2. **Use Real Devices**: Simulators can't catch all device-specific behaviors
3. **Automate What You Can**: Property-based tests catch edge cases manual testing might miss
4. **Monitor Performance**: Responsive design should enhance, not hinder, user experience
5. **Maintain Accessibility**: Ensure responsive changes don't break accessibility features

Regular testing across this comprehensive matrix ensures your responsive design system works reliably for all users across all devices and contexts.