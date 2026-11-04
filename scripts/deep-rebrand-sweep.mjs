import fs from "fs";
import path from "path";

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      // Don't touch tests or theme-foundation
      if (fullPath.includes("theme-foundation") || fullPath.includes("tests")) continue;

      let content = fs.readFileSync(fullPath, "utf8");
      let original = content;

      // Clean leftover emerald / teal combinations
      content = content.replace(/hover:from-emerald-\d+/g, "hover:bg-[#FF2D3B]");
      content = content.replace(/hover:to-teal-\d+/g, "");
      content = content.replace(/bg-gradient-to-r from-emerald-\d+ to-teal-\d+/g, "bg-brand-crimson");
      content = content.replace(/bg-gradient-to-tr from-emerald-\d+ to-teal-\d+/g, "bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30");
      content = content.replace(/from-emerald-500 to-teal-400/g, "from-brand-crimson to-red-600");
      content = content.replace(/accent-emerald-\d+/g, "accent-[#F01425]");

      content = content.replace(/shadow-emerald-\d+\/\d+/g, "shadow-[0_0_15px_rgba(240,20,37,0.35)]");
      content = content.replace(/border-emerald-500\/40/g, "border-brand-crimson/40");
      content = content.replace(/border-emerald-500\/20/g, "border-brand-crimson/25");
      content = content.replace(/border-emerald-500/g, "border-brand-crimson");
      content = content.replace(/dark:text-emerald-300/g, "dark:text-brand-crimson");
      content = content.replace(/dark:text-emerald-400/g, "dark:text-brand-crimson");
      content = content.replace(/text-emerald-300/g, "text-brand-crimson");
      content = content.replace(/bg-emerald-950\/20/g, "bg-[#141416]");

      if (content !== original) {
        fs.writeFileSync(fullPath, content, "utf8");
        console.log(`Cleaned residuals in: ${fullPath}`);
      }
    }
  }
}

processDir(path.resolve("src/app"));
processDir(path.resolve("src/components"));
console.log("Deep sweep complete!");
