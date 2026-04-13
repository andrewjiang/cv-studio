import { NextResponse, type NextRequest } from "next/server";
import {
  getHostedResumeForEdit,
  saveHostedResume,
} from "@/app/_lib/hosted-resume-store";
import { buildResumeResponse, handleResumeStoreError, parseResumeMutationBody } from "@/app/api/resumes/_lib";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/resumes/[resumeId]">,
) {
  try {
    const { resumeId } = await context.params;
    const editorToken = request.nextUrl.searchParams.get("token");

    if (!editorToken) {
      return NextResponse.json(
        { error: "Missing token query parameter." },
        { status: 400 },
      );
    }

    const resume = await getHostedResumeForEdit({ editorToken, resumeId });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    return NextResponse.json(buildResumeResponse(request, resume));
  } catch (error) {
    return handleResumeStoreError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/resumes/[resumeId]">,
) {
  try {
    const { resumeId } = await context.params;
    const body = parseResumeMutationBody(await request.json());

    if (!body || !body.editorToken) {
      return NextResponse.json(
        { error: "Expected markdown, fitScale, and editorToken in the request body." },
        { status: 400 },
      );
    }

    const resume = await saveHostedResume({
      editorToken: body.editorToken,
      fitScale: body.fitScale,
      markdown: body.markdown,
      resumeId,
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    return NextResponse.json(buildResumeResponse(request, resume));
  } catch (error) {
    return handleResumeStoreError(error);
  }
}
