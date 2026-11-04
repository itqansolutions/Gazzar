"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";

export interface LogoProps {
  variant?: "auto" | "dark" | "light";
  height?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({
  variant = "auto",
  height = 48,
  className = "",
  priority = false
}: LogoProps) {
  const { theme } = useTheme();

  const effectiveVariant =
    variant === "auto" ? (theme === "light" ? "light" : "dark") : variant;

  const src =
    effectiveVariant === "light"
      ? "/brand/gx-logo-light.svg"
      : "/brand/gx-logo-dark.svg";

  // Aspect ratio is 518:445 ≈ 1.164
  const width = Math.round(height * 1.164);

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={src}
        alt="GX Fitness Academy"
        width={width}
        height={height}
        className="w-auto object-contain transition-opacity duration-200"
        style={{ height: `${height}px` }}
        loading={priority ? "eager" : "lazy"}
      />
    </div>
  );
}

export interface MarkProps {
  variant?: "auto" | "dark" | "light";
  size?: number;
  className?: string;
}

export function Mark({
  variant = "auto",
  size = 32,
  className = ""
}: MarkProps) {
  const { theme } = useTheme();

  const effectiveVariant =
    variant === "auto" ? (theme === "light" ? "light" : "dark") : variant;

  const src =
    effectiveVariant === "light"
      ? "/brand/gx-mark-light.svg"
      : "/brand/gx-mark.svg";

  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src={src}
        alt="GX Mark"
        width={size}
        height={size}
        className="object-contain"
        style={{ height: `${size}px`, width: `${size}px` }}
      />
    </div>
  );
}

export default Logo;
