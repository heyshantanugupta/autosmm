"use client";

import { useEffect, useState } from "react";
import { getDesktop, type UpdateState } from "@/lib/desktop";
import { isNewer } from "@/lib/update";

const REPO = "heyshantanugupta/autosmm";
const CURRENT = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
const CHECK_KEY = "ssa.updateCheck";
const DISMISS_KEY = "ssa.updateDismissed";
const DAY = 24 * 60 * 60 * 1000;

const read = (k: string) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* storage can be blocked; the notice just shows again next time */
  }
};

/**
 * In the desktop app, tell the person when a newer release exists.
 * Windows (installed with the Setup file): Update now downloads it, then asks before closing to install.
 * Mac and the portable Windows file: a popup with a link to download, because those cannot update themselves.
 * Nothing downloads or installs without a click.
 */
export default function UpdateNotice() {
  const [auto, setAuto] = useState<UpdateState>({ status: "idle" });
  const [canAuto, setCanAuto] = useState(false);
  const [link, setLink] = useState<{ tag: string; url: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop || !CURRENT) return;
    let cancelled = false;
    let off: (() => void) | undefined;

    const showLink = (tag: string, url: string) => {
      if (!cancelled && isNewer(tag, CURRENT) && read(DISMISS_KEY) !== tag) setLink({ tag, url });
    };
    const checkGithub = () => {
      try {
        const cached = JSON.parse(read(CHECK_KEY) ?? "null") as { at: number; tag: string; url: string } | null;
        if (cached && Date.now() - cached.at < DAY) return showLink(cached.tag, cached.url);
      } catch {
        /* ignore a damaged cache */
      }
      fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } })
        .then((r) => (r.ok ? r.json() : null))
        .then((rel: { tag_name?: string; html_url?: string } | null) => {
          if (!rel?.tag_name) return;
          const url = rel.html_url ?? `https://github.com/${REPO}/releases/latest`;
          write(CHECK_KEY, JSON.stringify({ at: Date.now(), tag: rel.tag_name, url }));
          showLink(rel.tag_name, url);
        })
        .catch(() => {
          /* offline or blocked: say nothing */
        });
    };

    (async () => {
      const info = await desktop.updateInfo?.().catch(() => null);
      if (cancelled) return;
      if (!info?.canAutoUpdate) return checkGithub();
      setCanAuto(true);
      setAuto(info.state);
      off = desktop.onUpdateState?.((s) => {
        if (cancelled) return;
        setAuto(s);
        // If the built-in updater fails, fall back to the download link.
        if (s.status === "error") checkGithub();
      });
      desktop.checkUpdate?.();
    })();

    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  const desktop = getDesktop();

  if (canAuto) {
    if (dismissed && auto.status !== "downloading") return null;
    const v = auto.status !== "idle" && auto.version ? ` (v${auto.version})` : "";
    if (auto.status === "available") {
      return (
        <div className="notice update-notice" role="status">
          <span>
            <strong>A new version is available{v}.</strong> Your work stays saved when you update.
          </span>
          <span className="update-actions">
            <button type="button" className="btn small" onClick={() => desktop?.downloadUpdate?.()}>
              Update now
            </button>
            <button type="button" className="btn secondary small" onClick={() => setDismissed(true)}>
              Not now
            </button>
          </span>
        </div>
      );
    }
    if (auto.status === "downloading") {
      return (
        <div className="notice update-notice" role="status">
          <span>
            <strong>Downloading the update{v}...</strong> {auto.percent ?? 0}%
          </span>
          <progress max={100} value={auto.percent ?? 0} aria-label="Update download progress" />
        </div>
      );
    }
    if (auto.status === "ready") {
      return (
        <div className="notice update-notice" role="status">
          <span>
            <strong>The update{v} is ready.</strong> AutoSMM will close, install it and open again.
          </span>
          <span className="update-actions">
            <button type="button" className="btn small" onClick={() => desktop?.installUpdate?.()}>
              Close and install
            </button>
            <button type="button" className="btn secondary small" onClick={() => setDismissed(true)}>
              Later
            </button>
          </span>
        </div>
      );
    }
  }

  // Mac, the portable Windows file, or an update the built-in updater could not fetch: a popup with a link.
  if (link && !dismissed) {
    const close = () => {
      write(DISMISS_KEY, link.tag);
      setDismissed(true);
    };
    return (
      <div className="modal-backdrop" role="presentation">
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="update-title">
          <h2 id="update-title">A new version is available</h2>
          <p>
            AutoSMM {link.tag} is out. Download it and open the file to install it over your current version. Your work
            stays saved.
          </p>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn secondary small" onClick={close}>
              Not now
            </button>
            <a className="btn small" href={link.url} target="_blank" rel="noopener noreferrer" onClick={close}>
              See what is new and download
            </a>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
