import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Manrope,
  Newsreader,
  Source_Sans_3,
  Source_Serif_4,
} from "next/font/google";
import {
  getTinyCvAppUrl,
  getTinyCvSocialCardImage,
  TINYCV_APP_DESCRIPTION,
  TINYCV_SITE_NAME,
} from "@/app/_lib/site-metadata";
import "./globals.css";

const appDescription = TINYCV_APP_DESCRIPTION;
const appUrl = getTinyCvAppUrl();
const socialCardImage = getTinyCvSocialCardImage();

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
  alternates: {
    canonical: "/",
  },
  applicationName: TINYCV_SITE_NAME,
  authors: [{ name: TINYCV_SITE_NAME }],
  category: "productivity",
  creator: TINYCV_SITE_NAME,
  description: appDescription,
  keywords: [
    "resume builder",
    "CV builder",
    "markdown resume",
    "one page resume",
    "resume hosting",
    "Tiny CV",
  ],
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(appUrl),
  openGraph: {
    description: appDescription,
    images: [socialCardImage],
    locale: "en_US",
    siteName: TINYCV_SITE_NAME,
    title: "Tiny CV - The resume builder that stays on one page.",
    type: "website",
    url: "/",
  },
  publisher: TINYCV_SITE_NAME,
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  title: {
    default: "Tiny CV - The resume builder that stays on one page",
    template: "%s | Tiny CV",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@andrewjiang",
    description: appDescription,
    images: [socialCardImage],
    site: "@andrewjiang",
    title: "Tiny CV - The resume builder that stays on one page.",
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: "#065f46",
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
