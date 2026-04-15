export type TemplateKey = "engineer" | "designer" | "sales" | "founder";

export type HostedResumeSummary = {
  createdAt: string;
  id: string;
  isPublished: boolean;
  markdown: string;
  publishedAt: string | null;
  slug: string;
  templateKey: TemplateKey;
  title: string;
  updatedAt: string;
};

export type HostedResumeEditorRecord = HostedResumeSummary & {
  fitScale: number;
};

export type HostedResumePublicRecord = HostedResumeSummary & {
  fitScale: number;
};

export type WorkspaceResumeSummary = {
  id: string;
  isPublished: boolean;
  publishedAt: string | null;
  slug: string;
  templateKey: TemplateKey;
  title: string;
  updatedAt: string;
};

export type WorkspacePayload = {
  currentResumeId: string | null;
  resumes: WorkspaceResumeSummary[];
  workspaceId: string;
};

export type StudioBootstrapPayload = {
  editorPath: string | null;
  publicPath: string;
  resume: HostedResumeEditorRecord;
  workspace: WorkspacePayload;
};

export type HostedResumeResponse = {
  editorUrl: string | null;
  publicUrl: string;
  resume: HostedResumeEditorRecord;
  workspace: WorkspacePayload;
};
