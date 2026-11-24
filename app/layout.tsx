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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply a saved light or dark choice before the page paints, so it does not flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("autosmm-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
