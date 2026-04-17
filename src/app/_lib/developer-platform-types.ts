import type { TemplateKey } from "@/app/_lib/hosted-resume-types";
import type {
  ResumeAccentTone,
  ResumeContactStyle,
  ResumeDensity,
  ResumeHeaderAlignment,
  ResumePageSize,
  ResumeStylePreset,
} from "@/app/_lib/cv-markdown";

export type ProjectSummary = {
  createdAt: string;
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
};

export type ProjectApiKeyRecord = {
  createdAt: string;
  id: string;
  keyPrefix: string;
  label: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type ProjectBootstrapResponse = {
  apiKey: {
    key: string;
    keyPrefix: string;
    label: string;
  };
  project: ProjectSummary;
  webhookSecret: string;
};

export type ResumeStyleOverrideInput = Partial<{
  accentTone: ResumeAccentTone;
  contactStyle: ResumeContactStyle;
  density: ResumeDensity;
  headerAlignment: ResumeHeaderAlignment;
  pageMargin: number;
  pageSize: ResumePageSize;
  showHeaderDivider: boolean;
  showSectionDivider: boolean;
  stylePreset: ResumeStylePreset;
}>;

export type ResumeJsonContactInput = {
  href?: string;
  kind: "email" | "github" | "linkedin" | "location" | "phone" | "text" | "url" | "x";
  label?: string;
  value: string;
};

export type ResumeJsonSectionInput =
  | {
      paragraphs: string[];
      title?: string;
      type: "summary";
    }
  | {
      entries: Array<{
        bullets?: string[];
        meta_left?: string;
        meta_right?: string;
        paragraphs?: string[];
        title: string;
        title_extras?: string[];
      }>;
      title: string;
      type: "entries";
    }
  | {
      bullets: string[];
      title: string;
      type: "bullets";
    }
  | {
      groups: Array<{
        label: string;
        value: string;
      }>;
      title?: string;
      type: "skills";
    };

export type ResumeJsonInput = {
  contact?: ResumeJsonContactInput[];
  headline?: string;
  name: string;
  sections: ResumeJsonSectionInput[];
};

export type ValidationError = {
  code: string;
  message: string;
  path?: string;
};

export type ValidationWarning = {
  code: string;
  message: string;
  path?: string;
};

export type ValidateResumeRequest =
  | {
      input_format: "markdown";
      markdown: string;
      style_overrides?: ResumeStyleOverrideInput;
      template_key?: TemplateKey;
    }
  | {
      input_format: "json";
      resume: ResumeJsonInput;
      style?: ResumeStyleOverrideInput;
      template_key?: TemplateKey;
    };

export type ValidateResumeResponse = {
  errors: ValidationError[];
  inferred_template_key: TemplateKey | null;
  normalized_markdown?: string;
  valid: boolean;
  warnings: ValidationWarning[];
};

export type CreateResumeRequest =
  | {
      client_reference_id?: string;
      external_resume_id?: string;
      input_format: "markdown";
      markdown: string;
      return_edit_claim_url?: boolean;
      style_overrides?: ResumeStyleOverrideInput;
      template_key?: TemplateKey;
      title?: string;
      webhook_url?: string;
    }
  | {
      client_reference_id?: string;
      external_resume_id?: string;
      input_format: "json";
      resume: ResumeJsonInput;
      return_edit_claim_url?: boolean;
      style?: ResumeStyleOverrideInput;
      template_key?: TemplateKey;
      title?: string;
      webhook_url?: string;
    };

export type UpdateResumeRequest = CreateResumeRequest;

export type ApiResumeRecord = {
  client_reference_id: string | null;
  created_at: string;
  editor_claim_url?: string;
  external_resume_id: string | null;
  input_format: "json" | "markdown";
  markdown: string;
  pdf_url: string | null;
  public_url: string | null;
  published_at: string | null;
  resume_id: string;
  status: "draft" | "published";
  template_key: TemplateKey;
  title: string;
  updated_at: string;
};

export type PublishResumeRequest = {
  return_edit_claim_url?: boolean;
  webhook_url?: string;
};

export type CreatePdfJobRequest = {
  webhook_url?: string;
};

export type PdfJobStatus = "cancelled" | "completed" | "failed" | "processing" | "queued";

export type PdfJobResponse = {
  completed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  job_id: string;
  pdf_url: string | null;
  requested_at: string;
  resume_id: string;
  status: PdfJobStatus;
};

export type WebhookEventEnvelope = {
  created_at: string;
  data: Record<string, unknown>;
  id: string;
  project_id: string;
  type: "resume.created" | "resume.updated" | "resume.published" | "resume.pdf.failed" | "resume.pdf.ready";
};

export type ApiErrorShape = {
  error: {
    code: string;
    details?: Record<string, unknown>;
    message: string;
    request_id: string;
  };
};
