import type { Metadata } from "next";
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CollaborationProvider } from '@/lib/contexts/CollaborationContext';
import "./globals.css";

export const metadata: Metadata = {
  title: "KeyMap - Open Atlas Mapping Platform",
  description: "Indoor and outdoor mapping platform with OpenStreetMap integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          <CollaborationProvider>
            {children}
          </CollaborationProvider>
        </ErrorBoundary>
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          expand={false}
        />
      </body>
    </html>
  );
}
