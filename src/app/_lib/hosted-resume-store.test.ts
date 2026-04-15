import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  attachHostedResume,
  createWorkspaceBootstrap,
  importLegacyWorkspaceDrafts,
} from "@/app/_lib/hosted-resume-store";

describe("hosted-resume-store", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "tinycv-store-"));
    process.env.HOSTED_RESUME_LOCAL_STORE_PATH = path.join(tempDir, "store.json");
    delete process.env.DATABASE_URL;
    delete process.env.VERCEL;
  });

  afterEach(async () => {
    delete process.env.HOSTED_RESUME_LOCAL_STORE_PATH;
    await rm(tempDir, { force: true, recursive: true });
  });

  it("bootstraps a new workspace and first resume", async () => {
    const payload = await createWorkspaceBootstrap({ templateKey: "engineer" });

    expect(payload.workspace.workspaceId).toBeTruthy();
    expect(payload.workspace.currentResumeId).toBe(payload.resume.id);
    expect(payload.workspace.resumes).toHaveLength(1);
    expect(payload.resume.templateKey).toBe("engineer");
    expect(payload.editorPath).toContain(`/studio/${payload.resume.id}?token=`);
  });

  it("dedupes identical legacy drafts inside one workspace", async () => {
    const payload = await importLegacyWorkspaceDrafts({
      activeDraftName: "Primary CV",
      drafts: [
        {
          markdown: "# Jordan Reyes\nFounder",
          name: "Primary CV",
          updatedAt: "2026-04-14T00:00:00.000Z",
        },
        {
          markdown: "# Jordan Reyes\nFounder",
          name: "Primary CV",
          updatedAt: "2026-04-14T00:00:00.000Z",
        },
      ],
    });

    expect(payload.workspace.resumes).toHaveLength(1);
    expect(payload.currentResumeId).toBe(payload.workspace.resumes[0]?.id ?? null);
  });

  it("attaches an edit-link resume into a fresh workspace", async () => {
    const bootstrap = await createWorkspaceBootstrap({ templateKey: "founder" });
    const token = new URL(bootstrap.editorPath!, "http://localhost").searchParams.get("token");

    expect(token).toBeTruthy();

    const attached = await attachHostedResume({
      resumeId: bootstrap.resume.id,
      token: token!,
    });

    expect(attached).not.toBeNull();
    expect(attached?.resume.id).toBe(bootstrap.resume.id);
    expect(attached?.workspace.workspaceId).not.toBe(bootstrap.workspace.workspaceId);
    expect(attached?.workspace.currentResumeId).toBe(bootstrap.resume.id);
  });
});
