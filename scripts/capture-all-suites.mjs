import { spawn } from "child_process";
import fs from "fs";

const targets = [
  { name: "qa-desktop-dark-1440.png", width: 1440, height: 900, mobile: false, theme: "dark" },
  { name: "qa-desktop-light-1440.png", width: 1440, height: 900, mobile: false, theme: "light" },
  { name: "qa-desktop-dark-1280.png", width: 1280, height: 800, mobile: false, theme: "dark" },
  { name: "qa-desktop-light-1280.png", width: 1280, height: 800, mobile: false, theme: "light" },
  { name: "qa-mobile-dark-390.png", width: 390, height: 844, mobile: true, theme: "dark" },
  { name: "qa-mobile-light-390.png", width: 390, height: 844, mobile: true, theme: "light" },
  { name: "qa-mobile-dark-375.png", width: 375, height: 667, mobile: true, theme: "dark" },
  { name: "qa-mobile-light-375.png", width: 375, height: 667, mobile: true, theme: "light" }
];

async function captureOne(target) {
  return new Promise((resolve, reject) => {
    const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
      "--headless=new",
      "--remote-debugging-port=9444",
      `--window-size=${target.width},${target.height}`,
      "about:blank"
    ]);

    setTimeout(async () => {
      try {
        const res = await fetch("http://127.0.0.1:9444/json");
        const tabs = await res.json();
        const pageTab = tabs.find(t => t.type === "page") || tabs[0];
        const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

        ws.onopen = () => {
          ws.send(JSON.stringify({ id: 1, method: "Page.enable" }));
          ws.send(JSON.stringify({
            id: 2,
            method: "Emulation.setDeviceMetricsOverride",
            params: {
              width: target.width,
              height: target.height,
              deviceScaleFactor: target.mobile ? 2 : 1,
              mobile: target.mobile
            }
          }));
          ws.send(JSON.stringify({
            id: 3,
            method: "Page.navigate",
            params: { url: `http://localhost:3000/login?theme=${target.theme}` }
          }));
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.method === "Page.loadEventFired") {
            setTimeout(() => {
              ws.send(JSON.stringify({
                id: 10,
                method: "Page.captureScreenshot",
                params: { format: "png" }
              }));
            }, 1200);
          }

          if (msg.id === 10) {
            const buf = Buffer.from(msg.result.data, "base64");
            fs.writeFileSync(`public/${target.name}`, buf);
            console.log(`Saved: public/${target.name}`);
            ws.close();
            chrome.kill();
            setTimeout(resolve, 500);
          }
        };
      } catch (err) {
        chrome.kill();
        reject(err);
      }
    }, 1500);
  });
}

async function run() {
  for (const t of targets) {
    console.log(`Capturing ${t.name}...`);
    await captureOne(t);
  }
  console.log("All screenshots captured successfully!");
}

run();
