export type HostedResumeSummary = {
  createdAt: string;
  id: string;
  isPublished: boolean;
  markdown: string;
  publishedAt: string | null;
  slug: string;
  title: string;
  updatedAt: string;
};

export type HostedResumeEditorRecord = HostedResumeSummary & {
  editorToken: string;
  fitScale: number;
};

export type HostedResumePublicRecord = HostedResumeSummary & {
  fitScale: number;
};

export type HostedResumeResponse = {
  editorUrl: string;
  publicUrl: string;
  resume: HostedResumeEditorRecord;
};
