import "server-only";

import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

export const WORKSPACE_COOKIE_NAME = "tinycv_workspace";
export const WORKSPACE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export function getWorkspaceCookieOptions() {
  return {
    httpOnly: true,
    maxAge: WORKSPACE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function readWorkspaceCookie() {
  return (await cookies()).get(WORKSPACE_COOKIE_NAME)?.value ?? null;
}

export function readWorkspaceCookieFromRequest(request: NextRequest) {
  return request.cookies.get(WORKSPACE_COOKIE_NAME)?.value ?? null;
}

export function writeWorkspaceCookie(response: NextResponse, workspaceId: string) {
  response.cookies.set(WORKSPACE_COOKIE_NAME, workspaceId, getWorkspaceCookieOptions());
}

export function clearWorkspaceCookie(response: NextResponse) {
  response.cookies.set(WORKSPACE_COOKIE_NAME, "", {
    ...getWorkspaceCookieOptions(),
    maxAge: 0,
  });
}
