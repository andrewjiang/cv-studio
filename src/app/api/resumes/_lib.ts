import { NextResponse, type NextRequest } from "next/server";
import {
  HostedResumeStoreConnectionError,
  HostedResumeStoreUnavailableError,
} from "@/app/_lib/hosted-resume-store";
import type {
  HostedResumeResponse,
  StudioBootstrapPayload,
  TemplateKey,
} from "@/app/_lib/hosted-resume-types";

export function parseResumeMutationBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = body as Record<string, unknown>;

  if (typeof value.markdown !== "string") {
    return null;
  }

  return {
    fitScale:
      typeof value.fitScale === "number" && Number.isFinite(value.fitScale)
        ? value.fitScale
        : 1,
    markdown: value.markdown,
  };
}

export function parseTemplateCreateBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = body as Record<string, unknown>;

  if (!isTemplateKey(value.templateKey)) {
    return null;
  }

  return {
    markdown: typeof value.markdown === "string" && value.markdown.trim() ? value.markdown : undefined,
    templateKey: value.templateKey,
    title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : undefined,
  };
}

export function parseResumeRenameBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = body as Record<string, unknown>;

  if (typeof value.title !== "string" || !value.title.trim()) {
    return null;
  }

  return {
    title: value.title.trim(),
  };
}

export function parseAttachResumeBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = body as Record<string, unknown>;

  if (typeof value.token !== "string" || !value.token) {
    return null;
  }

  return {
    token: value.token,
  };
}

export function buildResumeResponse(
  request: NextRequest,
  payload: StudioBootstrapPayload,
): HostedResumeResponse {
  const origin = request.nextUrl.origin;

  return {
    editorUrl: payload.editorPath ? `${origin}${payload.editorPath}` : null,
    publicUrl: `${origin}${payload.publicPath}`,
    resume: payload.resume,
    workspace: payload.workspace,
  };
}

export function handleResumeStoreError(error: unknown) {
  if (error instanceof HostedResumeStoreUnavailableError) {
    return NextResponse.json(
      { error: error.message },
      { status: 503 },
    );
  }

  if (error instanceof HostedResumeStoreConnectionError) {
    return NextResponse.json(
      { error: error.message },
      { status: 503 },
    );
  }

  throw error;
}

function isTemplateKey(value: unknown): value is TemplateKey {
  return value === "engineer" || value === "designer" || value === "sales" || value === "founder";
}
