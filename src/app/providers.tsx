"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth.context";
import { NotificationProvider } from "@/contexts/notification.context";
import { ModalProvider } from "@/contexts/modal-context";
import { AuthProvider } from "@/contexts/auth.context";
import { NotificationPermissionPrompt } from "@/components/pwa/notification-permission-prompt";
import { IOSPWAPrompt } from "@/components/pwa/ios-pwa-prompt";
import { NotificationClickHandler } from "@/components/pwa/notification-click-handler";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <NotificationProvider>
        <AuthProvider>
          <EnhancedAuthProvider>
            <ModalProvider>
              <SidebarProvider>{children}</SidebarProvider>
              <NotificationPermissionPrompt />
              <IOSPWAPrompt />
              <NotificationClickHandler />
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
              />
            </ModalProvider>
          </EnhancedAuthProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}