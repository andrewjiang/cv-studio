import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

export const ACTIVATION_EVENT_NAMES = [
  "template_viewed",
  "template_selected",
  "workspace_bootstrap_created",
  "first_edit",
  "autosave_succeeded",
  "autosave_failed",
  "publish_clicked",
  "resume_published",
  "publish_failed",
  "share_link_copied",
  "pdf_download_clicked",
  "pdf_download_succeeded",
  "pdf_download_failed",
  "public_footer_create_clicked",
  "account_cta_clicked",
  "workspace_claimed",
  "returning_resume_opened",
] as const;

export type ActivationEventName = typeof ACTIVATION_EVENT_NAMES[number];

export type ActivationEventMetadata = {
  anonymous_id?: string;
  claimed_count?: number;
  error_code?: string;
  is_initial_template?: boolean;
  is_published?: boolean;
  mode?: string;
  provider?: string;
  referrer_host?: string;
  referrer_source?: string;
  result?: string;
  session_id?: string;
  source?: string;
  surface?: string;
  template_key?: TemplateKey;
  used_dedicated_pdf_view?: boolean;
  utm_campaign?: string;
  utm_medium?: string;
  utm_source?: string;
  workspace_id?: string;
};

const ACTIVATION_EVENT_NAME_SET = new Set<string>(ACTIVATION_EVENT_NAMES);
const ALLOWED_METADATA_KEYS = new Set<keyof ActivationEventMetadata>([
  "anonymous_id",
  "claimed_count",
  "error_code",
  "is_initial_template",
  "is_published",
  "mode",
  "provider",
  "referrer_host",
  "referrer_source",
  "result",
  "session_id",
  "source",
  "surface",
  "template_key",
  "used_dedicated_pdf_view",
  "utm_campaign",
  "utm_medium",
  "utm_source",
  "workspace_id",
]);

const TEMPLATE_KEYS = new Set<string>(["engineer", "designer", "founder", "sales"]);
const MAX_METADATA_STRING_LENGTH = 96;

export function isActivationEventName(value: unknown): value is ActivationEventName {
  return typeof value === "string" && ACTIVATION_EVENT_NAME_SET.has(value);
}

export function sanitizeActivationMetadata(value: unknown): ActivationEventMetadata {
  if (!isRecord(value)) {
    return {};
  }

  const sanitized: ActivationEventMetadata = {};

  for (const [key, rawValue] of Object.entries(value)) {
    if (!ALLOWED_METADATA_KEYS.has(key as keyof ActivationEventMetadata)) {
      continue;
    }

    const metadataKey = key as keyof ActivationEventMetadata;

    if (metadataKey === "template_key") {
      if (typeof rawValue === "string" && TEMPLATE_KEYS.has(rawValue)) {
        sanitized.template_key = rawValue as TemplateKey;
      }
      continue;
    }

    if (metadataKey === "claimed_count") {
      if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        sanitized.claimed_count = Math.max(0, Math.round(rawValue));
      }
      continue;
    }

    if (
      metadataKey === "is_initial_template" ||
      metadataKey === "is_published" ||
      metadataKey === "used_dedicated_pdf_view"
    ) {
      if (typeof rawValue === "boolean") {
        sanitized[metadataKey] = rawValue;
      }
      continue;
    }

    if (typeof rawValue === "string") {
      const cleanValue = sanitizeMetadataString(rawValue);

      if (cleanValue) {
        sanitized[metadataKey] = cleanValue as never;
      }
    }
  }

  return sanitized;
}

function sanitizeMetadataString(value: string) {
  return value
    .trim()
    .replace(/[^\w .:@-]/g, "_")
    .slice(0, MAX_METADATA_STRING_LENGTH);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
