import { NextResponse, type NextRequest } from "next/server";
import { createHostedResume } from "@/app/_lib/hosted-resume-store";
import { buildResumeResponse, handleResumeStoreError, parseResumeMutationBody } from "@/app/api/resumes/_lib";

export async function POST(request: NextRequest) {
  try {
    const body = parseResumeMutationBody(await request.json());

    if (!body) {
      return NextResponse.json(
        { error: "Expected markdown and fitScale in the request body." },
        { status: 400 },
      );
    }

    const resume = await createHostedResume({
      fitScale: body.fitScale,
      markdown: body.markdown,
    });

    return NextResponse.json(buildResumeResponse(request, resume), { status: 201 });
  } catch (error) {
    return handleResumeStoreError(error);
  }
}
