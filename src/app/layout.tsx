import type { Metadata, Viewport } from "next";
import "./globals.css";
import { inter, barlow, montserrat, caveat } from "./fonts";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://gxfitness.academy"),
  title: {
    default: "GX Fitness Academy — Train Hard. Live Strong.",
    template: "%s | GX Fitness Academy"
  },
  description:
    "Premier sports, strength, and fitness academy in Egypt. Master coaches, comprehensive periodization, and championship-tier athletic conditioning.",
  keywords: [
    "GX Fitness Academy",
    "Cross-Training",
    "Strength Coaching",
    "Gym Cairo",
    "Personal Training Egypt",
    "Powerlifting",
    "Athletic Conditioning"
  ],
  openGraph: {
    title: "GX Fitness Academy — Train Hard. Live Strong.",
    description:
      "Premier sports, strength, and fitness academy in Egypt. Master coaches, comprehensive periodization, and championship-tier athletic conditioning.",
    url: "https://gxfitness.academy",
    siteName: "GX Fitness Academy",
    images: [
      {
        url: "/coach_dark_hero.jpg",
        width: 1200,
        height: 630,
        alt: "GX Fitness Academy Arena"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "GX Fitness Academy — Train Hard. Live Strong.",
    description:
      "Premier sports, strength, and fitness academy in Egypt. Master coaches, comprehensive periodization, and championship-tier athletic conditioning.",
    images: ["/coach_dark_hero.jpg"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
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