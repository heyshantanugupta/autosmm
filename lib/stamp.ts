import type { Corner } from "./imagePrompt";

export interface StampLayout {
  logo: { x: number; y: number; w: number; h: number } | null;
  watermark: { x: number; y: number; align: "left" | "right"; size: number } | null;
}

/**
 * Where the logo and the watermark go on a picture of the given size. The logo is about 12% of the width
 * (never taller than 20% of the height). The watermark sits on the bottom edge, on the side away from the logo.
 */
export function stampLayout(
  size: { w: number; h: number },
  logoSize: { w: number; h: number } | null,
  corner: Corner,
  hasWatermark: boolean,
): StampLayout {
  const margin = Math.round(size.w * 0.03);
  let logo: StampLayout["logo"] = null;
  if (logoSize && logoSize.w > 0 && logoSize.h > 0) {
    const scale = Math.min((size.w * 0.12) / logoSize.w, (size.h * 0.2) / logoSize.h);
    const w = Math.round(logoSize.w * scale);
    const h = Math.round(logoSize.h * scale);
    const x = corner.h === "left" ? margin : corner.h === "center" ? Math.round((size.w - w) / 2) : size.w - margin - w;
    const y = corner.v === "top" ? margin : size.h - margin - h;
    logo = { x, y, w, h };
  }
  let watermark: StampLayout["watermark"] = null;
  if (hasWatermark) {
    const fontSize = Math.max(14, Math.round(size.w * 0.022));
    const logoAtBottomRight = Boolean(logo) && corner.v === "bottom" && corner.h === "right";
    watermark = logoAtBottomRight
      ? { x: margin, y: size.h - margin, align: "left", size: fontSize }
      : { x: size.w - margin, y: size.h - margin, align: "right", size: fontSize };
    if (logo && corner.v === "bottom" && corner.h !== "right") {
      watermark = { x: size.w - margin, y: size.h - margin, align: "right", size: fontSize };
    }
  }
  return { logo, watermark };
}
