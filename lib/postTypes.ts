import type { Platform } from "./types";

export interface PostType {
  id: string;
  label: string;
  description: string;
  /** Multi-part formats (threads, carousels, scripts) are not held to the single-post limit. */
  multiPart?: boolean;
  /** Needs real data or a real quote from the user. Drafts must not invent it. */
  needsRealProof?: boolean;
}

export interface PlatformInfo {
  label: string;
  /** Character limit for a single post, when one applies. */
  limit?: number;
  norms: string;
  postTypes: PostType[];
}

export const PLATFORM_INFO: Record<Platform, PlatformInfo> = {
  linkedin: {
    label: "LinkedIn",
    limit: 3000,
    norms:
      "First two lines decide whether people click 'see more'. Short paragraphs, one idea per post, personal voice beats brand voice. Put the link in the first comment or at the end, not the opening line.",
    postTypes: [
      { id: "founder-story", label: "Founder story", description: "First-person story about a real problem and why you built this." },
      { id: "myth-busting", label: "Myth-busting", description: "Challenge a common belief in your space, then give the better view." },
      { id: "how-to", label: "How-to / tips", description: "Practical steps the reader can use today, no product needed." },
      { id: "product-demo", label: "Product demo", description: "Show one feature doing one job. Pair with a screenshot or short video.", multiPart: true },
      { id: "data-insight", label: "Data insight", description: "A specific finding from real data you provided.", needsRealProof: true },
      { id: "customer-story", label: "Customer story", description: "A real user's outcome, in their own words.", needsRealProof: true },
      { id: "poll-question", label: "Poll or question", description: "A question that invites replies from your audience." },
      { id: "carousel-outline", label: "Carousel outline", description: "Slide-by-slide outline for a document post.", multiPart: true },
      { id: "announcement", label: "Feature announcement", description: "What is new, who it helps, how to try it." },
      { id: "text-post", label: "Plain post", description: "One idea in your own words, no special format." },
    ],
  },
  instagram: {
    label: "Instagram",
    limit: 2200,
    norms:
      "Visual first, caption supports it. Hook in the first line of the caption. Links do not work in captions, point to the bio link.",
    postTypes: [
      { id: "carousel", label: "Carousel", description: "5 to 8 slides teaching one thing.", multiPart: true },
      { id: "reel-script", label: "Reel script", description: "15 to 30 second script with on-screen text.", multiPart: true },
      { id: "single-image", label: "Single image + caption", description: "One strong visual and a short caption." },
      { id: "story-sequence", label: "Story sequence", description: "3 to 5 story frames with a poll or sticker.", multiPart: true },
      { id: "quote-card", label: "Quote card", description: "One sharp line designed as an image." },
    ],
  },
  x: {
    label: "X",
    limit: 280,
    norms:
      "Short and specific. One idea per post. Threads need a strong first post. Links reduce reach, put them in a reply when possible.",
    postTypes: [
      { id: "single-post", label: "Single post", description: "One idea in under 280 characters." },
      { id: "thread", label: "Thread", description: "5 to 8 connected posts. First post must stand alone.", multiPart: true },
      { id: "hot-take", label: "Opinion post", description: "A clear stance with a reason." },
      { id: "build-in-public", label: "Build in public", description: "A real update on what you shipped or learned." },
    ],
  },
  facebook: {
    label: "Facebook",
    norms:
      "Works best for community and groups. Conversational, a question at the end, minimal hashtags.",
    postTypes: [
      { id: "community-post", label: "Community post", description: "Helpful post for a page or group, written like a neighbor, not an ad." },
      { id: "short-update", label: "Short update", description: "Two or three sentences on something new." },
      { id: "question-post", label: "Question post", description: "A question that gets comments." },
      { id: "announcement", label: "Feature announcement", description: "What is new and how to try it." },
    ],
  },
  youtube: {
    label: "YouTube",
    norms:
      "Shorts need a hook in the first 2 seconds. Title and first line of the description matter most.",
    postTypes: [
      { id: "short-script", label: "Short (under 60s) script", description: "Hook, one point, one call to action, with on-screen text.", multiPart: true },
      { id: "tutorial-outline", label: "Tutorial outline", description: "Step-by-step outline for a longer how-to video.", multiPart: true },
      { id: "community-post", label: "Community post", description: "Short text or poll for subscribers." },
    ],
  },
  tiktok: {
    label: "TikTok",
    limit: 2200,
    norms:
      "Hook in the first second, native and unpolished beats produced. Caption is short, use 2 to 4 relevant hashtags.",
    postTypes: [
      { id: "talking-head", label: "Talking-head script", description: "One person to camera, one point, under 45 seconds.", multiPart: true },
      { id: "screen-demo", label: "Screen demo script", description: "Screen recording with voiceover.", multiPart: true },
      { id: "pov-skit", label: "POV / relatable skit", description: "Short relatable scenario for your audience.", multiPart: true },
    ],
  },
  reddit: {
    label: "Reddit",
    limit: 40000,
    norms:
      "Communities ban self-promotion quickly. Lead with value or a real question. Check each subreddit's rules. Never post identical copy in several subreddits. No link in the post unless the rules allow it.",
    postTypes: [
      { id: "discussion-question", label: "Discussion question", description: "A genuine question for the community, no product mention." },
      { id: "value-post", label: "Value post", description: "A useful write-up from experience, product mentioned only if rules allow." },
      { id: "show-and-tell", label: "Show and tell", description: "For subreddits that allow it: what you built and a request for feedback." },
      { id: "reply-template", label: "Comment reply", description: "A helpful reply to a question, with a light mention only if relevant." },
    ],
  },
};

export function getPostType(platform: Platform, id: string): PostType | undefined {
  return PLATFORM_INFO[platform].postTypes.find((p) => p.id === id);
}
