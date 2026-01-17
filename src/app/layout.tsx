import "@/css/satoshi.css";
import "@/css/style.css";

import { Sidebar } from "@/components/Layouts/sidebar";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import { Header } from "@/components/Layouts/header";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";
import { ServiceWorkerProvider } from "./service-worker-provider";

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

            <div className="flex min-h-screen bg-gray-2 dark:bg-[#020d1a]">
              <Sidebar />

              <div className="flex-1 flex flex-col min-w-0">
                <Header />

                <main 
                  id="main-content"
                  className="flex-1 isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10"
                  role="main"
                  aria-label="Main content"
                >
                  {children}
                </main>
              </div>
            </div>
          </ServiceWorkerProvider>
        </Providers>
      </body>
    </html>
  );
}
