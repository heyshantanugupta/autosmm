"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDay } from "@/lib/dates";
import { PLATFORM_INFO } from "@/lib/postTypes";
import { summarize, type Group } from "@/lib/results";
import { PLATFORMS, type Platform, type PlanItem, type ResultEntry, type Review, type Strategy } from "@/lib/types";

interface Props {
  strategy: Strategy | null;
  plan: PlanItem[];
  results: ResultEntry[];
  review: Review | null;
  today: string;
  prefillItemId?: string;
  reviewBusy: boolean;
  reviewError: string | null;
  onAdd: (entry: Omit<ResultEntry, "id">) => void;
  onRemove: (id: string) => void;
  onReview: () => void;
}

const OTHER = "__other__";
const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));

function GroupTable({ title, groups }: { title: string; groups: Group[] }) {
  if (groups.length === 0) return null;
  return (
    <table className="results-table">
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Posts</th>
          <th scope="col">Likes and comments</th>
          <th scope="col">Views</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <tr key={g.key}>
            <th scope="row">{g.label}</th>
            <td>{g.count}</td>
            <td>{g.avgEngagement}</td>
            <td>{g.avgViews}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ResultsView(p: Props) {
  const logged = new Set(p.results.map((r) => r.planItemId));
  const choices = p.plan.filter((i) => (i.posted || i.draftId) && !logged.has(i.id) && i.date <= p.today);
  const [pick, setPick] = useState<string>(p.prefillItemId ?? choices[0]?.id ?? OTHER);
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [label, setLabel] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [views, setViews] = useState("");

  useEffect(() => {
    if (p.prefillItemId) setPick(p.prefillItemId);
  }, [p.prefillItemId]);

  const item = p.plan.find((i) => i.id === pick);
  const themeName = (id: string) => p.strategy?.themes.find((t) => t.id === id)?.name ?? "";
  const stats = useMemo(() => summarize(p.results, themeName), [p.results, p.strategy]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = () => {
    const base = item
      ? { date: item.date, platform: item.platform, label: item.topic.slice(0, 100), themeId: item.themeId, postTypeId: item.postTypeId, planItemId: item.id }
      : { date: p.today, platform, label: label.trim() || "Post" };
    p.onAdd({ ...base, likes: num(likes), comments: num(comments), views: num(views) });
    setLikes("");
    setComments("");
    setViews("");
    setLabel("");
    setPick(OTHER);
  };

  return (
    <>
      <div>
        <h1>Results</h1>
        <p className="lede">A day or two after a post goes live, type in its numbers. After a few posts AutoSMM can tell you what is working.</p>
      </div>

      <div className="section">
        <div className="field">
          <label htmlFor="res-post">Which post?</label>
          <select id="res-post" value={pick} onChange={(e) => setPick(e.target.value)}>
            {choices.map((i) => (
              <option key={i.id} value={i.id}>
                {formatDay(i.date)}, {PLATFORM_INFO[i.platform].label}: {i.topic.slice(0, 60)}
              </option>
            ))}
            {item && !choices.some((c) => c.id === item.id) && (
              <option value={item.id}>
                {formatDay(item.date)}, {PLATFORM_INFO[item.platform].label}: {item.topic.slice(0, 60)}
              </option>
            )}
            <option value={OTHER}>A different post</option>
          </select>
        </div>
        {!item && (
          <div className="grid-2">
            <div className="field">
              <label htmlFor="res-platform">Platform</label>
              <select id="res-platform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {PLATFORMS.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="res-label">Name for this post</label>
              <input id="res-label" type="text" maxLength={100} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="For example: founder story" />
            </div>
          </div>
        )}
        <div className="grid-3">
          <div className="field">
            <label htmlFor="res-likes">Likes</label>
            <input id="res-likes" type="number" min={0} inputMode="numeric" value={likes} onChange={(e) => setLikes(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="res-comments">Comments</label>
            <input id="res-comments" type="number" min={0} inputMode="numeric" value={comments} onChange={(e) => setComments(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="res-views">Views</label>
            <input id="res-views" type="number" min={0} inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={add} disabled={!likes && !comments && !views}>
            Add these numbers
          </button>
        </div>
      </div>

      {p.results.length > 0 && (
        <section aria-labelledby="logged-title">
          <h2 className="group-title" id="logged-title">
            Logged posts ({p.results.length})
          </h2>
          <ul className="plan-list">
            {p.results.map((r) => (
              <li className="plan-row" key={r.id} data-p={r.platform}>
                <div className="plan-day">{formatDay(r.date)}</div>
                <div className="plan-main">
                  <div className="plan-topic">{r.label}</div>
                  <div className="plan-meta">
                    {PLATFORM_INFO[r.platform].label} · {r.likes} likes · {r.comments} comments · {r.views} views
                  </div>
                </div>
                <button type="button" className="icon-link" onClick={() => p.onRemove(r.id)} aria-label={`Delete the numbers for ${r.label}`}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <div className="row" style={{ marginTop: 22 }}>
            <button type="button" className="btn" onClick={p.onReview} disabled={p.reviewBusy || !p.strategy}>
              {p.reviewBusy ? "Reviewing..." : "Review my results"}
            </button>
          </div>
          {p.reviewError && <p className="error" role="alert">{p.reviewError}</p>}
        </section>
      )}

      {p.review && (
        <section className="section" aria-labelledby="review-title">
          <h2 id="review-title">Your review</h2>
          <p>{p.review.summary}</p>
          {p.review.doMore.length > 0 && (
            <>
              <h3>Do more of this</h3>
              <ul>{p.review.doMore.map((t) => <li key={t}>{t}</li>)}</ul>
            </>
          )}
          {p.review.changeOrStop.length > 0 && (
            <>
              <h3>Change or stop</h3>
              <ul>{p.review.changeOrStop.map((t) => <li key={t}>{t}</li>)}</ul>
            </>
          )}
          {p.review.tryNext.length > 0 && (
            <>
              <h3>Try next week</h3>
              <ul>{p.review.tryNext.map((t) => <li key={t}>{t}</li>)}</ul>
            </>
          )}
          <p className="hint">Your next 30-day plan will lean on this review. {stats.enough ? "" : "Log at least 5 posts before you trust a pattern."}</p>
          <details>
            <summary>See the numbers</summary>
            <GroupTable title="By theme" groups={stats.byTheme} />
            <GroupTable title="By platform" groups={stats.byPlatform} />
            <GroupTable title="By kind of post" groups={stats.byType} />
          </details>
        </section>
      )}
    </>
  );
}
