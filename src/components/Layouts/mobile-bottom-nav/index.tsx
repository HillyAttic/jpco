"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, LayoutDashboard, Settings, Bell, ClipboardCheck } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";

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
    label: "Dashboard",
  },
  {
    href: "/roster/update-schedule",
    icon: Calendar,
    label: "Roster",
  },
  {
    href: "/notifications",
    icon: Bell,
    label: "Notifications",
    showBadge: true,
  },
  {
    href: "/attendance",
    icon: ClipboardCheck,
    label: "Attendance",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 dark:bg-gray-dark dark:border-gray-800 md:hidden shadow-lg"
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;
          const badge = item.showBadge ? unreadCount : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-[60px] relative",
                "transition-colors duration-200",
                "active:bg-gray-100 dark:active:bg-gray-800",
                // Touch target optimization
                "min-h-[44px]"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                  aria-hidden="true"
                />
                {badge > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full"
                    aria-label={`${badge} unread notifications`}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
