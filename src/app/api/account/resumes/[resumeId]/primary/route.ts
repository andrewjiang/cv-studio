import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/_lib/auth";
import {
  AccountResumeNotFoundError,
  AccountResumeValidationError,
  setPrimaryAccountResume,
} from "@/app/_lib/account-store";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/account/resumes/[resumeId]/primary">,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({
      error: "Sign in before choosing a primary resume.",
    }, { status: 401 });
  }

  const { resumeId } = await context.params;

  try {
    const result = await setPrimaryAccountResume({
      resumeId,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AccountResumeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof AccountResumeValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}

