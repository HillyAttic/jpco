"use client";

import { useServiceWorker } from "@/hooks/use-service-worker";
import { useResponsive } from "@/hooks/use-responsive";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallButton() {
  const { device, isTouchDevice } = useResponsive();
  const { isSupported } = useServiceWorker();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Enhanced mobile detection
    const detectMobile = () => {
      // User agent detection
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Screen size detection
      const isMobileScreen = window.innerWidth < 768;
      
      // Touch detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Combined mobile detection
      const isMobileDevice = isMobileUA || (isMobileScreen && isTouchDevice);
      
      console.log('Mobile Detection:', {
        userAgent: userAgent.substring(0, 50) + '...',
        isMobileUA,
        isMobileScreen,
        isTouchDevice,
        isMobileDevice,
        screenWidth: window.innerWidth,
        deviceType: device.type
      });
      
      return isMobileDevice;
    };

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check if running in fullscreen mode
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      // Check for iOS standalone mode
      const isIOSStandalone = (window.navigator as any).standalone === true;
      
      const installed = isStandalone || isFullscreen || isIOSStandalone;
      setIsInstalled(installed);
      
      console.log('Installation Status:', {
        isStandalone,
        isFullscreen,
        isIOSStandalone,
        installed
      });
    };

    checkIfInstalled();

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('appinstalled event fired');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // For iOS or if mobile detected, show install button if not installed
    if ((iOS || detectMobile()) && !isInstalled) {
      console.log('Setting installable to true for mobile/iOS device');
      setIsInstallable(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // For iOS, show instructions since we can't trigger install programmatically
      alert(
        'To install this app on your iOS device:\n\n' +
        '1. Tap the Share button (square with arrow)\n' +
        '2. Scroll down and tap "Add to Home Screen"\n' +
        '3. Tap "Add" to confirm'
      );
      return;
    }

    if (!deferredPrompt) return;

    try {
      // Show the install prompt (Android/Chrome)
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  // Enhanced mobile detection for visibility
  const isMobileDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isMobileScreen = window.innerWidth < 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return isMobileUA || (isMobileScreen && isTouchDevice) || device.type === 'mobile';
  };

  // Debug logging
  console.log('PWA Install Button Debug:', {
    deviceType: device.type,
    isSupported,
    isInstallable,
    isInstalled,
    isIOS,
    deferredPrompt: !!deferredPrompt,
    isMobileDevice: isMobileDevice()
  });

  // Show on mobile devices when installable, not installed, and PWA is supported
  if (!isMobileDevice() || !isSupported || !isInstallable || isInstalled) {
    console.log('PWA Install Button hidden because:', {
      notMobile: !isMobileDevice(),
      notSupported: !isSupported,
      notInstallable: !isInstallable,
      alreadyInstalled: isInstalled
    });
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className={`
        group rounded-full bg-gray-3 p-[5px] text-[#111928] outline-1 outline-primary 
        focus-visible:outline dark:bg-[#020D1A] dark:text-current
        hover:bg-gray-4 dark:hover:bg-[#FFFFFF1A] transition-colors
        ${isTouchDevice ? 'min-h-[44px] min-w-[44px]' : 'min-h-[36px] min-w-[36px]'}
      `}
      aria-label="Install App"
      title={isIOS ? "Add to Home Screen" : "Install JPCO Dashboard"}
    >
      <span className="sr-only">Install App</span>
      <div className={`
        flex items-center justify-center
        ${isTouchDevice ? 'h-[34px] w-[34px]' : 'h-[26px] w-[26px]'}
      `}>
        {/* PWA Install Icon - Mobile with download arrow */}
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none"
          className="text-current"
        >
          <g clipPath="url(#clip0_11570_87998)">
            <path 
              d="M18 20.25V3.75C18 2.92157 17.3284 2.25 16.5 2.25L7.5 2.25C6.67157 2.25 6 2.92157 6 3.75L6 20.25C6 21.0784 6.67157 21.75 7.5 21.75H16.5C17.3284 21.75 18 21.0784 18 20.25Z" 
              stroke="currentColor" 
              strokeWidth="1.4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M12 10.1055L12 17.6055" 
              stroke="currentColor" 
              strokeWidth="1.4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M9.75 15.3555L12 17.6055L14.25 15.3555" 
              stroke="currentColor" 
              strokeWidth="1.4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M10.5 4.5H13.5" 
              stroke="currentColor" 
              strokeWidth="1.4" 
              strokeLinecap="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_11570_87998">
              <rect width="24" height="24" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      </div>
    </button>
  );
}