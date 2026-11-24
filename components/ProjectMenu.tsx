"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectIndex } from "@/lib/projects";

interface Props {
  index: ProjectIndex;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<string | null>;
  onDelete: () => void;
}

/** A "save slot" menu: switch between projects, start a new one, back one up, or load one from a file. */
export default function ProjectMenu({ index, onSwitch, onNew, onRename, onDuplicate, onExport, onImport, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "rename" | "delete">("menu");
  const [name, setName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const active = index.projects.find((p) => p.id === index.activeId) ?? index.projects[0];

  const close = () => {
    setOpen(false);
    setMode("menu");
    setNote(null);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  return (
    <div className="project-menu" ref={root}>
      <button type="button" className="btn secondary small project-btn" aria-expanded={open} aria-haspopup="true" onClick={() => (open ? close() : setOpen(true))}>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 6a1.5 1.5 0 0 1 1.5-1.5h3.2l1.6 1.8H16A1.5 1.5 0 0 1 17.5 7.8v6.7A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5z" />
        </svg>
        <span className="project-name">{active?.name}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="project-panel" role="group" aria-label="Projects">
          {mode === "menu" && (
            <>
              <p className="project-help">Each project keeps its own brief, strategy, plan, drafts and results. Your API key and settings are shared.</p>
              <ul className="project-list">
                {index.projects.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="project-item" aria-current={p.id === index.activeId ? "true" : undefined} onClick={run(() => p.id !== index.activeId && onSwitch(p.id))}>
                      <span>{p.name}</span>
                      {p.id === index.activeId && <small>open now</small>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="project-actions">
                <button type="button" className="icon-link" onClick={run(onNew)}>
                  New project
                </button>
                <button
                  type="button"
                  className="icon-link"
                  onClick={() => {
                    setName(active?.name ?? "");
                    setMode("rename");
                  }}
                >
                  Rename
                </button>
                <button type="button" className="icon-link" onClick={run(onDuplicate)}>
                  Duplicate
                </button>
                <button type="button" className="icon-link" onClick={run(onExport)}>
                  Export to a file
                </button>
                <button type="button" className="icon-link" onClick={() => fileRef.current?.click()}>
                  Import from a file
                </button>
                <button type="button" className="icon-link danger" onClick={() => setMode("delete")}>
                  Delete
                </button>
              </div>
              {note && (
                <p className="error" role="alert">
                  {note}
                </p>
              )}
            </>
          )}

          {mode === "rename" && (
            <form
              className="project-form"
              onSubmit={(e) => {
                e.preventDefault();
                onRename(name);
                close();
              }}
            >
              <label htmlFor="project-rename">Project name</label>
              <input id="project-rename" type="text" value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} />
              <div className="row">
                <button type="submit" className="btn small" disabled={!name.trim()}>
                  Save name
                </button>
                <button type="button" className="btn quiet small" onClick={() => setMode("menu")}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {mode === "delete" && (
            <div className="project-form" role="alertdialog" aria-label="Delete project">
              <p>
                Delete <strong>{active?.name}</strong> and everything in it? This cannot be undone. Use "Export to a file" first if you want a backup.
              </p>
              <div className="row">
                <button type="button" className="btn small" onClick={run(onDelete)}>
                  Yes, delete it
                </button>
                <button type="button" className="btn quiet small" onClick={() => setMode("menu")}>
                  Keep it
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Choose a project file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const err = await onImport(file);
          if (err) {
            setOpen(true);
            setMode("menu");
            setNote(err);
          } else close();
        }}
      />
    </div>
  );
}
