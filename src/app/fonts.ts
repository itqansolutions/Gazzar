import { Inter, Barlow_Condensed, Montserrat, Caveat } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap"
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-brand",
  display: "swap"
});

export const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-script",
  display: "swap"
});
