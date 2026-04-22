import { afterEach, describe, expect, it, vi } from "vitest";

type QueryRecord = {
  text: string;
  values: unknown[];
};

function createMockSql({
  workspaceMembershipExists,
}: {
  workspaceMembershipExists: boolean;
}) {
  const queries: QueryRecord[] = [];
  const tx = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("$");
    queries.push({ text, values });

    if (text.includes("from workspace_resume_memberships")) {
      return Promise.resolve(workspaceMembershipExists ? [{ resume_id: values[1] }] : []);
    }

    return Promise.resolve([]);
  });
  const sql = {
    begin: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => {
      return await callback(tx);
    }),
  };

  return { queries, sql };
}

describe("account-store", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("attaches an active workspace resume to the signed-in account", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://tinycv.test/db");
    const mockSql = createMockSql({ workspaceMembershipExists: true });

    vi.doMock("postgres", () => ({
      default: vi.fn(() => mockSql.sql),
    }));

    const { attachWorkspaceResumeToUser } = await import("@/app/_lib/account-store");
    const attached = await attachWorkspaceResumeToUser({
      resumeId: "resume_123",
      userId: "user_123",
      workspaceId: "workspace_123",
    });

    expect(attached).toBe(true);
    expect(mockSql.queries.some((query) => query.text.includes("insert into user_resume_memberships"))).toBe(true);
    expect(mockSql.queries.some((query) => query.text.includes("insert into user_profiles"))).toBe(true);
  });

  it("does not attach a resume that is not active in the workspace", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://tinycv.test/db");
    const mockSql = createMockSql({ workspaceMembershipExists: false });

    vi.doMock("postgres", () => ({
      default: vi.fn(() => mockSql.sql),
    }));

    const { attachWorkspaceResumeToUser } = await import("@/app/_lib/account-store");
    const attached = await attachWorkspaceResumeToUser({
      resumeId: "resume_123",
      userId: "user_123",
      workspaceId: "workspace_123",
    });

    expect(attached).toBe(false);
    expect(mockSql.queries.some((query) => query.text.includes("insert into user_resume_memberships"))).toBe(false);
  });
});
