import type { Platform } from "./types";

/** Keep slugs safe for a URL: lowercase letters, digits, dashes and underscores only. */
export function cleanSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Builds the link with UTM tags, for example
 * https://example.com/?utm_source=linkedin&utm_medium=social&utm_campaign=li-founder-story
 * Returns null when there is no usable website or slug.
 */
export function trackedUrl(website: string, platform: Platform, slug: string): string | null {
  const campaign = cleanSlug(slug);
  const raw = website.trim();
  if (!raw || !campaign) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    url.searchParams.set("utm_source", platform);
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", campaign);
    return url.toString();
  } catch {
    return null;
  }
}

/** Where the link usually goes on each platform. These are common habits, not hard rules. */
export const LINK_PLACEMENT: Record<Platform, string> = {
  linkedin: "Put it at the end of the post, or paste it in the first comment right after you publish.",
  x: "Put it at the end of the post, or in a reply to your own post.",
  facebook: "Put it at the end of the post.",
  instagram: "Links in captions are not clickable. Put it in your bio link, or in a Story link sticker.",
  youtube: "Put it in the first line of the video description.",
  tiktok: "Links in captions are not clickable. Put it in your bio link.",
  reddit: "Only add it where the subreddit rules allow links. Many communities remove self-promotion.",
};
