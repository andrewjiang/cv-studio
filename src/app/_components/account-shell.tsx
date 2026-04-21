import type { ReactNode } from "react";
import { AppHeader } from "@/app/_components/app-header";

export function AccountShell({
  children,
  currentEditorHref,
}: {
  children: ReactNode;
  currentEditorHref: string | null;
}) {
  return (
    <main className="app-shell min-h-screen bg-[#f7f3ec] text-slate-900">
      <AppHeader continueEditingHref={currentEditorHref} isAccountPage />

      <div className="mx-auto w-full max-w-[108rem] px-4 py-5 sm:px-5 lg:px-8 lg:py-7">
        {children}
      </div>
    </main>
  );
}
