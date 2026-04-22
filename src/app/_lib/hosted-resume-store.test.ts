import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  attachHostedResume,
  createWorkspaceBootstrap,
  getPublishedResumeBySlug,
  importLegacyWorkspaceDrafts,
  publishWorkspaceResume,
  renameWorkspaceResume,
  shouldRunHostedResumeRuntimeSchemaSync,
} from "@/app/_lib/hosted-resume-store";
import { FRIENDLY_RESUME_SLUG_PATTERN } from "@/app/_lib/resume-slugs";

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
    delete process.env.TINYCV_RUNTIME_SCHEMA_SYNC;
    await rm(tempDir, { force: true, recursive: true });
  });

  it("bootstraps a new workspace and first resume", async () => {
    const payload = await createWorkspaceBootstrap({ templateKey: "engineer" });

    expect(payload.workspace.workspaceId).toBeTruthy();
    expect(payload.workspace.currentResumeId).toBe(payload.resume.id);
    expect(payload.workspace.resumes).toHaveLength(1);
    expect(payload.resume.templateKey).toBe("engineer");
    expect(payload.resume.slug).toMatch(FRIENDLY_RESUME_SLUG_PATTERN);
    expect(payload.resume.slug).not.toContain("-");
    expect(payload.publicPath).toBe(`/${payload.resume.slug}`);
    expect(payload.editorPath).toContain(`/studio/${payload.resume.id}?token=`);
  });

  it("keeps the public slug stable when a resume is renamed", async () => {
    const payload = await createWorkspaceBootstrap({ templateKey: "designer" });
    const originalSlug = payload.resume.slug;

    const renamed = await renameWorkspaceResume({
      resumeId: payload.resume.id,
      title: "Jamie Lee Portfolio Resume",
      workspaceId: payload.workspace.workspaceId,
    });

    expect(renamed?.resume.title).toBe("Jamie Lee Portfolio Resume");
    expect(renamed?.resume.slug).toBe(originalSlug);
    expect(renamed?.publicPath).toBe(`/${originalSlug}`);
  });

  it("resolves published camel-case slugs case-insensitively", async () => {
    const payload = await createWorkspaceBootstrap({ templateKey: "founder" });

    await publishWorkspaceResume({
      fitScale: payload.resume.fitScale,
      markdown: payload.resume.markdown,
      resumeId: payload.resume.id,
      workspaceId: payload.workspace.workspaceId,
    });

    const publicResume = await getPublishedResumeBySlug(payload.resume.slug.toLowerCase());

    expect(publicResume?.id).toBe(payload.resume.id);
    expect(publicResume?.slug).toBe(payload.resume.slug);
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

  it("respects explicit hosted resume runtime schema sync configuration", () => {
    process.env.TINYCV_RUNTIME_SCHEMA_SYNC = "false";
    expect(shouldRunHostedResumeRuntimeSchemaSync()).toBe(false);

    process.env.TINYCV_RUNTIME_SCHEMA_SYNC = "true";
    expect(shouldRunHostedResumeRuntimeSchemaSync()).toBe(true);
  });
});
