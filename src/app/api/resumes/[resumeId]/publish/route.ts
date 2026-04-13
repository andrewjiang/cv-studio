import { NextResponse, type NextRequest } from "next/server";
import { publishHostedResume } from "@/app/_lib/hosted-resume-store";
import { buildResumeResponse, handleResumeStoreError, parseResumeMutationBody } from "@/app/api/resumes/_lib";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/resumes/[resumeId]/publish">,
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

    const resume = await publishHostedResume({
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
