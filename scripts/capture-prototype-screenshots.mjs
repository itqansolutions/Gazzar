import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CDP_PORT = 9222;
const APP_PORT = 3001;
const BASE_URL = `http://localhost:${APP_PORT}`;
const OUTPUT_DIR = path.resolve("public/design-prototype");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer() {
  console.log("Starting Next.js server on port 3001 with ALLOW_PROTOTYPE_BYPASS=true...");
  const serverProcess = spawn("cmd.exe", ["/c", "npx", "next", "start", "-p", String(APP_PORT)], {
    env: {
      ...process.env,
      ALLOW_PROTOTYPE_BYPASS: "true",
      PORT: String(APP_PORT)
    },
    stdio: "pipe"
  });

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.ok) {
        console.log("Next.js server is ready!");
        return serverProcess;
      }
    } catch {}
    await sleep(300);
  }
  throw new Error("Could not connect to Next.js server");
}

async function startEdge() {
  const edgeProcess = spawn(EDGE_PATH, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + path.resolve("tmp/edge-profile-" + Date.now())
  ]);

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
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

async function captureScreen({ width, height, theme, filename, isMobile, pathUrl = "/dashboard", withAuth = true }) {
  const newTabRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new`, { method: "PUT" });
  const target = await newTabRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  const cdp = new CDPClient(ws);

  await cdp.send("Page.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: isMobile
  });

  if (withAuth) {
    await cdp.send("Network.setCookie", {
      url: `http://localhost:${APP_PORT}`,
      name: "gx_session",
      value: "gx-prototype-dev-token",
      path: "/",
      httpOnly: false,
      secure: false
    });
  } else {
    await cdp.send("Network.clearBrowserCookies");
  }

  await cdp.send("Page.navigate", { url: `${BASE_URL}${pathUrl}` });
  await sleep(3000);

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

  await sleep(1500);

  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    quality: 100
  });

  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(screenshot.data, "base64"));
  console.log(`Saved screenshot: ${filePath}`);

  await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${target.id}`);
  ws.close();
}

async function main() {
  const serverProcess = await startServer();
  const edgeProcess = await startEdge();
  console.log("Environment ready. Capturing target screens...");

  try {
    // 1. Desktop Dark Dashboard
    await captureScreen({
      width: 1400,
      height: 900,
      theme: "dark",
      filename: "desktop_dark_dashboard.png",
      isMobile: false,
      pathUrl: "/dashboard",
      withAuth: true
    });

    // 2. Desktop Light Dashboard
    await captureScreen({
      width: 1400,
      height: 900,
      theme: "light",
      filename: "desktop_light_dashboard.png",
      isMobile: false,
      pathUrl: "/dashboard",
      withAuth: true
    });

    // 3. Mobile Dark Dashboard
    await captureScreen({
      width: 390,
      height: 844,
      theme: "dark",
      filename: "mobile_dark_dashboard.png",
      isMobile: true,
      pathUrl: "/dashboard",
      withAuth: true
    });

    // 4. Mobile Light Dashboard
    await captureScreen({
      width: 390,
      height: 844,
      theme: "light",
      filename: "mobile_light_dashboard.png",
      isMobile: true,
      pathUrl: "/dashboard",
      withAuth: true
    });

    // 5. Login Screen (Desktop Dark)
    await captureScreen({
      width: 1200,
      height: 800,
      theme: "dark",
      filename: "login_screen.png",
      isMobile: false,
      pathUrl: "/login",
      withAuth: false
    });

    console.log("All 5 target screenshots captured successfully!");
  } finally {
    edgeProcess.kill();
    serverProcess.kill();
    // Kill any remaining next processes on port 3001
    try {
      spawn("cmd.exe", ["/c", "for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :3001') do taskkill /f /pid %a"]);
    } catch {}
  }
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
