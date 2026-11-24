"use client";

import { useEffect, useState } from "react";
import { getDesktop, type UpdateState } from "@/lib/desktop";
import { isNewer } from "@/lib/update";

const REPO = "heyshantanugupta/autosmm";
const CURRENT = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

type Result = { kind: "none" } | { kind: "checking" } | { kind: "latest" } | { kind: "offline" } | { kind: "link"; tag: string; url: string };

/** The Version tab in Settings: shows the version and lets the person check for an update without restarting. */
export default function VersionCheck() {
  const [desktop] = useState(() => getDesktop());
  const [canAuto, setCanAuto] = useState(false);
  const [auto, setAuto] = useState<UpdateState>({ status: "idle" });
  const [result, setResult] = useState<Result>({ kind: "none" });

  useEffect(() => {
    if (!desktop) return;
    let off: (() => void) | undefined;
    let live = true;
    desktop.updateInfo?.().then((info) => {
      if (!live || !info) return;
      setCanAuto(info.canAutoUpdate);
      setAuto(info.state);
    }).catch(() => {});
    off = desktop.onUpdateState?.((s) => live && setAuto(s));
    return () => {
      live = false;
      off?.();
    };
  }, [desktop]);

  const check = async () => {
    setResult({ kind: "checking" });
    if (desktop && canAuto) {
      await desktop.checkUpdate?.();
      setResult({ kind: "latest" });
      return;
    }
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
      const rel = r.ok ? ((await r.json()) as { tag_name?: string; html_url?: string }) : null;
      if (!rel?.tag_name) return setResult({ kind: "offline" });
      setResult(
        isNewer(rel.tag_name, CURRENT)
          ? { kind: "link", tag: rel.tag_name, url: rel.html_url ?? `https://github.com/${REPO}/releases/latest` }
          : { kind: "latest" },
      );
    } catch {
      setResult({ kind: "offline" });
    }
  };

  const busy = result.kind === "checking" || auto.status === "downloading";
  const v = auto.status !== "idle" && auto.version ? ` (v${auto.version})` : "";

  return (
    <div className="field" id="app-version">
      <label>Version</label>
      <p className="hint">AutoSMM version {CURRENT || "unknown"}</p>
      <div className="row" style={{ marginTop: 12 }}>
        {canAuto && auto.status === "available" ? (
          <button type="button" className="btn small" onClick={() => desktop?.downloadUpdate?.()}>
            Update now{v}
          </button>
        ) : canAuto && auto.status === "ready" ? (
          <button type="button" className="btn small" onClick={() => desktop?.installUpdate?.()}>
            Close and install{v}
          </button>
        ) : (
          <button type="button" className="btn secondary small" disabled={busy} onClick={check}>
            {result.kind === "checking" ? "Checking..." : "Check for updates"}
          </button>
        )}
      </div>
      <p className="hint" role="status" style={{ marginTop: 10 }}>
        {auto.status === "downloading" && `Downloading the update${v}... ${auto.percent ?? 0}%`}
        {auto.status === "available" && `A new version is available${v}. Your work stays saved when you update.`}
        {auto.status === "ready" && `The update${v} is ready. AutoSMM will close, install it and open again.`}
        {auto.status === "error" && result.kind !== "checking" && "Could not check for updates. Try again in a moment."}
        {(auto.status === "idle" || auto.status === "error") && result.kind === "latest" && auto.status === "idle" && "You are on the latest version."}
        {result.kind === "offline" && "Could not reach the update server. Check your connection and try again."}
        {result.kind === "link" && (
          <>
            AutoSMM {result.tag} is out.{" "}
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              See what is new and download
            </a>
          </>
        )}
      </p>
    </div>
  );
}
