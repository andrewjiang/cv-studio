"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CheckoutPlanKey } from "@/app/_lib/billing-core";
import { authClient } from "@/app/_lib/auth-client";

export function AccountAuthPanel({
  hasWorkspaceResumes,
  socialProviders,
}: {
  hasWorkspaceResumes: boolean;
  socialProviders: {
    github: boolean;
    google: boolean;
  };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = mode === "sign-up"
        ? await authClient.signUp.email({
          email,
          name: name.trim() || email,
          password,
        })
        : await authClient.signIn.email({
          email,
          password,
          rememberMe: true,
        });

      if (result.error) {
        setError(result.error.message || "Authentication failed.");
        return;
      }

      await claimWorkspace();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleSocialSignIn(provider: "github" | "google") {
    setError(null);
    setPending(true);

    try {
      await authClient.signIn.social({
        callbackURL: "/account",
        provider,
      });
    } catch (caughtError) {
      setPending(false);
      setError(caughtError instanceof Error ? caughtError.message : "Social sign in failed.");
    }
  }

  return (
    <div className="rounded-[2rem] border border-black/8 bg-white/75 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex rounded-full border border-black/10 bg-[#f6f0e8] p-1 text-sm font-bold">
        <button
          className={`flex-1 rounded-full px-4 py-2 transition ${mode === "sign-in" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
          onClick={() => setMode("sign-in")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`flex-1 rounded-full px-4 py-2 transition ${mode === "sign-up" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
          onClick={() => setMode("sign-up")}
          type="button"
        >
          Create account
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {mode === "sign-up" ? (
          <label className="block text-sm font-bold text-slate-700">
            Name
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#065f46]"
              onChange={(event) => setName(event.target.value)}
              placeholder="Avery Brooks"
              type="text"
              value={name}
            />
          </label>
        ) : null}

        <label className="block text-sm font-bold text-slate-700">
          Email
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#065f46]"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Password
          <input
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#065f46]"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-full bg-[#065f46] px-5 py-3.5 text-base font-bold text-white transition hover:bg-[#044e3a] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={pending}
          type="submit"
        >
          {pending ? "Working..." : mode === "sign-up" ? "Create account" : "Sign in"}
        </button>
      </form>

      {socialProviders.github || socialProviders.google ? (
        <div className="mt-6 space-y-3 border-t border-black/8 pt-6">
          {socialProviders.google ? (
            <button
              className="w-full rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-50"
              disabled={pending}
              onClick={() => handleSocialSignIn("google")}
              type="button"
            >
              Continue with Google
            </button>
          ) : null}
          {socialProviders.github ? (
            <button
              className="w-full rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-50"
              disabled={pending}
              onClick={() => handleSocialSignIn("github")}
              type="button"
            >
              Continue with GitHub
            </button>
          ) : null}
        </div>
      ) : null}

      {hasWorkspaceResumes ? (
        <p className="mt-5 text-sm font-medium leading-6 text-slate-500">
          After sign in, Tiny CV will attach this browser&apos;s drafts to your account.
        </p>
      ) : null}
    </div>
  );
}

export function AccountClaimButton({
  hasWorkspaceResumes,
}: {
  hasWorkspaceResumes: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function claimWorkspace() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/claim-workspace", {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(payload.error || "Could not claim this workspace.");
        return;
      }

      setMessage(payload.claimedCount > 0
        ? `Added ${payload.claimedCount} resume${payload.claimedCount === 1 ? "" : "s"} to your account.`
        : "No unclaimed resumes found in this browser.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!hasWorkspaceResumes) {
    return null;
  }

  return (
    <div className="rounded-[1.5rem] border border-[#065f46]/15 bg-[#ecf7f2] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">Claim this browser&apos;s drafts</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Attach the resumes from this anonymous workspace to your account.
          </p>
        </div>
        <button
          className="rounded-full bg-[#065f46] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#044e3a] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={pending}
          onClick={claimWorkspace}
          type="button"
        >
          {pending ? "Claiming..." : "Claim drafts"}
        </button>
      </div>
      {message ? (
        <p className="mt-3 text-sm font-bold text-[#065f46]">{message}</p>
      ) : null}
    </div>
  );
}

export function AccountSignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.refresh();
  }

  return (
    <button
      className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
      disabled={pending}
      onClick={signOut}
      type="button"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

export function BillingCheckoutButton({
  children,
  planKey,
  variant = "primary",
}: {
  children: React.ReactNode;
  planKey: CheckoutPlanKey;
  variant?: "primary" | "secondary";
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function startCheckout() {
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/billing/checkout", {
        body: JSON.stringify({ planKey }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json().catch(() => ({})) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.checkoutUrl) {
        setError(payload.error || "Could not start checkout.");
        return;
      }

      window.location.href = payload.checkoutUrl;
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        className={variant === "primary"
          ? "rounded-full bg-[#065f46] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#044e3a] disabled:cursor-not-allowed disabled:opacity-55"
          : "rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"}
        disabled={pending}
        onClick={startCheckout}
        type="button"
      >
        {pending ? "Opening checkout..." : children}
      </button>
      {error ? (
        <p className="mt-2 max-w-xs text-sm font-semibold leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function BillingPortalButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function openPortal() {
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        portalUrl?: string;
      };

      if (!response.ok || !payload.portalUrl) {
        setError(payload.error || "Could not open billing portal.");
        return;
      }

      window.location.href = payload.portalUrl;
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
        disabled={pending}
        onClick={openPortal}
        type="button"
      >
        {pending ? "Opening billing..." : "Manage billing"}
      </button>
      {error ? (
        <p className="mt-2 max-w-xs text-sm font-semibold leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

async function claimWorkspace() {
  await fetch("/api/account/claim-workspace", {
    method: "POST",
  }).catch(() => null);
}
