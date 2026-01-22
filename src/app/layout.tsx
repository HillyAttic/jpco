import "@/css/satoshi.css";
import "@/css/style.css";
import "@/css/mobile-responsive.css";

import { Sidebar } from "@/components/Layouts/sidebar";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import { Header } from "@/components/Layouts/header";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";
import { ServiceWorkerProvider } from "./service-worker-provider";
import { AuthWrapper } from "@/components/Auth/AuthWrapper";

export const metadata: Metadata = {
  title: {
    template: "%s | JPCO - Next.js Dashboard Kit",
    default: "JPCO - Next.js Dashboard Kit",
  },
  description:
    "JPCO admin dashboard toolkit with 200+ templates, UI components, and integrations for fast dashboard development.",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#5750F1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <ServiceWorkerProvider>
            {/* Skip to main content link for keyboard navigation */}
            <a 
              href="#main-content" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[9999] bg-primary text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Skip to main content
            </a>

            <NextTopLoader color="#5750F1" showSpinner={false} />

            <AuthWrapper>
              {children}
            </AuthWrapper>
          </ServiceWorkerProvider>
        </Providers>
      </body>
    </html>
  );
}
