const { contextBridge, ipcRenderer } = require("electron");

// The only things the web page may ask the desktop shell to do.
contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  /** Turns a standalone HTML page into a PDF and asks where to save it. */
  savePdf: (html, fileName) => ipcRenderer.invoke("save-pdf", { html, fileName }),
});
