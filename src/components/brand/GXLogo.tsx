"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

interface GXLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSignature?: boolean;
  forceTheme?: "dark" | "light";
  priority?: boolean;
}

export default function GXLogo({
  className = "",
  size = "md",
  showSignature = true,
  forceTheme,
  priority = false
}: GXLogoProps) {
  const { theme: currentTheme } = useTheme();
  const theme = forceTheme || currentTheme || "dark";

  // Dimensions based on size preset
  const dimensions = {
    sm: { width: 110, height: 42, imgHeight: "h-9" },
    md: { width: 140, height: 54, imgHeight: "h-11 sm:h-12" },
    lg: { width: 180, height: 72, imgHeight: "h-14 sm:h-16" },
    xl: { width: 220, height: 88, imgHeight: "h-20 sm:h-24" }
  }[size];

  const logoSrc = theme === "dark" ? "/brand/gx-logo-dark.svg" : "/brand/gx-logo-light.svg";

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={logoSrc}
        alt="GX Fitness Academy"
        className={`${dimensions.imgHeight} w-auto object-contain transition-opacity duration-200`}
        loading={priority ? "eager" : "lazy"}
      />
    </div>
  );
}
