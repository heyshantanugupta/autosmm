import type { Platform } from "@/lib/types";

/** Short monogram in the platform's colour. Not a logo: just a quick visual tag. */
const GLYPH: Record<Platform, string> = {
  linkedin: "in",
  instagram: "Ig",
  x: "X",
  facebook: "f",
  youtube: "Yt",
  tiktok: "Tk",
  reddit: "Re",
};

export default function PlatformMark({ platform, small }: { platform: Platform; small?: boolean }) {
  return (
    <span className={`pmark${small ? " sm" : ""}`} data-p={platform} aria-hidden="true">
      {GLYPH[platform]}
    </span>
  );
}
