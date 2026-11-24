import type { Intake } from "../lib/types.ts";

/** A made-up product used only by the tests. It is not shown in the app. */
export const SAMPLE_BRIEF: Intake = {
  productName: "Brightloop",
  oneLiner: "A habit tracker that turns a goal into a weekly plan and a report you can trust.",
  website: "https://www.example.com",
  audience: "Busy people who want to build habits, and team leads who want a simple way to keep a group on track.",
  goal: "signups",
  channels: ["linkedin", "instagram", "youtube", "facebook", "x"],
  facts: [
    "A short setup runs in the browser with no signup, about 2 minutes.",
    "The free plan includes 2 habit plans per week, 30 minutes each, basic reports and 20 templates.",
    "Reports are written by AI and graded against a rubric the company publishes, with the full history attached to every score.",
    "Team leads can paste a goal list and get one invite link to send every member. It is free to start.",
    "The app is free on iPhone, Android, Mac and Windows.",
  ].join("\n"),
  proof: "Company-stated: teams spend $8,000 to $36,000 per year on coaching.",
  newUpdates: "Team leads can start a shared plan from a pasted goal list and one invite link.",
  doNotSay: [
    "Never say habit plans are unlimited",
    "Never say free users can share their reports",
    "Never invent testimonials, customer names or results",
    "Never claim the score predicts success",
  ].join("\n"),
  tone: "Direct, plain-spoken and specific. Sounds like a person, not a brand. No em dashes.",
  currentState: "LinkedIn page with a small following. Other channels are new and mostly empty.",
};
