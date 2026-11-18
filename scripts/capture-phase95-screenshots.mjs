import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { SessionService } from "../src/lib/auth/session-service.js";

const prisma = new PrismaClient();
const sessionService = new SessionService();
const OUTPUT_DIR = path.resolve("public/phase95-evidence");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  console.log("Setting up session for screenshot capture...");

  // 1. Get Admin user
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" }
  });
  if (!admin) throw new Error("No admin user found");

  const session = await sessionService.createSession({ userId: admin.id });
  const token = session.sessionToken;

  // 2. Get client profile
  const client = await prisma.clientProfile.findFirst({
    include: { user: true }
  });
  if (!client) throw new Error("No client profile found");

  // 3. Get completed workout assignment
  const assignment = await prisma.clientWorkoutAssignment.findFirst({
    where: { status: "COMPLETED" }
  });

  console.log(`Using Admin (${admin.email}), Client (${client.id}), Assignment (${assignment?.id})`);

  // Target screenshots
  const targets = [
    {
      name: "athlete-profile-goals-tab.png",
      url: `http://localhost:3000/clients/${client.id}?tab=goals`,
      clickTab: "goals"
    },
    {
      name: "athlete-profile-workouts-tab.png",
      url: `http://localhost:3000/clients/${client.id}?tab=workouts`,
      clickTab: "workouts"
    },
    {
      name: "athlete-profile-notes-tab.png",
      url: `http://localhost:3000/clients/${client.id}?tab=notes`,
      clickTab: "notes"
    }
  ];

  if (assignment) {
    targets.push({
      name: "workout-execution-completed-review.png",
      url: `http://localhost:3000/workout/${assignment.id}/execute`,
      clickTab: null
    });
  }

  // Launch Chrome
  const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new",
    "--remote-debugging-port=9333",
    "--window-size=1440,900",
    "about:blank"
  ]);

  await sleep(1500);

  try {
    const res = await fetch("http://127.0.0.1:9333/json");
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page") || tabs[0];
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    let msgId = 1;
    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener("message", handler);
            resolve(data.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    await send("Page.enable");
    await send("Network.enable");

    // Set cookie
    await send("Network.setCookie", {
      name: "gx_session",
      value: token,
      domain: "localhost",
      path: "/"
    });

    for (const target of targets) {
      console.log(`Capturing ${target.name} from ${target.url}...`);
      await send("Page.navigate", { url: target.url });
      await sleep(2500);

      // If we need to click a specific tab button on the client page:
      if (target.clickTab) {
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const tabButtons = Array.from(document.querySelectorAll('button'));
              const targetBtn = tabButtons.find(b => b.textContent && b.textContent.toLowerCase().includes('${target.clickTab}'));
              if (targetBtn) targetBtn.click();
            })()
          `
        });
        await sleep(1000);
      }

      const screenshotResult = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false
      });

      const buffer = Buffer.from(screenshotResult.data, "base64");
      const outPath = path.join(OUTPUT_DIR, target.name);
      fs.writeFileSync(outPath, buffer);
      console.log(`✓ Saved ${outPath} (${buffer.length} bytes)`);
    }

    ws.close();
  } finally {
    chrome.kill();
    // Clean up temporary session
    await prisma.session.deleteMany({ where: { userId: admin.id } });
    await prisma.$disconnect();
    console.log("Capture completed and temporary sessions cleaned up.");
  }
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
