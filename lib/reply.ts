import type { Intake } from "./types";

export type MessageKind = "question" | "praise" | "complaint" | "other";

const COMPLAINT = /\b(refund|broken|terrible|worst|scam|rip.?off|not working|doesn'?t work|does not work|disappointed|angry|cancel|waste|useless|bug|awful|horrible|never again|unacceptable|charged)\b/i;
const PRAISE = /\b(love|great|awesome|amazing|thanks|thank you|helpful|congrats|congratulations|brilliant|fantastic|excellent)\b/i;
const QUESTION = /\?|^\s*(how|what|when|where|why|can|could|does|do|is|are|will|which)\b/i;

/** A rough sort used for the demo replies and to flag messages that need a careful human answer. */
export function classifyMessage(text: string): MessageKind {
  if (COMPLAINT.test(text)) return "complaint";
  if (QUESTION.test(text)) return "question";
  if (PRAISE.test(text)) return "praise";
  return "other";
}

export function demoReviewReplies(intake: Intake): { label: string; text: string }[] {
  const name = intake.productName || "us";
  return [
    { label: "Calm and short", text: "Thank you for telling us. We are sorry this was not a good experience. Please message us the details so we can look into it." },
    { label: "Acknowledge and move offline", text: `Thank you for the honest feedback. That is not what we want anyone to feel about ${name}. We would like to understand what happened, so please send us a direct message and we will follow up.` },
    { label: "Helpful", text: "We are sorry about this and we are taking it seriously. Please send us a direct message with what happened and when, and we will come back to you with next steps." },
  ];
}

export function demoReplies(kind: MessageKind, intake: Intake): { label: string; text: string }[] {
  const name = intake.productName || "us";
  const by: Record<MessageKind, [string, string, string]> = {
    praise: ["Thank you, that means a lot.", `Thanks so much for saying that. We are glad ${name} is useful to you.`, "Really appreciate it. If there is anything you would like us to cover next, tell us."],
    question: ["Good question. Here is the short answer:", `Thanks for asking. Here is how it works with ${name}:`, "Happy to help. Could you tell us a bit more about what you are trying to do?"],
    complaint: ["We are sorry about this. Can you send us a message so we can fix it?", `Thank you for telling us. That is not the experience we want anyone to have with ${name}. Please message us the details and we will look into it.`, "Sorry to hear that. We would like to make it right. Please send us a direct message."],
    other: ["Thanks for the comment.", `Thanks for taking the time to write. We appreciate it.`, "Thank you. Let us know if you have any questions."],
  };
  return ["Short", "Friendly", "Helpful"].map((label, i) => ({ label, text: by[kind][i] }));
}
