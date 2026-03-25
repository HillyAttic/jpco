"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bell, ClipboardCheck, CalendarRange, CalendarDays } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { useEnhancedAuth } from "@/contexts/enhanced-auth.context";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  showBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Home",
  },
  {
    href: "/calendar",
    icon: CalendarDays,
    label: "Compliance",
  },
  {
    href: "/notifications",
    icon: Bell,
    label: "Alerts",
    showBadge: true,
  },
  {
    href: "/roster/update-schedule",
    icon: CalendarRange,
    label: "Roster",
  },
  {
    href: "/attendance",
    icon: ClipboardCheck,
    label: "Attendance",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { isAdmin } = useEnhancedAuth();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-white/85 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl",
        "shadow-[0_-0.5px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_-0.5px_0_0_rgba(255,255,255,0.08)]",
        "pb-[env(safe-area-inset-bottom,0px)]"
      )}
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around h-[56px] px-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(item.href + "/"));
          const Icon = item.icon;
          const badge = item.showBadge ? unreadCount : 0;
          const displayLabel =
            item.label === "Roster" && isAdmin ? "Meeting" : item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 relative",
                "transition-all duration-200 active:scale-95",
                "min-h-[44px] min-w-[56px]"
              )}
              aria-label={displayLabel}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Icon container with active pill */}
              <div
                className={cn(
                  "flex items-center justify-center transition-all duration-200",
                  isActive
                    ? "bg-primary/10 dark:bg-primary/20 rounded-[12px] px-3 py-1"
                    : "px-3 py-1"
                )}
              >
                {/* Tight wrapper for badge positioning — relative to icon only */}
                <div className="relative inline-flex">
                  <Icon
                    className={cn(
                      "transition-all duration-200",
                      isActive
                        ? "w-[22px] h-[22px] text-primary"
                        : "w-[22px] h-[22px] text-gray-400 dark:text-gray-500"
                    )}
                    aria-hidden="true"
                  />
                  {badge > 0 && (
                    <span
                      className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[16px] h-[16px] px-[3px] text-[9px] font-bold text-white bg-red-500 rounded-full"
                      aria-label={`${badge} unread`}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200 leading-none",
                  isActive
                    ? "text-primary"
                    : "text-gray-400 dark:text-gray-500"
                )}
              >
                {displayLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
