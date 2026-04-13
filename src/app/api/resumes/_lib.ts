import { NextResponse, type NextRequest } from "next/server";
import {
  HostedResumeStoreConnectionError,
  HostedResumeStoreUnavailableError,
} from "@/app/_lib/hosted-resume-store";
import type { HostedResumeEditorRecord, HostedResumeResponse } from "@/app/_lib/hosted-resume-types";

export function parseResumeMutationBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = body as Record<string, unknown>;

  if (typeof value.markdown !== "string") {
    return null;
  }

  return {
    editorToken: typeof value.editorToken === "string" ? value.editorToken : "",
    fitScale:
      typeof value.fitScale === "number" && Number.isFinite(value.fitScale)
        ? value.fitScale
        : 1,
    markdown: value.markdown,
  };
}

export function buildResumeResponse(
  request: NextRequest,
  resume: HostedResumeEditorRecord,
): HostedResumeResponse {
  const origin = request.nextUrl.origin;

  return {
    editorUrl: `${origin}/studio/${resume.id}?token=${encodeURIComponent(resume.editorToken)}`,
    publicUrl: `${origin}/${resume.slug}`,
    resume,
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
