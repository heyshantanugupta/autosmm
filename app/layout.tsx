import type { Metadata, Viewport } from "next";
import "@fontsource-variable/google-sans-flex";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoSMM - Your Social Media Marketing Solution",
  description:
    "Turn a short brief into a social media strategy and post drafts you can edit and publish yourself. Free to try with your own API key.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
