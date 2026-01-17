import { useEffect, useState } from "react";

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  touchCapable: boolean;
  pixelRatio: number;
}

export interface ResponsiveState {
  device: DeviceInfo;
  breakpoint: string;
  sidebarOpen: boolean;
  navigationCollapsed: boolean;
}

export const RESPONSIVE_BREAKPOINTS = {
  '2xsm': 375,
  'xsm': 425,
  'sm': 640,
  'md': 768,
  'lg': 1024,
  'xl': 1280,
  '2xl': 1536,
  '3xl': 2000
} as const;

export function useResponsive() {
  const [responsiveState, setResponsiveState] = useState<ResponsiveState>({
    device: {
      type: 'desktop',
      screenWidth: 1024,
      screenHeight: 768,
      orientation: 'landscape',
      touchCapable: false,
      pixelRatio: 1
    },
    breakpoint: 'lg',
    sidebarOpen: true,
    navigationCollapsed: false
  });

  useEffect(() => {
    const updateResponsiveState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Determine device type
      let deviceType: 'mobile' | 'tablet' | 'desktop';
      if (width < RESPONSIVE_BREAKPOINTS.md) {
        deviceType = 'mobile';
      } else if (width < RESPONSIVE_BREAKPOINTS.lg) {
        deviceType = 'tablet';
      } else {
        deviceType = 'desktop';
      }

      // Determine breakpoint
      let breakpoint = 'sm';
      if (width >= RESPONSIVE_BREAKPOINTS['3xl']) breakpoint = '3xl';
      else if (width >= RESPONSIVE_BREAKPOINTS['2xl']) breakpoint = '2xl';
      else if (width >= RESPONSIVE_BREAKPOINTS.xl) breakpoint = 'xl';
      else if (width >= RESPONSIVE_BREAKPOINTS.lg) breakpoint = 'lg';
      else if (width >= RESPONSIVE_BREAKPOINTS.md) breakpoint = 'md';
      else if (width >= RESPONSIVE_BREAKPOINTS.sm) breakpoint = 'sm';
      else if (width >= RESPONSIVE_BREAKPOINTS.xsm) breakpoint = 'xsm';
      else if (width >= RESPONSIVE_BREAKPOINTS['2xsm']) breakpoint = '2xsm';

      const orientation = width > height ? 'landscape' : 'portrait';

      setResponsiveState(prev => ({
        ...prev,
        device: {
          type: deviceType,
          screenWidth: width,
          screenHeight: height,
          orientation,
          touchCapable,
          pixelRatio
        },
        breakpoint,
        sidebarOpen: deviceType === 'desktop' ? true : prev.sidebarOpen,
        navigationCollapsed: deviceType === 'mobile'
      }));
    };

    // Initial call
    updateResponsiveState();

    // Add event listeners
    window.addEventListener('resize', updateResponsiveState);
    window.addEventListener('orientationchange', updateResponsiveState);

    return () => {
      window.removeEventListener('resize', updateResponsiveState);
      window.removeEventListener('orientationchange', updateResponsiveState);
    };
  }, []);

  const toggleSidebar = () => {
    setResponsiveState(prev => ({
      ...prev,
      sidebarOpen: !prev.sidebarOpen
    }));
  };

  const toggleNavigation = () => {
    setResponsiveState(prev => ({
      ...prev,
      navigationCollapsed: !prev.navigationCollapsed
    }));
  };

  return {
    ...responsiveState,
    toggleSidebar,
    toggleNavigation,
    isMobile: responsiveState.device.type === 'mobile',
    isTablet: responsiveState.device.type === 'tablet',
    isDesktop: responsiveState.device.type === 'desktop',
    isTouchDevice: responsiveState.device.touchCapable,
    isPortrait: responsiveState.device.orientation === 'portrait',
    isLandscape: responsiveState.device.orientation === 'landscape'
  };
}

export function useBreakpoint() {
  const { breakpoint, device } = useResponsive();
  
  return {
    breakpoint,
    isMobile: device.type === 'mobile',
    isTablet: device.type === 'tablet',
    isDesktop: device.type === 'desktop',
    isSmallMobile: device.screenWidth < RESPONSIVE_BREAKPOINTS['2xsm'],
    isLargeMobile: device.screenWidth >= RESPONSIVE_BREAKPOINTS.xsm && device.screenWidth < RESPONSIVE_BREAKPOINTS.md,
    isSmallTablet: device.screenWidth >= RESPONSIVE_BREAKPOINTS.md && device.screenWidth < RESPONSIVE_BREAKPOINTS.lg,
    isSmallDesktop: device.screenWidth >= RESPONSIVE_BREAKPOINTS.lg && device.screenWidth < RESPONSIVE_BREAKPOINTS.xl,
    isLargeDesktop: device.screenWidth >= RESPONSIVE_BREAKPOINTS.xl,
    isUltraWide: device.screenWidth >= RESPONSIVE_BREAKPOINTS['3xl']
  };
}