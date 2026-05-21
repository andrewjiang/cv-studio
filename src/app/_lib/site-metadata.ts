export const TINYCV_APP_DESCRIPTION =
  "Write in markdown, preview on paper, publish a clean CV link, and export a PDF.";

export const TINYCV_SITE_NAME = "Tiny CV";
export const TINYCV_SOCIAL_CARD_PATH = "/og-image.png";

export function getTinyCvAppUrl() {
  return (
    process.env.TINYCV_APP_URL?.trim()
    || process.env.NEXT_PUBLIC_TINYCV_APP_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || "https://tiny.cv"
  );
}

export function getTinyCvSocialCardImage() {
  return {
    alt: "Tiny CV social preview card",
    height: 630,
    url: TINYCV_SOCIAL_CARD_PATH,
    width: 1200,
  } as const;
}
