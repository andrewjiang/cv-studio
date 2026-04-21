import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAccountDeveloperApiKey } from "@/app/_lib/account-developer-store";
import { auth } from "@/app/_lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({
      error: "Sign in before creating an API key.",
    }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const label = typeof body.label === "string" ? body.label : undefined;
    const payload = await createAccountDeveloperApiKey({
      label,
      userId: session.user.id,
      userName: session.user.name,
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not create API key.",
    }, { status: 500 });
  }
}
