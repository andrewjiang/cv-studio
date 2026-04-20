import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/_lib/auth";
import {
  claimTinyCvSubdomain,
  ResumeDomainConflictError,
  ResumeDomainForbiddenError,
  ResumeDomainNotFoundError,
  ResumeDomainValidationError,
} from "@/app/_lib/resume-domains";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Sign in before claiming a subdomain." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseSubdomainBody(body);

  if (!parsed) {
    return NextResponse.json(
      { error: "Expected subdomain and resumeId." },
      { status: 400 },
    );
  }

  try {
    const domain = await claimTinyCvSubdomain({
      resumeId: parsed.resumeId,
      subdomain: parsed.subdomain,
      userId: session.user.id,
    });

    return NextResponse.json(domain);
  } catch (error) {
    if (error instanceof ResumeDomainForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ResumeDomainNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error instanceof ResumeDomainConflictError ||
      error instanceof ResumeDomainValidationError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}

function parseSubdomainBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = body as Record<string, unknown>;

  if (typeof value.subdomain !== "string" || typeof value.resumeId !== "string") {
    return null;
  }

  return {
    resumeId: value.resumeId,
    subdomain: value.subdomain,
  };
}
