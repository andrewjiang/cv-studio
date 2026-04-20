"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { CheckoutPlanKey } from "@/app/_lib/billing-core";
import { authClient } from "@/app/_lib/auth-client";
import {
  brandPrimaryButtonClass,
  brandSecondaryButtonClass,
} from "@/app/_components/button-classes";
import { CopyIcon } from "@/app/_components/icons";

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

      await recordAccountEvent(mode === "sign-up" ? "account.sign_up" : "account.sign_in");
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
    <div className="rounded-[2rem] border border-black/8 bg-white/82 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#065f46]">
          {mode === "sign-up" ? "Create account" : "Sign in"}
        </p>
        <h2 className="mt-3 text-[1.6rem] font-semibold tracking-[-0.04em] text-slate-950">
          {mode === "sign-up" ? "Start saving your resumes." : "Welcome back."}
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
          {mode === "sign-up"
            ? "Create an account to sync drafts, manage publishing, and keep every resume in one place."
            : "Sign in to access your drafts, published links, and billing settings."}
        </p>
      </div>

      <div className="mt-6 flex rounded-full border border-black/10 bg-[#f6f0e8] p-1 text-sm font-bold">
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

      {hasWorkspaceResumes ? (
        <div className="mt-5 rounded-[1.25rem] border border-[#065f46]/12 bg-[#ecf7f2] px-4 py-3">
          <p className="text-sm font-semibold leading-6 text-[#064e3b]">
            After sign in, Tiny CV will attach this browser&apos;s drafts to your account.
          </p>
        </div>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {mode === "sign-up" ? (
          <label className="block text-sm font-bold text-slate-700">
            Name
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-[#fcfaf6] px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#065f46] focus:bg-white"
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
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#fcfaf6] px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#065f46] focus:bg-white"
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
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#fcfaf6] px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#065f46] focus:bg-white"
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
          className={`${brandPrimaryButtonClass} w-full px-5 py-3.5 text-base`}
          disabled={pending}
          type="submit"
        >
          {pending ? "Working..." : mode === "sign-up" ? "Create account" : "Sign in"}
        </button>
      </form>

      {socialProviders.github || socialProviders.google ? (
        <div className="mt-6 space-y-3 border-t border-black/8 pt-6">
          <p className="text-center text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-400">
            Or continue with
          </p>
          {socialProviders.google ? (
            <button
              className={`${brandSecondaryButtonClass} w-full px-5 py-3 text-sm`}
              disabled={pending}
              onClick={() => handleSocialSignIn("google")}
              type="button"
            >
              Continue with Google
            </button>
          ) : null}
          {socialProviders.github ? (
            <button
              className={`${brandSecondaryButtonClass} w-full px-5 py-3 text-sm`}
              disabled={pending}
              onClick={() => handleSocialSignIn("github")}
              type="button"
            >
              Continue with GitHub
            </button>
          ) : null}
        </div>
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
            Attach the resumes from this browser to your account.
          </p>
        </div>
        <button
          className={`${brandPrimaryButtonClass} px-5 py-3 text-sm`}
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
      className={`${brandSecondaryButtonClass} px-5 py-3 text-sm`}
      disabled={pending}
      onClick={signOut}
      type="button"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

export function AccountBillingRefresh({
  active = false,
}: {
  active?: boolean;
}) {
  const router = useRouter();
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!active || refreshCount >= 4) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRefreshCount((current) => current + 1);
      router.refresh();
    }, refreshCount === 0 ? 1800 : 3500);

    return () => window.clearTimeout(timeout);
  }, [active, refreshCount, router]);

  return (
    <button
      className="rounded-full border border-[#065f46]/20 bg-white px-4 py-2 text-sm font-bold text-[#065f46] transition hover:bg-[#ecfdf5]"
      onClick={() => router.refresh()}
      type="button"
    >
      Refresh status
    </button>
  );
}

export function CopyAccountPublicLinkButton({
  className,
  label = "Copy link",
  publicUrl,
}: {
  className?: string;
  label?: string;
  publicUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const absoluteUrl = new URL(publicUrl, window.location.origin).toString();
    await navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      className={className ?? "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-50"}
      onClick={() => void copyLink()}
      type="button"
    >
      <CopyIcon className="h-4 w-4" />
      {copied ? "Copied" : label}
    </button>
  );
}

export function SetPrimaryResumeButton({
  isPrimary = false,
  resumeId,
}: {
  isPrimary?: boolean;
  resumeId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function setPrimary() {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/account/resumes/${resumeId}/primary`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || "Could not update primary resume.");
        return;
      }

      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (isPrimary) {
    return (
      <span className="rounded-full bg-[#065f46]/10 px-4 py-2.5 text-sm font-bold text-[#065f46]">
        Primary
      </span>
    );
  }

  return (
    <div>
      <button
        className="rounded-full border border-[#065f46]/20 bg-[#ecfdf5] px-4 py-2.5 text-sm font-bold text-[#065f46] transition hover:bg-[#dff7ec] disabled:cursor-not-allowed disabled:opacity-55"
        disabled={pending}
        onClick={() => void setPrimary()}
        type="button"
      >
        {pending ? "Updating..." : "Set as primary"}
      </button>
      {error ? (
        <p className="mt-2 max-w-xs text-sm font-semibold leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubdomainClaimForm({
  currentHostname,
  resumeId,
}: {
  currentHostname?: string | null;
  resumeId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [subdomain, setSubdomain] = useState(
    currentHostname ? currentHostname.replace(/\.tiny\.cv$/i, "") : "",
  );

  async function claimSubdomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/account/domains/subdomain", {
        body: JSON.stringify({
          resumeId,
          subdomain,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || "Could not claim that subdomain.");
        return;
      }

      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={(event) => void claimSubdomain(event)}>
      <label className="block text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-500">
        Tiny CV subdomain
      </label>
      <div className="flex overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm focus-within:border-[#065f46]/35">
        <input
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-300"
          onChange={(event) => setSubdomain(event.target.value)}
          placeholder="andrew"
          value={subdomain}
        />
        <span className="border-l border-black/8 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500">
          .tiny.cv
        </span>
      </div>
      {error ? (
        <p className="text-sm font-semibold leading-5 text-red-700">{error}</p>
      ) : null}
      <button
        className={`${brandPrimaryButtonClass} px-5 py-3 text-sm`}
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving..." : currentHostname ? "Update subdomain" : "Claim subdomain"}
      </button>
    </form>
  );
}

export function BillingCheckoutButton({
  children,
  disabled = false,
  disabledReason,
  planKey,
  variant = "primary",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
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
          ? `${brandPrimaryButtonClass} px-5 py-3 text-sm`
          : `${brandSecondaryButtonClass} px-5 py-3 text-sm`}
        disabled={pending || disabled}
        onClick={startCheckout}
        type="button"
      >
        {pending ? "Opening checkout..." : children}
      </button>
      {disabled && disabledReason ? (
        <p className="mt-2 max-w-xs text-sm font-semibold leading-5 text-slate-600">
          {disabledReason}
        </p>
      ) : null}
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
        className={`${brandSecondaryButtonClass} px-5 py-3 text-sm`}
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

async function recordAccountEvent(action: "account.sign_in" | "account.sign_up") {
  await fetch("/api/analytics/events", {
    body: JSON.stringify({
      action,
      metadata: {
        surface: "account_page",
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }).catch(() => null);
}
