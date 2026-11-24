"use client";

import { useState } from "react";
import { requestModels } from "@/lib/client";
import { getProvider, PROVIDERS, PROVIDER_GROUPS, type ProviderId } from "@/lib/providers";
import type { Settings } from "@/lib/storage";

interface Props {
  settings: Settings;
  onChange: (next: Settings) => void;
  onClose: () => void;
  onClearData: () => void;
}

const CUSTOM = "__custom__";

export default function SettingsPanel({ settings, onChange, onClose, onClearData }: Props) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value });
  const provider = getProvider(settings.provider);
  const [found, setFound] = useState<string[] | null>(null);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);

  // Suggested models first, then anything the key reported, then the current value if it is neither.
  const options: { id: string; label: string }[] = [...provider.models];
  for (const id of found ?? []) if (!options.some((m) => m.id === id)) options.push({ id, label: id });
  const inList = options.some((m) => m.id === settings.model);
  if (!inList && !custom && settings.model) options.push({ id: settings.model, label: settings.model });

  const findModels = async () => {
    setFinding(true);
    setFindError(null);
    try {
      const ids = await requestModels(settings);
      setFound(ids);
      if (ids.length === 0) setFindError("No models came back for this key.");
    } catch (e) {
      setFound(null);
      setFindError(e instanceof Error ? e.message : "Could not list models.");
    } finally {
      setFinding(false);
    }
  };

  // A key from one provider is useless for another, so switching clears it and resets the model.
  const changeProvider = (id: ProviderId) => {
    const next = getProvider(id);
    setFound(null);
    setFindError(null);
    setCustom(false);
    onChange({ ...settings, provider: id, apiKey: "", model: next.defaultModel });
  };

  return (
    <section className="settings" aria-labelledby="settings-title">
      <h2 id="settings-title">Settings</h2>

      <div className="check">
        <input
          id="demo"
          type="checkbox"
          checked={settings.demo}
          onChange={(e) => set("demo", e.target.checked)}
        />
        <label htmlFor="demo">
          <strong>Demo mode</strong>
          <span className="hint" style={{ display: "block", margin: 0 }}>
            Try the whole flow without an API key. Output is built from a template, not written by a model.
          </span>
        </label>
      </div>

      <div className="field">
        <label htmlFor="provider">Model provider</label>
        <p className="hint" id="provider-hint">
          Your key goes only to the provider you pick. Several have a free tier, so you can try AutoSMM without paying. {provider.note}
        </p>
        <select
          id="provider"
          value={settings.provider}
          aria-describedby="provider-hint"
          disabled={settings.demo}
          onChange={(e) => changeProvider(e.target.value as ProviderId)}
        >
          {PROVIDER_GROUPS.map((g) => (
            <optgroup key={g.id} label={g.label}>
              {PROVIDERS.filter((p) => p.group === g.id).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {provider.needsKey && (
        <div className="field">
          <label htmlFor="apikey">{provider.label} API key</label>
          <p className="hint" id="apikey-hint">
            Get one at {provider.keyUrl}. It is sent with each request to this app&apos;s server, passed to{" "}
            {provider.label}, and never stored or logged by the server.
          </p>
          <input
            id="apikey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={provider.keyPlaceholder}
            aria-describedby="apikey-hint"
            value={settings.apiKey}
            disabled={settings.demo}
            onChange={(e) => set("apiKey", e.target.value)}
          />
        </div>
      )}

      {provider.needsKey && (
      <div className="check">
        <input
          id="remember"
          type="checkbox"
          checked={settings.remember}
          disabled={settings.demo}
          onChange={(e) => set("remember", e.target.checked)}
        />
        <label htmlFor="remember">
          Remember the key in this browser
          <span className="hint" style={{ display: "block", margin: 0 }}>
            Off by default: the key is kept only for this tab and disappears when you close it. Do not turn this on
            for a shared computer.
          </span>
        </label>
      </div>
      )}

      <div className="field">
        <label htmlFor="model">Model</label>
        <select
          id="model"
          value={custom ? CUSTOM : settings.model}
          disabled={settings.demo}
          onChange={(e) => {
            if (e.target.value === CUSTOM) {
              setCustom(true);
            } else {
              setCustom(false);
              set("model", e.target.value);
            }
          }}
        >
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          {provider.kind !== "anthropic" && <option value={CUSTOM}>Other (type a model id)...</option>}
        </select>
        {custom && provider.kind !== "anthropic" && (
          <input
            id="model-custom"
            type="text"
            aria-label="Model id"
            placeholder="Model id, as listed by the provider"
            autoComplete="off"
            spellCheck={false}
            style={{ marginTop: 8 }}
            value={settings.model}
            disabled={settings.demo}
            onChange={(e) => set("model", e.target.value)}
          />
        )}
        {provider.kind !== "anthropic" && (
          <>
            <p className="hint" id="model-hint" style={{ marginTop: 8 }}>
              Model names change often. If you get a &quot;not available&quot; error, check which models your key can use.
            </p>
            <div className="row">
              <button
                type="button"
                className="btn secondary small"
                onClick={findModels}
                disabled={settings.demo || finding || (provider.needsKey && !settings.apiKey)}
              >
                {finding ? "Checking..." : "Check available models"}
              </button>
              {found && found.length > 0 && <span className="hint">{found.length} models found and added to the list.</span>}
              {findError && <span className="hint" role="alert">{findError}</span>}
            </div>
          </>
        )}
      </div>

      <div className="row">
        <button type="button" className="btn" onClick={onClose}>
          Done
        </button>
        <button type="button" className="btn quiet" onClick={onClearData}>
          Clear saved brief, drafts and key
        </button>
      </div>
    </section>
  );
}
