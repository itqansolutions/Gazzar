import fs from "fs";
import path from "path";

const filesToUpdate = [
  "src/app/programs/page.tsx",
  "src/app/templates/page.tsx",
  "src/app/exercises/page.tsx",
  "src/app/nutrition/page.tsx",
  "src/app/sports/page.tsx",
  "src/app/users/page.tsx",
  "src/app/workout/[id]/execute/page.tsx",
  "src/app/assessments/page.tsx",
  "src/app/assignments/page.tsx",
  "src/app/clients/[id]/page.tsx",
  "src/app/memberships/page.tsx",
  "src/app/calendar/page.tsx",
  "src/app/attendance/page.tsx",
  "src/app/reports/page.tsx",
  "src/app/settings/page.tsx",
  "src/app/audit-logs/page.tsx",
  "src/components/clients/CoachesTab.tsx",
  "src/components/clients/GoalsTab.tsx",
  "src/components/clients/WorkoutsTab.tsx",
  "src/components/clients/MeasurementsTab.tsx",
  "src/components/clients/PhotosTab.tsx"
];

for (const relPath of filesToUpdate) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf8");

  // Replace gradients
  content = content.replace(/bg-gradient-to-r from-emerald-600 to-teal-600/g, "bg-brand-crimson hover:bg-[#FF2D3B]");
  content = content.replace(/bg-gradient-to-tr from-emerald-500 to-teal-500/g, "bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30");
  content = content.replace(/bg-gradient-to-br from-emerald-600 to-teal-700/g, "bg-brand-crimson text-white");
  content = content.replace(/from-emerald-500 via-teal-500 to-emerald-600/g, "from-brand-crimson via-red-600 to-zinc-700");

  // Replace buttons & active elements
  content = content.replace(/bg-emerald-600 hover:bg-emerald-500/g, "bg-brand-crimson hover:bg-[#FF2D3B]");
  content = content.replace(/bg-emerald-500 hover:bg-emerald-600/g, "bg-brand-crimson hover:bg-[#FF2D3B]");
  content = content.replace(/hover:bg-emerald-600/g, "hover:bg-brand-crimson");
  content = content.replace(/hover:bg-emerald-500/g, "hover:bg-brand-crimson");
  content = content.replace(/hover:bg-emerald-50/g, "hover:bg-brand-crimson/10");
  content = content.replace(/hover:text-emerald-500/g, "hover:text-brand-crimson");
  content = content.replace(/hover:text-emerald-600/g, "hover:text-brand-crimson");
  content = content.replace(/hover:text-emerald-400/g, "hover:text-brand-crimson");
  content = content.replace(/hover:border-emerald-500\/50/g, "hover:border-brand-crimson/50");
  content = content.replace(/hover:border-emerald-300/g, "hover:border-brand-crimson/40");
  content = content.replace(/hover:border-emerald-200/g, "hover:border-brand-crimson/30");

  // Shadows & rings
  content = content.replace(/shadow-emerald-600\/30/g, "shadow-[0_0_20px_rgba(240,20,37,0.38)]");
  content = content.replace(/shadow-emerald-600\/20/g, "shadow-[0_0_15px_rgba(240,20,37,0.3)]");
  content = content.replace(/shadow-emerald-500\/30/g, "shadow-[0_0_20px_rgba(240,20,37,0.38)]");
  content = content.replace(/shadow-emerald-500\/20/g, "shadow-[0_0_15px_rgba(240,20,37,0.3)]");
  content = content.replace(/shadow-emerald-500\/10/g, "shadow-[0_0_12px_rgba(240,20,37,0.25)]");
  content = content.replace(/ring-emerald-500\/20/g, "ring-brand-crimson/40");

  // Focus rings and borders
  content = content.replace(/focus:border-emerald-500/g, "focus:border-brand-crimson");
  content = content.replace(/focus:ring-emerald-500/g, "focus:ring-brand-crimson");

  // Icons and highlights (excluding small semantic badges)
  content = content.replace(/text-emerald-500/g, "text-brand-crimson");
  content = content.replace(/text-emerald-600 dark:text-emerald-400/g, "text-brand-crimson");
  content = content.replace(/text-emerald-600/g, "text-brand-crimson");
  content = content.replace(/text-emerald-700/g, "text-brand-crimson");
  content = content.replace(/text-emerald-800/g, "text-white");
  content = content.replace(/text-emerald-900/g, "text-white");
  content = content.replace(/text-emerald-400/g, "text-brand-crimson");

  // Emerald backgrounds & borders
  content = content.replace(/bg-emerald-500\/10/g, "bg-brand-crimson/15");
  content = content.replace(/bg-emerald-500\/20/g, "bg-brand-crimson/20");
  content = content.replace(/border-emerald-500\/20/g, "border-brand-crimson/30");
  content = content.replace(/border-emerald-500\/30/g, "border-brand-crimson/40");
  content = content.replace(/bg-emerald-50\/40 dark:bg-emerald-950\/20/g, "bg-[#141416]");
  content = content.replace(/bg-emerald-50 dark:bg-emerald-950\/30/g, "bg-[#141416]");
  content = content.replace(/bg-emerald-50 dark:bg-emerald-950\/20/g, "bg-[#141416]");
  content = content.replace(/bg-emerald-50\/80/g, "bg-[#1C1C1F]");
  content = content.replace(/bg-emerald-50/g, "bg-[#1C1C1F]");
  content = content.replace(/dark:bg-emerald-950\/20/g, "dark:bg-[#141416]");
  content = content.replace(/dark:bg-emerald-950\/30/g, "dark:bg-[#141416]");
  content = content.replace(/border-emerald-200\/80 dark:border-emerald-800\/40/g, "border-[#26262A]");
  content = content.replace(/border-emerald-200 dark:border-emerald-800\/40/g, "border-[#26262A]");
  content = content.replace(/border-emerald-200/g, "border-[#26262A]");
  content = content.replace(/border-emerald-100/g, "border-[#26262A]");

  // Emerald solid badges
  content = content.replace(/bg-emerald-600/g, "bg-brand-crimson");

  fs.writeFileSync(fullPath, content, "utf8");
  console.log(`Updated: ${relPath}`);
}
console.log("Rebranding pass complete!");
