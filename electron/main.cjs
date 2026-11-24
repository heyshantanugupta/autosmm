const { app, BrowserWindow, dialog, ipcMain, shell, utilityProcess } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

// A fixed port keeps the page's address the same on every launch, which is what lets the browser
// storage (the saved brief and drafts) survive restarts. A free port is used only if this one is busy.
const PREFERRED_PORT = 47819;
const HOST = "127.0.0.1";

let serverProcess = null;
let origin = "";
let mainWindow = null;

const serverDir = () =>
  app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(__dirname, "..", "desktop-server");

function canListen(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => resolve(false));
    s.once("listening", () => s.close(() => resolve(true)));
    s.listen(port, HOST);
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, HOST, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function waitForServer(port, timeoutMs = 40000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get({ host: HOST, port, path: "/", timeout: 2000 }, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        retry();
      });
      req.on("error", retry);
      req.on("timeout", () => req.destroy());
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error("The app server did not start in time."));
      setTimeout(tick, 250);
    };
    tick();
  });
}

async function startServer() {
  const dir = serverDir();
  const entry = path.join(dir, "server.js");
  if (!fs.existsSync(entry)) throw new Error(`Missing server files at ${dir}. Run "npm run desktop:build" first.`);
  const port = (await canListen(PREFERRED_PORT)) ? PREFERRED_PORT : await freePort();
  // A utility process runs the server without adding a second icon to the Dock or taskbar.
  serverProcess = utilityProcess.fork(entry, [], {
    cwd: dir,
    stdio: "ignore",
    serviceName: "AutoSMM server",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: HOST,
      NEXT_TELEMETRY_DISABLED: "1",
      // On someone's own computer, local models (Ollama) are safe to allow.
      ALLOW_LOCAL_MODELS: "1",
    },
  });
  serverProcess.once("exit", (code) => {
    serverProcess = null;
    if (!app.isQuitting && code) dialog.showErrorBox("AutoSMM stopped", `The app server stopped unexpectedly (code ${code}). Please reopen AutoSMM.`);
  });
  await waitForServer(port);
  origin = `http://${HOST}:${port}`;
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

const isLocal = (url) => {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
};

function openExternalSafely(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "https:" || u.protocol === "http:") shell.openExternal(u.toString());
  } catch {
    /* ignore malformed links */
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "AutoSMM",
    backgroundColor: "#14172b",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Links to other sites (including the "Post on ..." buttons) open in the person's normal browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isLocal(url)) openExternalSafely(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isLocal(url)) {
      event.preventDefault();
      openExternalSafely(url);
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.loadURL(origin);
}

// Saves a report as a PDF. Only the app's own page may call this.
ipcMain.handle("save-pdf", async (event, payload) => {
  if (!isLocal(event.senderFrame?.url ?? "")) throw new Error("Not allowed.");
  const html = payload && typeof payload.html === "string" ? payload.html : "";
  if (!html || html.length > 5_000_000) throw new Error("Nothing to save.");
  const base = path.basename(String(payload.fileName || "report.pdf")).replace(/[^\w.\- ]+/g, "-");
  const fileName = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;

  const worker = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true } });
  try {
    await worker.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await worker.webContents.printToPDF({ printBackground: true, pageSize: "A4", preferCSSPageSize: true });
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow ?? undefined, {
      defaultPath: path.join(app.getPath("documents"), fileName),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    fs.writeFileSync(filePath, pdf);
    return { ok: true, path: filePath };
  } finally {
    worker.destroy();
  }
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await startServer();
      createWindow();
    } catch (err) {
      dialog.showErrorBox("AutoSMM could not start", String(err && err.message ? err.message : err));
      app.quit();
    }
  });

  app.on("before-quit", () => {
    app.isQuitting = true;
    stopServer();
  });
  app.on("window-all-closed", () => app.quit());
}
