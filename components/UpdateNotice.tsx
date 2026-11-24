"use client";

import { useEffect, useState } from "react";
import { getDesktop } from "@/lib/desktop";
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

/** In the desktop app, tell the person when a newer release exists. It only looks, and never installs anything. */
export default function UpdateNotice() {
  const [latest, setLatest] = useState<{ tag: string; url: string } | null>(null);

  useEffect(() => {
    if (!getDesktop() || !CURRENT) return;
    let cancelled = false;
    const show = (tag: string, url: string) => {
      if (!cancelled && isNewer(tag, CURRENT) && read(DISMISS_KEY) !== tag) setLatest({ tag, url });
    };
    try {
      const cached = JSON.parse(read(CHECK_KEY) ?? "null") as { at: number; tag: string; url: string } | null;
      if (cached && Date.now() - cached.at < DAY) {
        show(cached.tag, cached.url);
        return () => {
          cancelled = true;
        };
      }
    } catch {
      /* ignore a damaged cache */
    }
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((rel: { tag_name?: string; html_url?: string } | null) => {
        if (!rel?.tag_name) return;
        const url = rel.html_url ?? `https://github.com/${REPO}/releases/latest`;
        write(CHECK_KEY, JSON.stringify({ at: Date.now(), tag: rel.tag_name, url }));
        show(rel.tag_name, url);
      })
      .catch(() => {
        /* offline or blocked: say nothing */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!latest) return null;
  return (
    <div className="notice update-notice" role="status">
      <span>
        <strong>A new version is available ({latest.tag}).</strong> Your work stays saved when you install it.
      </span>
      <span className="update-actions">
        <a href={latest.url} target="_blank" rel="noopener noreferrer">
          See what is new and download
        </a>
        <button
          type="button"
          className="btn secondary small"
          onClick={() => {
            write(DISMISS_KEY, latest.tag);
            setLatest(null);
          }}
        >
          Not now
        </button>
      </span>
    </div>
  );
}
