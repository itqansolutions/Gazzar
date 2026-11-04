import type { Metadata, Viewport } from "next";
import "./globals.css";
import { inter, barlow, montserrat, caveat } from "./fonts";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "GX Academy",
  description: "GX Academy - Professional Athletic Coaching Platform"
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
    <html
      lang="en"
      dir="ltr"
      className={`dark ${inter.variable} ${barlow.variable} ${montserrat.variable} ${caveat.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-screen bg-background text-foreground transition-colors duration-200">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}