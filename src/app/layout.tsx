import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Manrope,
  Newsreader,
  Source_Sans_3,
  Source_Serif_4,
} from "next/font/google";
import "./globals.css";

const uiSans = Source_Sans_3({
  variable: "--font-ui-sans",
  subsets: ["latin"],
});

const displaySerif = Source_Serif_4({
  variable: "--font-display-serif",
  subsets: ["latin"],
});

const uiSansAlt = Manrope({
  variable: "--font-ui-manrope",
  subsets: ["latin"],
});

const displaySerifAlt = Newsreader({
  variable: "--font-display-newsreader",
  subsets: ["latin"],
});

const uiSansTechnical = IBM_Plex_Sans({
  variable: "--font-ui-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const uiMono = IBM_Plex_Mono({
  variable: "--font-ui-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Tiny CV",
  description: "Markdown-first resume builder that always fits on one page.",
};

export const viewport: Viewport = {
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${uiSans.variable} ${displaySerif.variable} ${uiSansAlt.variable} ${displaySerifAlt.variable} ${uiSansTechnical.variable} ${uiMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
