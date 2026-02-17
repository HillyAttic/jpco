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
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    template: "%s | JPCO - Next.js Dashboard Kit",
    default: "JPCO - Next.js Dashboard Kit",
  },
  description:
    "JPCO admin dashboard toolkit with 200+ templates, UI components, and integrations for fast dashboard development.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JPCO Dashboard",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5750F1" },
    { media: "(prefers-color-scheme: dark)", color: "#020d1a" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        
        {/* Inline critical CSS for above-the-fold content */}
        <style dangerouslySetInnerHTML={{
          __html: `
            body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
            .loading-skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: loading 1.5s ease-in-out infinite; }
            @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          `
        }} />
      </head>
      <body className="font-sans antialiased">
        {/* Preload critical resources */}
        <Script
          id="preload-firebase"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                  const link = document.createElement('link');
                  link.rel = 'preload';
                  link.as = 'script';
                  link.href = '/_next/static/chunks/firebase.js';
                  document.head.appendChild(link);
                }, { timeout: 2000 });
              }
            `
          }}
        />
        
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
