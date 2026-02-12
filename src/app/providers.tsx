"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth.context";
import { NotificationProvider } from "@/contexts/notification.context";
import { ModalProvider } from "@/contexts/modal-context";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <NotificationProvider>
        <EnhancedAuthProvider>
          <ModalProvider>
            <SidebarProvider>{children}</SidebarProvider>
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
      </NotificationProvider>
    </ThemeProvider>
  );
}