import { GOALS, type Intake, type Strategy } from "./types.ts";
import { PLATFORM_INFO } from "./postTypes.ts";

/** A tiny, format-neutral description of the report, rendered to Word and to a printable page. */
export type Block =
  | { t: "title"; text: string }
  | { t: "meta"; text: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "p"; text: string; label?: string }
  | { t: "ul"; items: string[] };

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function buildReport(intake: Intake, strategy: Strategy, date = new Date()): Block[] {
  const b: Block[] = [];
  const name = intake.productName.trim() || "Your product";
  b.push({ t: "title", text: `${name}: social media strategy` });
  b.push({
    t: "meta",
    text: `Prepared ${date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} with AutoSMM`,
  });

  if (strategy.summary) {
    b.push({ t: "h2", text: "Summary" });
    b.push({ t: "p", text: clean(strategy.summary) });
  }

  b.push({ t: "h2", text: "The brief" });
  const goal = GOALS.find((g) => g.id === intake.goal)?.label;
  if (intake.oneLiner.trim()) b.push({ t: "p", label: "What it does", text: clean(intake.oneLiner) });
  if (intake.website.trim()) b.push({ t: "p", label: "Website", text: intake.website.trim() });
  if (intake.audience.trim()) b.push({ t: "p", label: "Audience", text: clean(intake.audience) });
  if (goal) b.push({ t: "p", label: "Goal", text: goal });

  b.push({ t: "h2", text: "Positioning" });
  b.push({ t: "p", text: clean(strategy.positioning) });

  if (strategy.audiences.length) {
    b.push({ t: "h2", text: "Who you are talking to" });
    for (const a of strategy.audiences) {
      b.push({ t: "h3", text: a.name });
      if (a.pain) b.push({ t: "p", label: "Struggle", text: clean(a.pain) });
      if (a.message) b.push({ t: "p", label: "Say", text: clean(a.message) });
    }
  }

  if (strategy.themes.length) {
    b.push({ t: "h2", text: "Content themes" });
    for (const t of strategy.themes) {
      b.push({ t: "h3", text: t.name });
      if (t.why) b.push({ t: "p", text: clean(t.why) });
      if (t.exampleAngle) b.push({ t: "p", label: "Example", text: clean(t.exampleAngle) });
    }
  }

  if (strategy.platforms.length) {
    b.push({ t: "h2", text: "Where to post" });
    for (const p of strategy.platforms) {
      b.push({ t: "h3", text: `${PLATFORM_INFO[p.platform].label} (${p.fit} fit)` });
      if (p.role) b.push({ t: "p", label: "Role", text: clean(p.role) });
      if (p.cadence) b.push({ t: "p", label: "Cadence", text: clean(p.cadence) });
      if (p.rationale) b.push({ t: "p", text: clean(p.rationale) });
    }
  }

  if (strategy.weeklyRhythm) {
    b.push({ t: "h2", text: "Weekly rhythm" });
    b.push({ t: "p", text: clean(strategy.weeklyRhythm) });
  }
  if (strategy.measurement.length) {
    b.push({ t: "h2", text: "What to measure" });
    b.push({ t: "ul", items: strategy.measurement.map(clean) });
  }
  if (strategy.risks.length) {
    b.push({ t: "h2", text: "Risks to avoid" });
    b.push({ t: "ul", items: strategy.risks.map(clean) });
  }
  if (strategy.gaps.length) {
    b.push({ t: "h2", text: "Missing information" });
    b.push({ t: "ul", items: strategy.gaps.map(clean) });
  }
  return b;
}

export function reportFileName(intake: Intake, ext: string): string {
  const slug = intake.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${slug || "social"}-strategy.${ext}`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** A standalone, print-ready page. Everything is escaped, because the text comes from a model. */
export function reportToHtml(blocks: Block[]): string {
  const title = blocks.find((x) => x.t === "title");
  const body = blocks
    .map((x) => {
      switch (x.t) {
        case "title":
          return `<h1>${esc(x.text)}</h1>`;
        case "meta":
          return `<p class="meta">${esc(x.text)}</p>`;
        case "h2":
          return `<h2>${esc(x.text)}</h2>`;
        case "h3":
          return `<h3>${esc(x.text)}</h3>`;
        case "p":
          return `<p>${x.label ? `<strong>${esc(x.label)}:</strong> ` : ""}${esc(x.text)}</p>`;
        case "ul":
          return `<ul>${x.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
      }
    })
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title?.t === "title" ? title.text : "Strategy")}</title><style>
@page { margin: 18mm; }
body { font: 11pt/1.55 "Google Sans Flex Variable", "Google Sans", "Segoe UI", Arial, sans-serif; color: #151833; max-width: 720px; margin: 0 auto; }
h1 { font-size: 22pt; margin: 0 0 4px; color: #4936dc; }
.meta { color: #5b617f; font-size: 9.5pt; margin: 0 0 18px; }
h2 { font-size: 14pt; margin: 22px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #ecebff; break-after: avoid; }
h3 { font-size: 11.5pt; margin: 14px 0 2px; break-after: avoid; }
p { margin: 4px 0 6px; }
ul { margin: 4px 0 8px; padding-left: 20px; }
li { margin: 2px 0; }
</style></head><body>${body}</body></html>`;
}

/** Builds a real .docx file. The docx library is loaded only when someone asks for a download. */
export async function reportToDocx(blocks: Block[]): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const children: InstanceType<typeof Paragraph>[] = [];
  for (const x of blocks) {
    if (x.t === "title") children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(x.text)] }));
    else if (x.t === "meta")
      children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: x.text, color: "5B617F", size: 19 })] }));
    else if (x.t === "h2") children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320 }, children: [new TextRun(x.text)] }));
    else if (x.t === "h3") children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun(x.text)] }));
    else if (x.t === "p")
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [...(x.label ? [new TextRun({ text: `${x.label}: `, bold: true })] : []), new TextRun(x.text)],
        }),
      );
    else for (const item of x.items) children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun(item)] }));
  }
  const doc = new Document({
    creator: "AutoSMM",
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}
