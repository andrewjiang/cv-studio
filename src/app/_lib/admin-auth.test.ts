import { describe, expect, it } from "vitest";
import { getConfiguredAdminEmails, isAdminEmail } from "@/app/_lib/admin-auth";

describe("admin-auth", () => {
  it("normalizes configured admin emails", () => {
    expect([...getConfiguredAdminEmails(" Andrew@Tiny.CV, ops@example.com ,, ")]).toEqual([
      "andrew@tiny.cv",
      "ops@example.com",
    ]);
  });

  it("requires an exact allowlisted email", () => {
    expect(isAdminEmail("ANDREW@tiny.cv", "andrew@tiny.cv")).toBe(true);
    expect(isAdminEmail("andrew+admin@tiny.cv", "andrew@tiny.cv")).toBe(false);
    expect(isAdminEmail(null, "andrew@tiny.cv")).toBe(false);
  });
});
