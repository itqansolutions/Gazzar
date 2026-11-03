#!/usr/bin/env node

/**
 * GX Academy - One-Time First Admin Provisioning CLI
 *
 * This script securely provisions the initial ADMIN account for the academy.
 *
 * Security Guarantees:
 * 1. Requires explicit password provided at execution time (via env or masked CLI prompt).
 * 2. Password is never logged, stored in plain text, or written to files.
 * 3. Refuses to run if any ADMIN account already exists.
 * 4. Protected against concurrent duplicate execution via PostgreSQL advisory lock and atomic transaction.
 * 5. Uses cost-10 bcrypt hashing matching production auth service.
 *
 * Usage:
 * Non-Interactive (e.g., Railway CLI):
 *   ADMIN_EMAIL="admin@gxacademy.com" ADMIN_NAME="Abdullah" ADMIN_PASSWORD="SecurePassword123!" npx tsx scripts/provision-admin.ts
 *
 * Interactive (Terminal TTY):
 *   npx tsx scripts/provision-admin.ts
 */

import readline from "node:readline";
import { adminProvisioningService } from "../src/lib/auth/admin-provisioning";
import prisma from "../src/lib/prisma";

async function promptInput(rl: readline.Interface, query: string, isPassword = false): Promise<string> {
  return new Promise((resolve) => {
    if (!isPassword) {
      rl.question(query, (answer) => resolve(answer.trim()));
      return;
    }

    // Mask password in terminal
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(query);

    let password = "";
    const onData = (char: Buffer) => {
      const str = char.toString("utf8");

      // Handle Enter / Newline
      if (str === "\n" || str === "\r" || str === "\u0004") {
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(password.trim());
        return;
      }

      // Handle Backspace
      if (str === "\u0008" || str === "\u007f") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }

      // Handle Ctrl+C
      if (str === "\u0003") {
        stdout.write("\nOperation cancelled by user.\n");
        process.exit(1);
      }

      // Accumulate password and print mask
      password += str;
      stdout.write("*");
    };

    if (process.stdin.isTTY) {
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on("data", onData);
    } else {
      rl.question("", (answer) => resolve(answer.trim()));
    }
  });
}

async function runProvisioning() {
  console.log("=================================================");
  console.log("  GX Academy — First Admin Provisioning Service  ");
  console.log("=================================================");

  // Fast pre-flight check: Is an admin already present?
  try {
    const status = await adminProvisioningService.checkAdminStatus();
    if (status.hasAdmin) {
      console.error("\n❌ Aborting: An ADMIN account already exists in the database.");
      console.error("This provisioning tool is restricted to initial first-time setup only.\n");
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error("\n❌ Database connection failure during pre-flight check.");
    console.error(err instanceof Error ? err.message : "Unknown error");
    process.exit(1);
  }

  // Retrieve credentials from environment variables or interactive prompt
  let email = process.env.ADMIN_EMAIL?.trim() || "";
  let name = process.env.ADMIN_NAME?.trim() || "";
  let password = process.env.ADMIN_PASSWORD || "";
  let phone = process.env.ADMIN_PHONE?.trim() || "";

  const isInteractive = process.stdin.isTTY && (!email || !name || !password);

  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    try {
      console.log("\nPlease enter initial administrative credentials:\n");

      if (!email) {
        email = await promptInput(rl, "Admin Email: ");
      }
      if (!name) {
        name = await promptInput(rl, "Admin Full Name: ");
      }
      if (!phone) {
        phone = await promptInput(rl, "Admin Phone (optional, press Enter to skip): ");
      }
      if (!password) {
        password = await promptInput(rl, "Admin Password (min 12 chars, upper/lower/number/symbol): ", true);
        const confirmPassword = await promptInput(rl, "Confirm Admin Password: ", true);

        if (password !== confirmPassword) {
          console.error("\n❌ Passwords do not match. Provisioning aborted.");
          rl.close();
          process.exit(1);
        }
      }
    } finally {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode?.(false);
      }
      rl.close();
    }
  }

  if (!email || !name || !password) {
    console.error("\n❌ Missing required arguments.");
    console.error("Either run interactively in a TTY terminal, or provide environment variables:");
    console.error("  ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD, [ADMIN_PHONE]\n");
    process.exit(1);
  }

  console.log("\nValidating administrative credentials and provisioning account...");

  const result = await adminProvisioningService.provisionFirstAdmin({
    email,
    name,
    password,
    phone: phone || null
  });

  // Overwrite sensitive plaintext variable in memory
  password = "";

  if (!result.success) {
    console.error(`\n❌ Provisioning Failed [${result.reason}]: ${result.message}\n`);
    process.exit(1);
  }

  console.log("\n=================================================");
  console.log("  ✅ FIRST ADMIN ACCOUNT PROVISIONED SUCCESSFULLY");
  console.log("=================================================");
  console.log(`  User ID:    ${result.user.id}`);
  console.log(`  Email:      ${result.user.email}`);
  console.log(`  Name:       ${result.user.name}`);
  console.log(`  Role:       ${result.user.role}`);
  console.log(`  Phone:      ${result.user.phone || "(none)"}`);
  console.log(`  Created At: ${result.user.createdAt.toISOString()}`);
  console.log("=================================================");
  console.log("  You may now login at /login using this account.");
  console.log("=================================================\n");
}

runProvisioning()
  .catch((err) => {
    console.error("\n❌ Unexpected fatal error:", err instanceof Error ? err.message : "Unknown");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
