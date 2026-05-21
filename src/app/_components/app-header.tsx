"use client";

import Image from "next/image";
import Link from "next/link";
import { authClient } from "@/app/_lib/auth-client";
import { brandPrimaryButtonClass } from "./button-classes";
import { UserMenu } from "./user-menu";

export const appHeaderClass =
  "sticky top-0 z-50 border-b border-black/5 bg-[#fbf7f0]/80 backdrop-blur-md";

export const appHeaderInnerClass =
  "mx-auto flex h-16 max-w-[108rem] items-center justify-between px-5 sm:px-8 lg:px-12";

export function AppHeaderBrand({ className = "" }: { className?: string }) {
  return (
    <Link className={`group inline-flex min-h-11 items-center ${className}`} href="/">
      <Image
        alt="Tiny CV"
        className="h-8 w-auto transition group-hover:scale-[1.02]"
        height={130}
        priority
        src="/tinycv_logo.png"
        width={400}
      />
    </Link>
  );
}

export function AppHeader({
  continueEditingHref,
  isAccountPage = false,
}: {
  continueEditingHref?: string | null;
  isAccountPage?: boolean;
}) {
  const { data: session, isPending } = authClient.useSession();
  const showSignedOutCta = !isPending && !session;
  const showSignedInEditorLink = !isAccountPage && Boolean(session && continueEditingHref);

  return (
    <header className={appHeaderClass}>
      <div className={appHeaderInnerClass}>
        <AppHeaderBrand />

        <div className="flex items-center gap-6 sm:gap-10">
          <nav className="hidden items-center gap-6 text-[0.92rem] font-semibold text-slate-600 md:flex">
            <Link className="inline-flex min-h-11 items-center transition hover:text-slate-950" href="/templates">
              Templates
            </Link>
            <Link className="inline-flex min-h-11 items-center transition hover:text-slate-950" href="/documentation">
              API
            </Link>
          </nav>

          <div className="flex items-center gap-4 sm:gap-6">
            {showSignedInEditorLink ? (
              <Link
                className="hidden h-11 items-center whitespace-nowrap text-[0.92rem] font-semibold text-slate-600 transition hover:text-slate-950 sm:inline-flex"
                href={continueEditingHref!}
              >
                Open editor
              </Link>
            ) : null}

            <UserMenu />

            {showSignedOutCta ? (
              <Link
                className={`${brandPrimaryButtonClass} hidden h-11 px-5 text-[0.92rem] sm:inline-flex`}
                href="/new"
              >
                Start writing
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
