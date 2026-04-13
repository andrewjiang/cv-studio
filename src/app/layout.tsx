import type { Metadata } from "next";
import { IBM_Plex_Mono, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const uiSans = Source_Sans_3({
  variable: "--font-ui-sans",
  subsets: ["latin"],
});

const displaySerif = Source_Serif_4({
  variable: "--font-display-serif",
  subsets: ["latin"],
});

const uiMono = IBM_Plex_Mono({
  variable: "--font-ui-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "CV Studio",
  description: "Markdown-first resume editor with one-page preview and PDF export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${uiSans.variable} ${displaySerif.variable} ${uiMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
