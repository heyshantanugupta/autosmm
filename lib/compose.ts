import type { Platform } from "./types";

export interface ComposeTarget {
  url: string;
  /** True when the link fills in the post text itself. False means the user pastes it. */
  prefilled: boolean;
}

/**
 * Where to open each platform so the user can paste (or, for X, just review) the post.
 * The app never posts anything: it opens the page and the person presses Post.
 *
 * Only X documents a link that fills in the text. LinkedIn's share box accepts text through an
 * undocumented parameter that may change, so the post is always copied to the clipboard first too.
 */
export function composeTarget(platform: Platform, text: string): ComposeTarget {
  const enc = encodeURIComponent(text);
  switch (platform) {
    case "x":
      return text.length > 0 && text.length <= 280
        ? { url: `https://x.com/intent/tweet?text=${enc}`, prefilled: true }
        : { url: "https://x.com/compose/post", prefilled: false };
    case "linkedin":
      // Opens the "Start a post" box. Text is filled in when LinkedIn honours the parameter.
      return text.length <= 1800
        ? { url: `https://www.linkedin.com/feed/?shareActive=true&text=${enc}`, prefilled: false }
        : { url: "https://www.linkedin.com/feed/?shareActive=true", prefilled: false };
    case "facebook":
      return { url: "https://www.facebook.com/", prefilled: false };
    case "instagram":
      return { url: "https://www.instagram.com/", prefilled: false };
    case "youtube":
      return { url: "https://studio.youtube.com/", prefilled: false };
    case "tiktok":
      return { url: "https://www.tiktok.com/upload", prefilled: false };
    case "reddit":
      return { url: "https://www.reddit.com/submit", prefilled: false };
  }
}
