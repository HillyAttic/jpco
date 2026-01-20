"use client";

import { useResponsive } from "@/hooks/use-responsive";
import { createContext, useContext, useEffect, useState } from "react";

type SidebarState = "expanded" | "collapsed";

type SidebarContextType = {
  state: SidebarState;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  toggleSidebar: () => void;
  variant: 'mobile' | 'tablet' | 'desktop';
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { device, isMobile, isTablet, isDesktop } = useResponsive();

  useEffect(() => {
    // Auto-manage sidebar state based on device type
    if (device.type === 'mobile') {
      setIsOpen(false);
    } else if (device.type === 'tablet') {
      setIsOpen(false); // Condensed by default on tablet
    } else {
      setIsOpen(true); // Expanded by default on desktop
    }
  }, [device.type]);

  function toggleSidebar() {
    setIsOpen((prev) => !prev);
  }

  const getSidebarState = (): SidebarState => {
    if (!isOpen) return "collapsed";
    return "expanded";
  };

  const getVariant = (): 'mobile' | 'tablet' | 'desktop' => {
    return device.type;
  };

  return (
    <SidebarContext.Provider
      value={{
        state: getSidebarState(),
        isOpen,
        setIsOpen,
        isMobile,
        isTablet,
        isDesktop,
        toggleSidebar,
        variant: getVariant(),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
