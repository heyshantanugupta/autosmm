const { contextBridge, ipcRenderer } = require("electron");

// The only things the web page may ask the desktop shell to do.
contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  /** Turns a standalone HTML page into a PDF and asks where to save it. */
  savePdf: (html, fileName) => ipcRenderer.invoke("save-pdf", { html, fileName }),
  /** Update support. canAutoUpdate is false on Mac and for the portable Windows file. */
  updateInfo: () => ipcRenderer.invoke("update-info"),
  checkUpdate: () => ipcRenderer.invoke("update-check"),
  downloadUpdate: () => ipcRenderer.invoke("update-download"),
  installUpdate: () => ipcRenderer.invoke("update-install"),
  onUpdateState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on("update-state", handler);
    return () => ipcRenderer.removeListener("update-state", handler);
  },
});
