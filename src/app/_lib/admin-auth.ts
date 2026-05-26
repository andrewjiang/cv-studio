import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth, type TinyCvAuthSession } from "@/app/_lib/auth";

export type TinyCvAdminSession = NonNullable<TinyCvAuthSession> & {
  user: NonNullable<NonNullable<TinyCvAuthSession>["user"]>;
};

export function getConfiguredAdminEmails(value = process.env.TINYCV_ADMIN_EMAILS) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined, value = process.env.TINYCV_ADMIN_EMAILS) {
  if (!email) {
    return false;
  }

  return getConfiguredAdminEmails(value).has(email.trim().toLowerCase());
}

export async function requireAdminSession(): Promise<TinyCvAdminSession> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/account");
  }

  if (!isAdminEmail(session.user.email)) {
    notFound();
  }

  return session as TinyCvAdminSession;
}
