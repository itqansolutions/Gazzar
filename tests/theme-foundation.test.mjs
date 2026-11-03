import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Phase 2.1 – Theme Foundation & Design System Verification Suite
 *
 * Verifies that the GX Fitness Academy design tokens adhere strictly to the
 * approved visual reference (Crimson Red + Carbon Black/Onyx + White),
 * that Dark Mode and Light Mode are truly functional, persistent in localStorage,
 * and that UI layouts react to the theme classes without emerald/amber discrepancies.
 */

const projectRoot = path.resolve(process.cwd());

test("Phase 2.1 – Theme Foundation & Design System Suite", async (t) => {
  // 1. Tailwind Config Verification
  await t.test("1. Tailwind Config: Primary palette is Athletic Crimson Red and dark mode is class-based", () => {
    const tailwindPath = path.join(projectRoot, "tailwind.config.ts");
    assert.ok(fs.existsSync(tailwindPath), "tailwind.config.ts must exist");
    const content = fs.readFileSync(tailwindPath, "utf-8");

    // Must be class-based dark mode
    assert.match(content, /darkMode:\s*["']class["']/, "Dark mode must be class-based");

    // Primary 600 must be Crimson Red #e11d48
    assert.match(content, /600:\s*["']#e11d48["']/, "Primary 600 must be approved Crimson Red #e11d48");

    // Must contain GX brand extension tokens
    assert.match(content, /gx:\s*{/, "Must define gx brand tokens");
    assert.match(content, /red:\s*["']#e11d48["']/, "Must define gx.red");
    assert.match(content, /dark:\s*["']#090a0f["']/, "Must define gx.dark as carbon onyx #090a0f");
    assert.match(content, /surface:\s*["']#121620["']/, "Must define gx.surface as dark navy graphite #121620");

    // Zero green emerald primary
    assert.doesNotMatch(content, /primary:\s*{[^}]*22c55e/, "Primary palette must NOT be emerald green");
  });

  // 2. CSS Variables in globals.css
  await t.test("2. globals.css: Root, light, and dark CSS variables match design reference", () => {
    const globalsPath = path.join(projectRoot, "src/app/globals.css");
    assert.ok(fs.existsSync(globalsPath), "globals.css must exist");
    const content = fs.readFileSync(globalsPath, "utf-8");

    // html.dark must have true dark values, not #f8fafc
    assert.match(content, /html\.dark\s*{[^}]*--background:\s*#090a0f/, "Dark background must be #090a0f");
    assert.match(content, /html\.dark\s*{[^}]*--card:\s*#121620/, "Dark card must be #121620");
    assert.match(content, /html\.dark\s*{[^}]*--border:\s*#1f2937/, "Dark border must be #1f2937");
    assert.match(content, /html\.dark\s*{[^}]*--primary:\s*#e11d48/, "Dark primary must be #e11d48");

    // Light mode values
    assert.match(content, /:root\s*{[^}]*--background:\s*#f1f5f9/, "Light background must be #f1f5f9");
    assert.match(content, /:root\s*{[^}]*--card:\s*#ffffff/, "Light card must be #ffffff");
    assert.match(content, /:root\s*{[^}]*--primary:\s*#e11d48/, "Light primary must be #e11d48");

    // Scrollbar hover must use red
    assert.match(content, /\.custom-scrollbar::-webkit-scrollbar-thumb:hover\s*{[^}]*rgba\(225,\s*29,\s*72/, "Scrollbar thumb hover must be crimson red");
  });

  // 3. ThemeContext Implementation
  await t.test("3. ThemeContext: Supports Dark and Light, localStorage persistence, and system preference detection", () => {
    const themeContextPath = path.join(projectRoot, "src/context/ThemeContext.tsx");
    assert.ok(fs.existsSync(themeContextPath), "ThemeContext.tsx must exist");
    const content = fs.readFileSync(themeContextPath, "utf-8");

    // Must have real toggleTheme and not a no-op
    assert.doesNotMatch(content, /No-op:\s*dark mode disabled/, "Dark mode must not be disabled as no-op");
    assert.match(content, /const nextTheme = theme === "dark" \? "light" : "dark"/, "Must toggle between dark and light");

    // Must check localStorage and system preference
    assert.match(content, /localStorage\.getItem\(["']gx_theme["']\)/, "Must read gx_theme from localStorage");
    assert.match(content, /localStorage\.setItem\(["']gx_theme["'],\s*t\)/, "Must persist gx_theme in localStorage");
    assert.match(content, /prefers-color-scheme:\s*dark/, "Must check system prefers-color-scheme");

    // Must manipulate documentElement classes
    assert.match(content, /root\.classList\.add\(["']dark["']\)/, "Must add dark class when theme is dark");
    assert.match(content, /root\.classList\.add\(["']light["']\)/, "Must add light class when theme is light");
  });

  // 4. Navbar Theme Switcher & Brand Styling
  await t.test("4. Navbar: Renders interactive Theme Switcher with Sun/Moon icons and Crimson Red branding", () => {
    const navbarPath = path.join(projectRoot, "src/components/layout/Navbar.tsx");
    assert.ok(fs.existsSync(navbarPath), "Navbar.tsx must exist");
    const content = fs.readFileSync(navbarPath, "utf-8");

    // Must import and render Sun and Moon icons
    assert.match(content, /<Sun\s+className=/, "Must render Sun icon for dark theme");
    assert.match(content, /<Moon\s+className=/, "Must render Moon icon for light theme");
    assert.match(content, /onClick={toggleTheme}/, "Must call toggleTheme on click");

    // Brand accent must be red gradient
    assert.match(content, /from-red-600 via-rose-600 to-red-500/, "Brand logo must use Crimson Red gradient");
    assert.doesNotMatch(content, /from-emerald-500 via-emerald-600 to-teal-400/, "Brand logo must NOT use emerald gradient");
  });

  // 5. Sidebar & BottomNav Dark/Light Styling
  await t.test("5. Navigation Shells: Sidebar and BottomNav adapt to dark surfaces and use Crimson Red active indicators", () => {
    const sidebarPath = path.join(projectRoot, "src/components/layout/Sidebar.tsx");
    const bottomNavPath = path.join(projectRoot, "src/components/layout/BottomNav.tsx");
    assert.ok(fs.existsSync(sidebarPath), "Sidebar.tsx must exist");
    assert.ok(fs.existsSync(bottomNavPath), "BottomNav.tsx must exist");

    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
    const bottomNavContent = fs.readFileSync(bottomNavPath, "utf-8");

    // Sidebar dark surfaces and red active state
    assert.match(sidebarContent, /dark:bg-\[#121620\]/, "Sidebar must use dark surface #121620");
    assert.match(sidebarContent, /bg-red-600\s+text-white/, "Active sidebar items must use bg-red-600");
    assert.doesNotMatch(sidebarContent, /bg-emerald-600\s+text-white/, "Active sidebar items must NOT use emerald");

    // BottomNav dark surfaces and red active/highlight state
    assert.match(bottomNavContent, /dark:bg-\[#121620\]\/95/, "BottomNav must use dark surface #121620");
    assert.match(bottomNavContent, /text-red-600\s+dark:text-red-500/, "Active bottom nav items must use red text");
    assert.match(bottomNavContent, /from-red-600\s+to-rose-600/, "Highlighted bottom nav item must use red gradient");
  });

  // 6. Root Layout suppressHydrationWarning
  await t.test("6. Root Layout: suppressHydrationWarning is configured to allow dynamic theme hydration", () => {
    const layoutPath = path.join(projectRoot, "src/app/layout.tsx");
    assert.ok(fs.existsSync(layoutPath), "layout.tsx must exist");
    const content = fs.readFileSync(layoutPath, "utf-8");

    assert.match(content, /suppressHydrationWarning/, "<html> element must have suppressHydrationWarning");
    assert.match(content, /bg-background\s+text-foreground/, "<body> must use CSS variable theme tokens");
  });
});
