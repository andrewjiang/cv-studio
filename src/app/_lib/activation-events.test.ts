import { describe, expect, it } from "vitest";
import {
  isActivationEventName,
  sanitizeActivationMetadata,
} from "@/app/_lib/activation-events";

describe("activation events", () => {
  it("recognizes the activation funnel event names", () => {
    expect(isActivationEventName("template_selected")).toBe(true);
    expect(isActivationEventName("resume_published")).toBe(true);
    expect(isActivationEventName("account.sign_in")).toBe(false);
  });

  it("keeps only privacy-safe activation metadata keys", () => {
    expect(sanitizeActivationMetadata({
      email: "avery@example.com",
      full_url: "https://tiny.cv/private-slug",
      markdown: "# Avery",
      public_slug: "private-slug",
      session_id: "session-123",
      surface: "studio",
      template_key: "engineer",
      workspace_id: "workspace-123",
    })).toEqual({
      session_id: "session-123",
      surface: "studio",
      template_key: "engineer",
      workspace_id: "workspace-123",
    });
  });

  it("normalizes primitive metadata values", () => {
    expect(sanitizeActivationMetadata({
      claimed_count: 2.4,
      is_published: true,
      mode: "create-free_account!",
      template_key: "unsupported",
      used_dedicated_pdf_view: false,
    })).toEqual({
      claimed_count: 2,
      is_published: true,
      mode: "create-free_account",
      used_dedicated_pdf_view: false,
    });
  });

  it("drops unsafe string metadata values before analytics dispatch", () => {
    expect(sanitizeActivationMetadata({
      referrer_host: "jobs.example.com",
      source: "studio",
      utm_campaign: "SteadyBlueHeron",
      utm_medium: "https://tiny.cv/private",
      utm_source: "avery@example.com",
      workspace_id: "workspace/secret",
    })).toEqual({
      referrer_host: "jobs.example.com",
      source: "studio",
    });
  });

  it("drops long free-text metadata", () => {
    expect(sanitizeActivationMetadata({
      utm_campaign: "this is a long note with resume-like context that should never be analytics metadata",
    })).toEqual({});
  });
});
