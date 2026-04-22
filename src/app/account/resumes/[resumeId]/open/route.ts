import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/account/resumes/[resumeId]/open">,
) {
  const { resumeId } = await context.params;
  return NextResponse.redirect(new URL(`/cvs/${resumeId}/open`, request.url));
}
