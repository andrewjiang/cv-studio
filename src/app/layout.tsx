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
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const gaDebugMode = process.env.NEXT_PUBLIC_GA_DEBUG_MODE === "1";

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
      <body className="min-h-full flex flex-col">
        {gaMeasurementId ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            />
            <script
              id="google-analytics"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  window.gtag = gtag;
                  gtag('js', new Date());

                  (function trackTinyCvPageViews() {
                    var previousPath = null;

                    function currentPath() {
                      return window.location.pathname + window.location.search;
                    }

                    function sendPageView() {
                      var pagePath = currentPath();

                      if (previousPath === pagePath) {
                        return;
                      }

                      var eventParams = {
                        page_location: window.location.href,
                        page_path: pagePath,
                        page_title: document.title,
                        ${gaDebugMode ? "debug_mode: true," : ""}
                      };

                      gtag('config', ${JSON.stringify(gaMeasurementId)}, eventParams);
                      previousPath = pagePath;
                    }

                    function schedulePageView() {
                      window.setTimeout(sendPageView, 50);
                    }

                    var pushState = window.history.pushState;
                    var replaceState = window.history.replaceState;

                    window.history.pushState = function tinyCvPushState() {
                      var result = pushState.apply(this, arguments);
                      schedulePageView();
                      return result;
                    };

                    window.history.replaceState = function tinyCvReplaceState() {
                      var result = replaceState.apply(this, arguments);
                      schedulePageView();
                      return result;
                    };

                    window.addEventListener('popstate', schedulePageView);
                    sendPageView();
                  })();
                `,
              }}
            />
          </>
        ) : null}
        {children}
      </body>
    </html>
  );
}
