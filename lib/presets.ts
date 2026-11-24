import type { Intake } from "./types";

export const BLANK_INTAKE: Intake = {
  productName: "",
  oneLiner: "",
  website: "",
  audience: "",
  goal: "signups",
  channels: ["linkedin"],
  facts: "",
  proof: "",
  newUpdates: "",
  doNotSay: "",
  tone: "",
  currentState: "",
};

/**
 * Example brief built only from information that is public on theinterviews.ai and its
 * social pages. Remove this file's export from the UI if you would rather not ship it.
 */
export const THEINTERVIEWS_EXAMPLE: Intake = {
  productName: "TheInterviews.ai",
  oneLiner: "Practice interviews that produce proof: a scored AI interview with the transcript attached.",
  website: "https://www.theinterviews.ai",
  audience:
    "Job seekers who want proof of skill beyond a resume. Recruiters and staffing teams who want a consistent first-round screen.",
  goal: "signups",
  channels: ["linkedin", "instagram", "youtube", "facebook", "x"],
  facts: [
    "A short AI interview runs in the browser with no signup, about 2 minutes.",
    "The free plan includes 2 practice interviews per week, 30 minutes each, basic feedback, 20 interview types and a private Profile Card.",
    "Interviews are voice-based and AI-led, graded against a rubric the company publishes, with the full transcript attached to every score.",
    "Scores map onto five dimensions: Technical, Problem-Solving, Communication, Code Quality and Behavioral.",
    "A Profile Card is a verified credential. On the free plan it is private; sharing and recruiter visibility depend on the plan.",
    "Hiring teams can paste a job description and get one interview link to send every applicant. It is free to start.",
    "The company published its own evaluation of the scorer: across 177 graded interviews from 71 people it separated distinct candidates less well than a human rater did.",
    "Hands-on ability still needs on-site verification.",
    "The app is free on iPhone, Android, Mac and Windows.",
  ].join("\n"),
  proof: [
    "Featured in The Next Web, July 2026: \"The verification imperative in recruitment's trust crisis\".",
    "Company-stated: companies spend $8,000 to $36,000 per hire.",
  ].join("\n"),
  newUpdates: "Employers can run a free first-round AI interview from a pasted job description and one shared link.",
  doNotSay: [
    "Never say practice is unlimited on the free plan",
    "Never say free users can share their Profile Card",
    "Never invent testimonials, customer names or results",
    "Never claim the score predicts job performance",
    "Never say it replaces human interviewers",
  ].join("\n"),
  tone: "Direct, plain-spoken and specific. Sounds like a person, not a brand. No em dashes.",
  currentState:
    "LinkedIn page about 143 followers, recruiter-focused posts doing best, founder's personal posts get several times the reach of the page. Instagram about 52 followers, Facebook about 205, X about 2, YouTube about 5 subscribers with one Short at 429 views. Dormant channels mostly repost the same content.",
};
