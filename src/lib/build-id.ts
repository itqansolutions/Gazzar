import fs from "fs";
import path from "path";

/** The id Next wrote for this build (.next/BUILD_ID). Same value for pages rendered at build and for the running server. */
export function getBuildId(): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim() || "dev";
  } catch {
    return "dev";
  }
}
