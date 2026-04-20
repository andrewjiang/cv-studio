"use client";

import Link from "next/link";
import { authClient } from "@/app/_lib/auth-client";
import { UserMenu } from "./user-menu";

export function AppHeader({
  continueEditingHref,
  isAccountPage = false,
}: {
  continueEditingHref?: string | null;
  isAccountPage?: boolean;
}) {
  const { data: session, isPending } = authClient.useSession();
  const showSignedOutCta = !isAccountPage && !isPending && !session;
  const showSignedInEditorLink = !isAccountPage && Boolean(session && continueEditingHref);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[#fbf7f0]/80 backdrop-blur-md">
      <div className="mx-auto max-w-[108rem] px-5 py-3 sm:px-8 lg:px-12 flex items-center justify-between">
        <Link className="group flex items-center gap-2" href="/">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#065f46] text-white shadow-sm transition group-hover:scale-105">
            <span className="text-[0.65rem] font-bold tracking-tight">CV</span>
          </div>
          <p className="text-[0.85rem] font-bold uppercase tracking-[0.28em] text-slate-950">
            Tiny CV
          </p>
        </Link>

        <div className="flex items-center gap-5 sm:gap-8">
          <nav className="hidden items-center gap-7 text-[0.92rem] font-semibold text-slate-600 md:flex">
            <Link className="transition hover:text-slate-950" href="/#examples">
              Templates
            </Link>
            <Link className="transition hover:text-slate-950" href="/documentation">
              API
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {showSignedInEditorLink ? (
              <Link
                className="hidden text-[0.92rem] font-semibold text-slate-600 transition hover:text-slate-950 sm:inline-flex"
                href={continueEditingHref!}
              >
                Open editor
              </Link>
            ) : null}

            {showSignedOutCta ? (
              <Link
                className="hidden items-center justify-center rounded-full bg-[#065f46] px-5 py-2 text-[0.92rem] font-bold text-white shadow-[0_2px_8px_rgba(6,95,70,0.12)] transition hover:bg-[#044e34] hover:shadow-[0_4px_12px_rgba(6,95,70,0.2)] active:scale-[0.98] sm:inline-flex"
                href="/new"
              >
                Start writing
              </Link>
            ) : null}

            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
