import { NextResponse, type NextRequest } from "next/server";
import { getProjectPdfArtifact } from "@/app/_lib/developer-platform-store";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/v1/pdf-jobs/[jobId]/file">,
) {
  const { jobId } = await context.params;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const expiresAt = request.nextUrl.searchParams.get("expires") ?? "";
  const artifact = await getProjectPdfArtifact({
    expiresAt,
    jobId,
    token,
  });

  if (!artifact) {
    return NextResponse.json({
      error: "PDF artifact not found.",
    }, { status: 404 });
  }

  const bytes = Uint8Array.from(artifact.content);

  return new NextResponse(new Blob([bytes.buffer], {
    type: artifact.contentType,
  }), {
    headers: {
      "Content-Disposition": `attachment; filename="${artifact.fileName}"`,
      "Content-Type": artifact.contentType,
    },
    status: 200,
  });
}
