import { describe, expect, it } from "vitest";
import { getWebhookRetryDelaySeconds } from "@/app/_lib/developer-platform-store";

describe("developer-platform-store", () => {
  it("backs webhook retries off exponentially with a cap", () => {
    expect(getWebhookRetryDelaySeconds(1)).toBe(300);
    expect(getWebhookRetryDelaySeconds(2)).toBe(600);
    expect(getWebhookRetryDelaySeconds(3)).toBe(1200);
    expect(getWebhookRetryDelaySeconds(20)).toBe(21_600);
  });
});
