import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP_PORT = 3001;
const BASE_URL = `http://localhost:${APP_PORT}`;
const SCREENSHOT_DIR = path.resolve("public/design-prototype");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let serverProcess = null;
let createdTemplateId = null;
let testSessionId = null;

async function startServer() {
  console.log(`[1/6] Launching Next.js server on port ${APP_PORT}...`);
  serverProcess = spawn("cmd.exe", ["/c", "npx", "next", "start", "-p", String(APP_PORT)], {
    cwd: path.resolve("."),
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      ALLOW_PROTOTYPE_BYPASS: "true"
    },
    stdio: "pipe"
  });

  serverProcess.stderr.on("data", (data) => {
    const msg = data.toString();
    if (!msg.includes("ExperimentalWarning")) {
      console.error(`[Server stderr] ${msg.trim()}`);
    }
  });

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE_URL}/templates`);
      if (res.ok || res.status === 200 || res.status === 307 || res.status === 302) {
        console.log("   ✅ Next.js server is up and accepting connections!");
        return;
      }
    } catch {}
    await sleep(400);
  }
  throw new Error("Timeout waiting for Next.js server on port " + APP_PORT);
}

async function run() {
  let browser = null;
  const assertions = [];

  function recordAssert(ok, name, details) {
    if (ok) {
      console.log(`   ✅ [PASS] ${name}`);
      assertions.push({ name, pass: true });
    } else {
      console.error(`   ❌ [FAIL] ${name}`, details || "");
      assertions.push({ name, pass: false, details });
    }
  }

  try {
    // 1. Start Server
    await startServer();

    // 2. Create Auth Session for Admin in DB
    console.log("[2/6] Setting up authenticated session for Admin...");
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin) throw new Error("No ADMIN user found in database");

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const session = await prisma.session.create({
      data: {
        userId: admin.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
      }
    });
    testSessionId = session.id;
    console.log(`   Session created for ${admin.email} (token hash: ${tokenHash.slice(0, 10)}...)`);

    // 3. Launch Edge with Playwright
    console.log("[3/6] Launching Microsoft Edge via Playwright...");
    browser = await chromium.launch({
      executablePath: EDGE_PATH,
      headless: true
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 }
    });

    await context.addCookies([
      {
        name: "gx_session",
        value: rawToken,
        domain: "localhost",
        path: "/"
      }
    ]);

    const page = await context.newPage();

    // 4. Navigate to Templates page
    console.log("[4/6] Navigating to /templates...");
    await page.goto(`${BASE_URL}/templates`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const titleText = await page.textContent("h1");
    recordAssert(Boolean(titleText && titleText.includes("Templates")), "Templates page loaded with correct header");

    // Click "Create Template +"
    const createBtn = page.locator("button:has-text('Create Template +')");
    await createBtn.first().click();
    await page.waitForTimeout(600);

    // Verify modal opened
    const modalVisible = await page.isVisible("text=Template Title (English) *");
    recordAssert(modalVisible, "Template Creation modal opened");

    const testTemplateTitle = `P3 E2E Template ${Date.now()}`;
    await page.fill('input[placeholder="e.g. Upper Body Strength"]', testTemplateTitle);
    await page.fill('textarea[placeholder*="Warmup protocol"]', "Automated Playwright Phase 3 Verification");

    // Configure Block 1 as CIRCUIT
    console.log("   Configuring Block 1 as CIRCUIT...");
    // The first block select has options SINGLE, SUPERSET, CIRCUIT, SEQUENCE
    const block1TypeSelect = page.locator("select").filter({ hasText: "Single Exercise" }).first();
    await block1TypeSelect.selectOption("CIRCUIT");
    await page.waitForTimeout(300);

    // Set Circuit Title, Rounds: 4, Rest: 120
    const block1 = page.locator("div.p-3\\.5.rounded-2xl").first();
    const block1TitleInput = block1.locator('input[placeholder="Block Title (optional)..."]');
    await block1TitleInput.fill("Core Circuit Round");

    // Rounds input inside block 1
    const block1RoundsInput = block1.locator('input[type="number"][min="1"][max="20"]');
    await block1RoundsInput.fill("4");

    // Rest input inside block 1
    const block1RestInput = block1.locator('input[type="number"][placeholder="sec"]');
    await block1RestInput.fill("120");

    // In Block 1: Add EXERCISE, then REST, then NOTE
    // 1. Add Exercise:
    const addExerciseBtn = block1.locator('button:has-text("Add Selected Exercise")');
    await addExerciseBtn.click();
    await page.waitForTimeout(300);

    // 2. Add Rest:
    const addRestBtn = block1.locator('button:has-text("+ Rest (60s)")');
    await addRestBtn.click();
    await page.waitForTimeout(300);

    // 3. Add Note:
    const addNoteBtn = block1.locator('button:has-text("+ Note")');
    await addNoteBtn.click();
    await page.waitForTimeout(300);

    // Edit the note instruction text
    const noteInput = block1.locator('input[value*="Coaching cue"]');
    if (await noteInput.isVisible()) {
      await noteInput.fill("Maintain strict breathing tempo");
    }

    // Now Add Block 2: SUPERSET
    console.log("   Adding Block 2 as SUPERSET...");
    const addSupersetBtn = page.locator('button:has-text("+ Superset")');
    await addSupersetBtn.click();
    await page.waitForTimeout(400);

    const block2 = page.locator("div.p-3\\.5.rounded-2xl").nth(1);
    const block2TitleInput = block2.locator('input[placeholder="Block Title (optional)..."]');
    await block2TitleInput.fill("Upper Superset Blast");

    const block2RoundsInput = block2.locator('input[type="number"][min="1"][max="20"]');
    await block2RoundsInput.fill("3");

    const block2RestInput = block2.locator('input[type="number"][placeholder="sec"]');
    await block2RestInput.fill("90");

    // Add 2 Exercises to Block 2
    // Select second exercise from picker
    const exercisePickerSelect = page.locator("select").filter({ hasText: "Select Exercise" }).or(
      page.locator("label:has-text('Select Exercise') + select, label:has-text('Select Exercise') ~ div select")
    );

    // The picker select is line 1560:
    const pickerSelect = page.locator("div.space-y-3 select").nth(1);
    const pickerOptions = await pickerSelect.locator("option").all();
    if (pickerOptions.length > 1) {
      const val1 = await pickerOptions[0].getAttribute("value");
      const val2 = await pickerOptions[1].getAttribute("value");

      await pickerSelect.selectOption(val1);
      const addEx2Btn = block2.locator('button:has-text("Add Selected Exercise")');
      await addEx2Btn.click();
      await page.waitForTimeout(300);

      await pickerSelect.selectOption(val2);
      await addEx2Btn.click();
      await page.waitForTimeout(300);
    }

    // Take screenshot of modal builder
    const screenshotPath = path.join(SCREENSHOT_DIR, "phase3-template-editor.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`   📸 Screenshot saved: ${screenshotPath}`);
    recordAssert(fs.existsSync(screenshotPath), "Screenshot captured for phase3-template-editor.png");

    // Listen to page console and requests
    page.on("console", (msg) => console.log(`   [Browser Console] ${msg.text()}`));
    page.on("request", (req) => console.log(`   [Request] ${req.method()} ${req.url()}`));
    page.on("requestfailed", (req) => console.log(`   [Request Failed] ${req.url()} - ${req.failure()?.errorText}`));

    // Intercept template creation API response
    const savePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/templates"),
      { timeout: 15000 }
    );

    const saveBtn = page.locator('button[type="submit"]');
    await saveBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await saveBtn.click({ force: true });

    const saveResp = await savePromise;
    const saveJson = await saveResp.json();
    recordAssert(saveResp.status() === 201, "Template created successfully (HTTP 201)", saveJson);

    createdTemplateId = saveJson?.data?.id;
    console.log(`   Created Template ID: ${createdTemplateId}`);

    // Wait for modal to close and list to refresh
    await page.waitForTimeout(1500);

    // 5. Reload page and inspect reloaded state
    console.log("[5/6] Reloading /templates to verify persistence...");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Find the template card
    const templateCard = page.locator(`div:has-text("${testTemplateTitle}")`).first();
    recordAssert(await templateCard.isVisible(), `Template card found in DOM after reload`);

    // Click the template card to expand its blocks and details
    await templateCard.click();
    await page.waitForTimeout(600);

    // Click Edit button on the template card to open the editor modal with reloaded state
    const editBtn = templateCard.locator('button[title*="Edit"]').first();
    await editBtn.click();
    await page.waitForTimeout(600);

    // Inspect reloaded modal fields
    const reloadedModalVisible = await page.isVisible("text=Edit Template & Exercises");
    recordAssert(reloadedModalVisible, "Edit modal opened with reloaded data");

    // Assert Block 1 (CIRCUIT)
    const reloadedBlocks = page.locator("div.p-3\\.5.rounded-2xl");
    const blockCount = await reloadedBlocks.count();
    recordAssert(blockCount === 2, `Persisted exactly 2 blocks (Found: ${blockCount})`);

    const reloadedB1 = reloadedBlocks.nth(0);
    const b1Type = await reloadedB1.locator("select").first().inputValue();
    recordAssert(b1Type === "CIRCUIT", `Block 1 type persisted as CIRCUIT (Actual: ${b1Type})`);

    const b1Rounds = await reloadedB1.locator('input[type="number"][min="1"][max="20"]').inputValue();
    recordAssert(b1Rounds === "4", `Block 1 rounds persisted as 4 (Actual: ${b1Rounds})`);

    const b1Rest = await reloadedB1.locator('input[type="number"][placeholder="sec"]').inputValue();
    recordAssert(b1Rest === "120", `Block 1 rest persisted as 120s (Actual: ${b1Rest})`);

    // Check items in Block 1: 3 items (EXERCISE, REST, NOTE)
    const b1Items = reloadedB1.locator("div.p-2\\.5.rounded-xl");
    const b1ItemCount = await b1Items.count();
    recordAssert(b1ItemCount === 3, `Block 1 contains 3 items (Actual: ${b1ItemCount})`);

    const b1Item1Text = await b1Items.nth(0).innerText();
    recordAssert(b1Item1Text.includes("#1") && !b1Item1Text.includes("Rest:") && !b1Item1Text.includes("Coaching cue"), "Block 1 Item 1 is EXERCISE");

    const b1Item2Text = await b1Items.nth(1).innerText();
    recordAssert(b1Item2Text.includes("Rest: 60s"), "Block 1 Item 2 is REST (60s)");

    const b1Item3Text = await b1Items.nth(2).innerText();
    recordAssert(b1Item3Text.includes("Maintain strict breathing") || b1Item3Text.includes("Coaching cue"), "Block 1 Item 3 is NOTE");

    // Assert Block 2 (SUPERSET)
    const reloadedB2 = reloadedBlocks.nth(1);
    const b2Type = await reloadedB2.locator("select").first().inputValue();
    recordAssert(b2Type === "SUPERSET", `Block 2 type persisted as SUPERSET (Actual: ${b2Type})`);

    const b2Rounds = await reloadedB2.locator('input[type="number"][min="1"][max="20"]').inputValue();
    recordAssert(b2Rounds === "3", `Block 2 rounds persisted as 3 (Actual: ${b2Rounds})`);

    const b2Rest = await reloadedB2.locator('input[type="number"][placeholder="sec"]').inputValue();
    recordAssert(b2Rest === "90", `Block 2 rest persisted as 90s (Actual: ${b2Rest})`);

    const b2Items = reloadedB2.locator("div.p-2\\.5.rounded-xl");
    const b2ItemCount = await b2Items.count();
    recordAssert(b2ItemCount === 2, `Block 2 contains 2 exercises (Actual: ${b2ItemCount})`);

    // Capture reload screenshot
    const reloadScreenshotPath = path.join(SCREENSHOT_DIR, "phase3-template-reloaded.png");
    await page.screenshot({ path: reloadScreenshotPath, fullPage: true });
    console.log(`   📸 Reload screenshot saved: ${reloadScreenshotPath}`);

  } catch (err) {
    console.error("Test execution failed:", err);
    recordAssert(false, "Playwright test suite crashed", err.message);
  } finally {
    console.log("\n[6/6] Clean Teardown...");
    if (browser) {
      await browser.close().catch(() => {});
      console.log("   Browser closed cleanly.");
    }

    if (testSessionId) {
      await prisma.session.delete({ where: { id: testSessionId } }).catch(() => {});
      console.log("   Temporary session deleted.");
    }

    if (createdTemplateId) {
      // Clean up blocks, items, template exercises, and template
      await prisma.blockItem.deleteMany({
        where: { block: { templateId: createdTemplateId } }
      }).catch(() => {});
      await prisma.workoutBlock.deleteMany({
        where: { templateId: createdTemplateId }
      }).catch(() => {});
      await prisma.workoutTemplateExercise.deleteMany({
        where: { workoutTemplateId: createdTemplateId }
      }).catch(() => {});
      await prisma.workoutTemplate.delete({
        where: { id: createdTemplateId }
      }).catch(() => {});
      // Also delete the AuditLog row for this template creation
      await prisma.auditLog.deleteMany({
        where: { entityType: "WorkoutTemplate", entityId: createdTemplateId }
      }).catch(() => {});
      console.log(`   Throwaway template ${createdTemplateId} cleaned up completely.`);
    }

    if (serverProcess) {
      console.log("   Terminating Next.js child process cleanly...");
      serverProcess.kill("SIGTERM");
      await sleep(1000);
      try {
        serverProcess.kill("SIGKILL");
      } catch {}
    }

    await prisma.$disconnect();

    const passCount = assertions.filter((a) => a.pass).length;
    console.log("================================================================================");
    console.log(`=== PLAYWRIGHT SUMMARY: ${passCount}/${assertions.length} Assertions Passed ===`);
    console.log("================================================================================");
  }
}

run();
