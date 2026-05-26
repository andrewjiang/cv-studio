import { describe, expect, it } from "vitest";
import {
  getActivationEventNamesToDispatch,
  isActivationEventName,
  sanitizeActivationMetadata,
} from "@/app/_lib/activation-events";

describe("activation events", () => {
  it("recognizes the activation funnel event names", () => {
    expect(isActivationEventName("cta_click")).toBe(true);
    expect(isActivationEventName("template_select")).toBe(true);
    expect(isActivationEventName("cv_create_start")).toBe(true);
    expect(isActivationEventName("cv_save")).toBe(true);
    expect(isActivationEventName("cv_publish")).toBe(true);
    expect(isActivationEventName("template_selected")).toBe(true);
    expect(isActivationEventName("resume_published")).toBe(true);
    expect(isActivationEventName("account.sign_in")).toBe(false);
  });

  it("dispatches launch-critical aliases for the existing event spine", () => {
    expect(getActivationEventNamesToDispatch("template_selected")).toEqual([
      "template_selected",
      "template_select",
    ]);
    expect(getActivationEventNamesToDispatch("workspace_bootstrap_created")).toEqual([
      "workspace_bootstrap_created",
      "cv_create_start",
    ]);
    expect(getActivationEventNamesToDispatch("autosave_succeeded")).toEqual([
      "autosave_succeeded",
      "cv_save",
    ]);
    expect(getActivationEventNamesToDispatch("resume_published")).toEqual([
      "resume_published",
      "cv_publish",
    ]);
    expect(getActivationEventNamesToDispatch("cta_click")).toEqual(["cta_click"]);
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

  it("preserves UUID-shaped funnel identifiers", () => {
    expect(sanitizeActivationMetadata({
      anonymous_id: "550e8400-e29b-41d4-a716-446655440000",
      session_id: "8f14e45f-e2f7-4c20-9c91-2f7513b383f4",
      workspace_id: "c9bf9e57-1685-4c89-bafb-ff5af830be8a",
    })).toEqual({
      anonymous_id: "550e8400-e29b-41d4-a716-446655440000",
      session_id: "8f14e45f-e2f7-4c20-9c91-2f7513b383f4",
      workspace_id: "c9bf9e57-1685-4c89-bafb-ff5af830be8a",
    });
  });

  it("still drops public-slug-like token metadata", () => {
    expect(sanitizeActivationMetadata({
      utm_campaign: "avery-johnson-resume",
      utm_source: "AveryJohnsonResume",
    })).toEqual({});
  });

  it("drops long free-text metadata", () => {
    expect(sanitizeActivationMetadata({
      utm_campaign: "this is a long note with resume-like context that should never be analytics metadata",
    })).toEqual({});
  });
});
