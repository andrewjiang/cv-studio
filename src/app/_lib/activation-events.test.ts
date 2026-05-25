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
      mode: "create/free account!",
      template_key: "unsupported",
      used_dedicated_pdf_view: false,
    })).toEqual({
      claimed_count: 2,
      is_published: true,
      mode: "create_free account_",
      used_dedicated_pdf_view: false,
    });
  });
});
