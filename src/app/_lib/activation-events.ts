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
const MAX_ENUM_METADATA_STRING_LENGTH = 64;
const IDENTIFIER_METADATA_KEYS = new Set<keyof ActivationEventMetadata>([
  "anonymous_id",
  "session_id",
  "workspace_id",
]);
const TOKEN_METADATA_KEYS = new Set<keyof ActivationEventMetadata>([
  "error_code",
  "mode",
  "provider",
  "referrer_source",
  "result",
  "source",
  "surface",
  "utm_campaign",
  "utm_medium",
  "utm_source",
]);
const EMAIL_LIKE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const URL_LIKE_PATTERN = /\b(?:https?:\/\/|www\.|[a-z][a-z0-9+.-]*:\/\/)\S+/i;
const PUBLIC_SLUG_LIKE_PATTERN = /^(?:(?:[A-Z][a-z]+){2,5}|[A-Za-z0-9]+(?:-[A-Za-z0-9]+){2,})$/;

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
      const cleanValue = sanitizeMetadataString(metadataKey, rawValue);

      if (cleanValue) {
        sanitized[metadataKey] = cleanValue as never;
      }
    }
  }

  return sanitized;
}

function sanitizeMetadataString(key: keyof ActivationEventMetadata, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (IDENTIFIER_METADATA_KEYS.has(key)) {
    return isSafeMetadataIdentifier(trimmed) ? trimmed : undefined;
  }

  if (containsUnsafeAnalyticsValue(trimmed)) {
    return undefined;
  }

  if (key === "referrer_host") {
    const host = trimmed.toLowerCase();
    return /^[a-z0-9.-]+(?::[0-9]{1,5})?$/.test(host) && !host.includes("..")
      ? host.slice(0, MAX_METADATA_STRING_LENGTH)
      : undefined;
  }

  if (TOKEN_METADATA_KEYS.has(key)) {
    const normalized = trimmed
      .toLowerCase()
      .replace(/[\s.]+/g, "_")
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, MAX_ENUM_METADATA_STRING_LENGTH);

    return /[a-z0-9]/.test(normalized) ? normalized : undefined;
  }

  return undefined;
}

function isSafeMetadataIdentifier(value: string) {
  if (
    value.length > MAX_METADATA_STRING_LENGTH ||
    value.includes("@") ||
    /\s/.test(value) ||
    EMAIL_LIKE_PATTERN.test(value) ||
    URL_LIKE_PATTERN.test(value) ||
    /[/?#\\]/.test(value)
  ) {
    return false;
  }

  return /^[A-Za-z0-9_-]{1,96}$/.test(value);
}

function containsUnsafeAnalyticsValue(value: string) {
  if (
    value.length > MAX_METADATA_STRING_LENGTH ||
    value.includes("@") ||
    /\s/.test(value) ||
    EMAIL_LIKE_PATTERN.test(value) ||
    URL_LIKE_PATTERN.test(value) ||
    PUBLIC_SLUG_LIKE_PATTERN.test(value) ||
    /[/?#\\]/.test(value)
  ) {
    return true;
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
