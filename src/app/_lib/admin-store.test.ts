import { afterEach, describe, expect, it, vi } from "vitest";

describe("admin-store", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("requires database-backed storage", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { AdminStoreUnavailableError, getAdminOverview } = await import("@/app/_lib/admin-store");

    await expect(getAdminOverview()).rejects.toBeInstanceOf(AdminStoreUnavailableError);
  });
});
