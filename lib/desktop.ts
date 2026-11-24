/** Present only inside the AutoSMM desktop app (set up by electron/preload.cjs). */
export interface DesktopBridge {
  isDesktop: true;
  savePdf: (html: string, fileName: string) => Promise<{ ok: boolean; canceled?: boolean; path?: string }>;
}

export function getDesktop(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  const d = (window as unknown as { desktop?: DesktopBridge }).desktop;
  return d && d.isDesktop === true && typeof d.savePdf === "function" ? d : null;
}
