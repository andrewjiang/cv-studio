"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function EditClaimConsumeBridge({
  claimId,
  token,
}: {
  claimId: string;
  token: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("Opening this Tiny CV draft in your workspace...");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/v1/edit-claims/${claimId}/consume`, {
          body: JSON.stringify({ token }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const payload = await response.json() as { cleanEditorUrl?: string; error?: { message?: string } };

        if (!response.ok || !payload.cleanEditorUrl) {
          throw new Error(payload.error?.message ?? "Unable to open this edit link.");
        }

        if (!cancelled) {
          router.replace(payload.cleanEditorUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Unable to open this edit link.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [claimId, router, token]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f4efe8_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-black/8 bg-white/88 p-8 text-center shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <p className="text-[1rem] leading-none font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">
            TINY CV
          </p>
          <p className="mt-4 text-[1.02rem] leading-7 text-slate-600">
            {message}
          </p>
        </div>
      </div>
    </main>
  );
}
