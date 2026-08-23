import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "أكاديمية الجزار للتدريب الرياضي | Gazzar Coaching Academy",
  description: "نظام إدارة التدريب الرياضي المتكامل للأكاديميات والكباتن والمشتركين"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        <LanguageProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}