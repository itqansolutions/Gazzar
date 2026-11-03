import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const APP_URL = "http://localhost:3001/dashboard";
const OUTPUT_DIR = path.resolve("public/design-prototype");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startEdge() {
  const edgeProcess = spawn(EDGE_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + path.resolve("tmp/edge-profile-" + Date.now())
  ]);

  // Wait for Edge CDP to be ready
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        return edgeProcess;
      }
    } catch {}
    await sleep(300);
  }
  throw new Error("Could not connect to Edge DevTools Protocol");
}

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function captureScreen({ width, height, theme, filename, isMobile }) {
  // Create a new tab target
  const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new`, { method: "PUT" });
  const target = await newTabRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  const cdp = new CDPClient(ws);

  // Enable needed domains
  await cdp.send("Page.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: isMobile
  });

  // Set the session cookie
  await cdp.send("Network.setCookie", {
    name: "gx_session",
    value: "gx-prototype-dev-token",
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false
  });

  // Navigate to Dashboard
  await cdp.send("Page.navigate", { url: APP_URL });

  // Wait for page to load
  await sleep(2500);

  // Set theme in localStorage & toggle document class
  await cdp.send("Runtime.evaluate", {
    expression: `
      localStorage.setItem('gx_theme', '${theme}');
      if ('${theme}' === 'dark') {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.style.colorScheme = 'light';
      }
    `
  });

  // Wait 1.5s for charts and re-render animations
  await sleep(1500);

  // Capture screenshot
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    quality: 100
  });

  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(screenshot.data, "base64"));
  console.log(`Saved screenshot: ${filePath}`);

  // Close tab
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`);
  ws.close();
}

async function main() {
  console.log("Starting Edge in headless mode...");
  const edgeProcess = await startEdge();
  console.log("Edge connected successfully. Capturing prototypes...");

  try {
    // 1. Desktop Dark
    await captureScreen({
      width: 1400,
      height: 900,
      theme: "dark",
      filename: "desktop_dark_dashboard.png",
      isMobile: false
    });

    // 2. Desktop Light
    await captureScreen({
      width: 1400,
      height: 900,
      theme: "light",
      filename: "desktop_light_dashboard.png",
      isMobile: false
    });

    // 3. Mobile Dark
    await captureScreen({
      width: 390,
      height: 844,
      theme: "dark",
      filename: "mobile_dark_dashboard.png",
      isMobile: true
    });

    // 4. Mobile Light
    await captureScreen({
      width: 390,
      height: 844,
      theme: "light",
      filename: "mobile_light_dashboard.png",
      isMobile: true
    });

    console.log("All 4 screenshots captured successfully!");
  } finally {
    edgeProcess.kill();
  }
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
