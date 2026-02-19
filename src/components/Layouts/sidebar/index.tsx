"use client";


import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_DATA } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import { useAuthEnhanced } from "@/hooks/use-auth-enhanced";

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, isTablet, isDesktop, toggleSidebar, variant } = useSidebarContext();
  const { device, isTouchDevice } = useResponsive();
  const { hasRole } = useAuthEnhanced();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));
  };

  useEffect(() => {
    // Keep collapsible open when its subpage is active
    NAV_DATA.some((section) => {
      return section.items.some((item) => {
        return item.items.some((subItem) => {
          if (subItem.url === pathname) {
            if (!expandedItems.includes(item.title)) {
              toggleExpanded(item.title);
            }
            return true;
          }
        });
      });
    });
  }, [pathname]);

  // Touch gesture handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentTouch = moveEvent.touches[0];
      const deltaX = currentTouch.clientX - startX;
      
      // Swipe right to open, swipe left to close
      if (deltaX > 50 && !isOpen) {
        setIsOpen(true);
        document.removeEventListener('touchmove', handleTouchMove);
      } else if (deltaX < -50 && isOpen) {
        setIsOpen(false);
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    setTimeout(() => document.removeEventListener('touchmove', handleTouchMove), 300);
  };

  const getSidebarWidth = () => {
    if (variant === 'mobile') return isOpen ? 'w-full' : 'w-0';
    if (variant === 'tablet') return isOpen ? 'w-64' : 'w-0';
    return isOpen ? 'w-[290px]' : 'w-0';
  };

  const getSidebarClasses = () => {
    const baseClasses = "overflow-hidden border-r border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-dark";
    
    if (variant === 'mobile') {
      return cn(
        baseClasses,
        "fixed bottom-0 top-0 z-50 max-w-[290px]",
        getSidebarWidth()
      );
    }
    
    if (variant === 'tablet') {
      return cn(
        baseClasses,
        "sticky top-0 h-screen",
        getSidebarWidth()
      );
    }
    
    return cn(
      baseClasses,
      "sticky top-0 h-screen max-w-[290px]",
      getSidebarWidth()
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          onTouchStart={handleTouchStart}
          aria-hidden="true"
        />
      )}

      <aside
        className={getSidebarClasses()}
        aria-label="Main navigation"
        aria-hidden={!isOpen && variant !== 'tablet'}
        inert={!isOpen && variant !== 'tablet'}
        onTouchStart={handleTouchStart}
      >
        <div className="flex h-full flex-col py-6 pl-6 pr-2 md:py-10 md:pl-[25px] md:pr-[7px]">
          {/* Header */}
          <div className="relative pr-4.5">
            {/* Mobile close button */}
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className={cn(
                  "absolute right-4.5 top-1/2 -translate-y-1/2",
                  // Touch-optimized sizing
                  "min-h-[44px] min-w-[44px] flex items-center justify-center"
                )}
                aria-label="Close Menu"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
            )}
            
            {/* Tablet open button - shown when sidebar is closed */}
            {isTablet && !isOpen && (
              <button
                onClick={toggleSidebar}
                className={cn(
                  "absolute right-4.5 top-1/2 -translate-y-1/2",
                  // Touch-optimized sizing
                  "min-h-[44px] min-w-[44px] flex items-center justify-center"
                )}
                aria-label="Open Menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className={cn(
            "custom-scrollbar mt-6 flex-1 overflow-y-auto pr-3",
            "md:mt-10"
          )}>
            {NAV_DATA.map((section) => {
              // Filter items based on role and mobile visibility
              const visibleItems = section.items.filter((item: any) => {
                // Filter out items hidden on mobile
                if (isMobile && item.hideOnMobile) {
                  return false;
                }
                // Filter out items that require specific roles
                if (item.requiresRole) {
                  return hasRole(item.requiresRole);
                }
                return true;
              });

              // Don't render the section if there are no visible items
              if (visibleItems.length === 0) {
                return null;
              }

              return (
              <div key={section.label} className="mb-6">
                {/* Section header */}
                <h2 className={cn(
                  "mb-5 text-sm font-medium text-dark-4 dark:text-dark-6",
                  variant === 'tablet' && !isOpen && "hidden"
                )}>
                  {section.label}
                </h2>

                <nav role="navigation" aria-label={section.label}>
                  <ul className="space-y-2">
                    {visibleItems.map((item) => {
                        // Filter subitems based on role requirements
                        const filteredSubItems = item.items.filter((subItem: any) => {
                          if (subItem.requiresRole) {
                            return hasRole(subItem.requiresRole);
                          }
                          return true;
                        });
                        
                        const menuItemContent = (
                          <li key={item.title}>
                            {filteredSubItems.length ? (
                              <div>
                                <MenuItem
                                  isActive={filteredSubItems.some(
                                    ({ url }) => url === pathname,
                                  )}
                                  onClick={() => toggleExpanded(item.title)}
                                  className={cn(
                                  // Touch-optimized sizing
                                  isTouchDevice && "min-h-[44px]",
                                  // Tablet condensed state
                                  variant === 'tablet' && !isOpen && "justify-center px-2"
                                )}
                              >
                                <item.icon
                                  className={cn(
                                    "size-6 shrink-0",
                                    variant === 'tablet' && !isOpen && "size-5"
                                  )}
                                  aria-hidden="true"
                                />

                                <span className={cn(
                                  variant === 'tablet' && !isOpen && "hidden"
                                )}>{item.title}</span>
                                {(variant !== 'tablet' || isOpen) && filteredSubItems.length > 0 && (
                                  <ChevronUp
                                    className={cn(
                                      "ml-auto rotate-180 transition-transform duration-200",
                                      expandedItems.includes(item.title) && "rotate-0",
                                      variant === 'tablet' && !isOpen && "hidden"
                                    )}
                                    aria-hidden="true"
                                  />
                                )}
                              </MenuItem>

                              {/* Submenu */}
                              {expandedItems.includes(item.title) && (variant !== 'tablet' || isOpen) && (
                                <ul className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2" role="menu">
                                  {filteredSubItems.map((subItem) => (
                                    <li key={subItem.title} role="none">
                                      <MenuItem
                                        as="link"
                                        href={subItem.url}
                                        isActive={pathname === subItem.url}
                                        className={cn(
                                          // Touch-optimized sizing
                                          isTouchDevice && "min-h-[44px]"
                                        )}
                                      >
                                        <span>{subItem.title}</span>
                                      </MenuItem>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : (
                            (() => {
                              const href = "url" in item ? item.url + "" : "/" + item.title.toLowerCase().split(" ").join("-");

                              return (
                                <MenuItem
                                  className={cn(
                                    "flex items-center gap-3 py-3",
                                    // Touch-optimized sizing
                                    isTouchDevice && "min-h-[44px]",
                                    // Tablet condensed state
                                    variant === 'tablet' && !isOpen && "justify-center px-2"
                                  )}
                                  as="link"
                                  href={href}
                                  isActive={pathname === href}
                                >
                                  <item.icon
                                    className={cn(
                                      "size-6 shrink-0",
                                      variant === 'tablet' && !isOpen && "size-5"
                                    )}
                                    aria-hidden="true"
                                  />

                                  <span className={cn(
                                    variant === 'tablet' && !isOpen && "hidden"
                                  )}>{item.title}</span>
                                </MenuItem>
                              );
                            })()
                          )}
                        </li>
                      );

                      return menuItemContent;
                    })}
                  </ul>
                </nav>
              </div>
            );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
