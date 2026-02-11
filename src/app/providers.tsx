"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth.context";
import { NotificationProvider } from "@/contexts/notification.context";
import { ModalProvider } from "@/contexts/modal-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <NotificationProvider>
        <EnhancedAuthProvider>
          <ModalProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ModalProvider>
        </EnhancedAuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}