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
      <body>
        <Providers>
          {/* Skip to main content link for keyboard navigation - Requirement 7.4 */}
          <a href="#main-content" className="skip-to-main">
            Skip to main content
          </a>

          <NextTopLoader color="#5750F1" showSpinner={false} />

          <div className="flex min-h-screen">
            <Sidebar />

            <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
              <Header />

              <main 
                id="main-content"
                className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10"
                role="main"
                aria-label="Main content"
              >
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
