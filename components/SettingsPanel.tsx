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

export default function SettingsPanel({ settings, onChange, onClose, onClearData }: Props) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value });
  const provider = getProvider(settings.provider);
  const [found, setFound] = useState<string[] | null>(null);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

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
        {provider.kind === "anthropic" ? (
          <select id="model" value={settings.model} onChange={(e) => set("model", e.target.value)} disabled={settings.demo}>
            {provider.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        ) : (
          <>
            <p className="hint" id="model-hint">
              Model names change often. If you get a &quot;not available&quot; error, check the provider&apos;s model list and type the
              current id here.
            </p>
            <input
              id="model"
              type="text"
              list="model-suggestions"
              aria-describedby="model-hint"
              autoComplete="off"
              spellCheck={false}
              value={settings.model}
              disabled={settings.demo}
              onChange={(e) => set("model", e.target.value)}
            />
            <div className="row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn secondary small"
                onClick={findModels}
                disabled={settings.demo || finding || (provider.needsKey && !settings.apiKey)}
              >
                {finding ? "Checking..." : "Check available models"}
              </button>
              {found && found.length > 0 && <span className="hint">{found.length} found. Click the Model field to pick one.</span>}
              {findError && <span className="hint" role="alert">{findError}</span>}
            </div>
            <datalist id="model-suggestions">
              {(found ?? provider.models.map((m) => m.id)).map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
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
