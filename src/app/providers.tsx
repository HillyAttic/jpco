"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/auth.context";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth.context";
import { NotificationProvider } from "@/contexts/notification.context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <NotificationProvider>
        <AuthProvider>
          <EnhancedAuthProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </EnhancedAuthProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}