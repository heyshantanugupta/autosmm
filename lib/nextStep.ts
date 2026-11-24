import { daysBetween } from "./dates.ts";
import type { Intake, PlanItem, ResultEntry, Strategy } from "./types";

export type NextAction = "brief" | "strategy" | "plan" | "write-week" | "post-today" | "log-results" | "replan" | "rest";

export interface NextStep {
  action: NextAction;
  title: string;
  text: string;
  button: string;
}

export interface Snapshot {
  intake: Intake;
  strategy: Strategy | null;
  plan: PlanItem[];
  results: ResultEntry[];
  today: string;
}

/** The week ahead: today and the next six days. */
export const weekAhead = (plan: PlanItem[], today: string) => plan.filter((p) => p.date >= today && daysBetween(today, p.date) < 7);

/** The one thing to do next. The Today screen shows only this, so a beginner never has to choose. */
export function nextStep(s: Snapshot): NextStep {
  if (!s.intake.productName.trim() || !s.intake.facts.trim()) {
    return { action: "brief", title: "Tell AutoSMM about your product", text: "Paste your website and it fills in a first draft. Or type a few lines about what you do.", button: "Start your brief" };
  }
  if (!s.strategy) {
    return { action: "strategy", title: "Build your strategy", text: "AutoSMM reads your brief and decides who to talk to, where, and about what.", button: "Build my strategy" };
  }
  if (s.plan.length === 0) {
    return { action: "plan", title: "Make your 30-day plan", text: "One click gives you a post for each posting day, balanced between teaching, stories, proof and offers.", button: "Make my 30 days" };
  }
  const lastDate = s.plan[s.plan.length - 1].date;
  if (lastDate < s.today) {
    return { action: "replan", title: "Your plan has run out", text: "Make the next 30 days. If you logged your results, the new plan leans on what worked.", button: "Plan the next 30 days" };
  }
  const posted = s.plan.filter((p) => p.posted);
  const logged = new Set(s.results.map((r) => r.planItemId));
  const waiting = posted.filter((p) => !logged.has(p.id) && p.date < s.today);
  const week = weekAhead(s.plan, s.today);
  const unwritten = week.filter((p) => !p.draftId);
  if (unwritten.length > 0) {
    return { action: "write-week", title: `Write the next ${week.length} posts`, text: `${unwritten.length === week.length ? `All ${week.length}` : `${unwritten.length} of the ${week.length}`} posts coming up still need writing. AutoSMM writes them in one go. You edit and post.`, button: "Write this week" };
  }
  const todays = s.plan.filter((p) => p.date === s.today && !p.posted);
  if (todays.length > 0) {
    return { action: "post-today", title: todays.length === 1 ? "Post today's post" : `Post today's ${todays.length} posts`, text: "Read it, change anything that does not sound like you, copy it, and post it.", button: "Open today's post" };
  }
  if (waiting.length > 0) {
    return { action: "log-results", title: "Log how your last post did", text: "Type its likes, comments and views. A few posts later AutoSMM can tell you what works.", button: "Log results" };
  }
  return { action: "rest", title: "You are done for today", text: "Nothing left to post today. Come back tomorrow, or reply to comments.", button: "Reply to a comment" };
}
