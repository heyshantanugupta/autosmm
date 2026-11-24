export type UpdateState =
  | { status: "idle" }
  | { status: "available"; version?: string }
  | { status: "downloading"; version?: string; percent?: number }
  | { status: "ready"; version?: string }
  | { status: "error"; version?: string };

/** Present only inside the AutoSMM desktop app (set up by electron/preload.cjs). */
export interface DesktopBridge {
  isDesktop: true;
  savePdf: (html: string, fileName: string) => Promise<{ ok: boolean; canceled?: boolean; path?: string }>;
  updateInfo?: () => Promise<{ canAutoUpdate: boolean; state: UpdateState }>;
  checkUpdate?: () => Promise<void>;
  downloadUpdate?: () => Promise<void>;
  installUpdate?: () => Promise<{ ok: boolean }>;
  onUpdateState?: (callback: (state: UpdateState) => void) => () => void;
}

export function getDesktop(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  const d = (window as unknown as { desktop?: DesktopBridge }).desktop;
  return d && d.isDesktop === true && typeof d.savePdf === "function" ? d : null;
}
