"use client";

import Link from "next/link";
import Script from "next/script";
import { brandPrimaryButtonClass } from "@/app/_components/button-classes";
import { ArrowRightIcon } from "@/app/_components/icons";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildCurlExample,
  buildNodeExample,
  buildPythonExample,
  type DeveloperEndpointDoc,
} from "@/app/_lib/developer-platform-docs";
import type { ApiErrorShape, ProjectBootstrapResponse } from "@/app/_lib/developer-platform-types";

type ResourceLink = {
  href: string;
  label: string;
  note: string;
};

type ThemeMode = "dark" | "light";

type NavItem = {
  id: string;
  label: string;
  tone?: "default" | "subtle";
};

type CodeTab = {
  key: "curl" | "node" | "python";
  label: string;
  value: string;
};

const THEME_STORAGE_KEY = "tinycv:developer-docs-theme";
const DEFAULT_ENDPOINT_SLUG = "create-resume";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TINYCV_TURNSTILE_SITE_KEY ?? "";

declare global {
  interface Window {
    turnstile?: {
      remove?: (widgetId: string | number) => void;
      render: (
        container: HTMLElement,
        options: {
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          sitekey: string;
          theme?: "dark" | "light";
        },
      ) => string | number;
      reset?: (widgetId?: string | number) => void;
    };
  }
}

const TOP_TABS = [
  { id: "quickstart", key: "docs", label: "Docs" },
  { id: "api-reference", key: "api", label: "API" },
  { id: "quickstart", key: "guides", label: "Guides" },
  { id: "resources", key: "resources", label: "Resources" },
] as const;

const CATEGORY_TITLES: Record<DeveloperEndpointDoc["category"], string> = {
  Agent: "Agent and MCP",
  Core: "Draft and publish",
  Export: "Artifacts and handoff",
  "Getting Started": "Getting started",
  Reference: "Reference",
};

const CATEGORY_DESCRIPTIONS: Record<DeveloperEndpointDoc["category"], string> = {
  Agent: "Bearer-token project integrations and no-account paid Agent Finish calls.",
  Core: "Validate input, create drafts, update them, and publish public URLs.",
  Export: "Artifacts, claim links, and export-related flows.",
  "Getting Started": "Start in the docs for self-serve access, or use the protected bootstrap flow for managed provisioning.",
  Reference: "Templates, schema discovery, and machine-readable docs.",
};

export function DeveloperDocsClient({
  endpointDocs,
  markdownGuide,
  agentCookbook,
  resources,
}: {
  agentCookbook: string;
  endpointDocs: DeveloperEndpointDoc[];
  markdownGuide: string;
  resources: ResourceLink[];
}) {
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | number | null>(null);

  const [activeSectionId, setActiveSectionId] = useState("quickstart");
  const [selectedEndpointSlug, setSelectedEndpointSlug] = useState(DEFAULT_ENDPOINT_SLUG);
  const [apiKey, setApiKey] = useState("");
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [responseState, setResponseState] = useState<{
    body: string;
    ok: boolean;
    status: string;
  } | null>(null);
  const [selfServeName, setSelfServeName] = useState("");
  const [selfServeSlug, setSelfServeSlug] = useState("");
  const [selfServeApiKeyLabel, setSelfServeApiKeyLabel] = useState("");
  const [selfServeCaptchaToken, setSelfServeCaptchaToken] = useState("");
  const [selfServeError, setSelfServeError] = useState<string | null>(null);
  const [selfServeResult, setSelfServeResult] = useState<ProjectBootstrapResponse | null>(null);
  const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<ThemeMode>("light");

  const isDark = theme === "dark";
  const isTurnstileEnabled = TURNSTILE_SITE_KEY.length > 0;
  const allowCaptchaBypass = !isTurnstileEnabled && process.env.NODE_ENV !== "production";

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!isTurnstileEnabled) {
      setSelfServeCaptchaToken("");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const cleanupWidget = () => {
      if (window.turnstile && turnstileWidgetIdRef.current !== null && typeof window.turnstile.remove === "function") {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {
          // Ignore cleanup errors from third-party widget teardown.
        }
      }

      turnstileWidgetIdRef.current = null;
      setSelfServeCaptchaToken("");
    };

    const renderWidget = () => {
      if (
        cancelled ||
        !turnstileContainerRef.current ||
        !window.turnstile ||
        turnstileWidgetIdRef.current !== null
      ) {
        return false;
      }

      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        callback: (token) => {
          setSelfServeCaptchaToken(token);
          setSelfServeError(null);
        },
        "error-callback": () => {
          setSelfServeCaptchaToken("");
          setSelfServeError("CAPTCHA failed to load. Please refresh and try again.");
        },
        "expired-callback": () => {
          setSelfServeCaptchaToken("");
        },
        sitekey: TURNSTILE_SITE_KEY,
        theme: isDark ? "dark" : "light",
      });

      return true;
    };

    cleanupWidget();

    if (!renderWidget()) {
      intervalId = window.setInterval(() => {
        if (renderWidget() && intervalId !== null) {
          window.clearInterval(intervalId);
        }
      }, 250);
    }

    return () => {
      cancelled = true;

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      cleanupWidget();
    };
  }, [isDark, isTurnstileEnabled]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredEndpointDocs = useMemo(() => {
    if (!normalizedSearch) {
      return endpointDocs;
    }

    return endpointDocs.filter((endpoint) => {
      const haystack = [
        endpoint.summary,
        endpoint.description,
        endpoint.method,
        endpoint.path,
        endpoint.category,
        endpoint.auth,
      ].join(" ").toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [endpointDocs, normalizedSearch]);

  const filteredResources = useMemo(() => {
    if (!normalizedSearch) {
      return resources;
    }

    return resources.filter((resource) =>
      `${resource.label} ${resource.note} ${resource.href}`.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch, resources]);

  const groupedEndpoints = useMemo(() => {
    return filteredEndpointDocs.reduce<Record<string, DeveloperEndpointDoc[]>>((accumulator, endpoint) => {
      accumulator[endpoint.category] ??= [];
      accumulator[endpoint.category].push(endpoint);
      return accumulator;
    }, {});
  }, [filteredEndpointDocs]);

  const selectedEndpoint = (
    endpointDocs.find((endpoint) => endpoint.slug === selectedEndpointSlug) ??
    endpointDocs.find((endpoint) => endpoint.slug === DEFAULT_ENDPOINT_SLUG) ??
    endpointDocs[0]
  )!;

  useEffect(() => {
    const nextPathValues = Object.fromEntries(
      (selectedEndpoint.pathParams ?? []).map((param) => [param.key, param.placeholder]),
    );

    startTransition(() => {
      setPathValues(nextPathValues);
      setRequestBody(selectedEndpoint.exampleRequestBody
        ? JSON.stringify(selectedEndpoint.exampleRequestBody, null, 2)
        : "");
      setResponseState(null);
      setIdempotencyKey(selectedEndpoint.idempotent ? safeRandomId() : "");
    });
  }, [selectedEndpoint]);

  const quickstartEndpoint = endpointDocs.find((endpoint) => endpoint.slug === "create-resume") ?? endpointDocs[0];
  const quickstartTabs: CodeTab[] = useMemo(() => [
    {
      key: "node",
      label: "Node.js",
      value: buildNodeExample(quickstartEndpoint),
    },
    {
      key: "python",
      label: "Python",
      value: buildPythonExample(quickstartEndpoint),
    },
    {
      key: "curl",
      label: "cURL",
      value: buildCurlExample(quickstartEndpoint),
    },
  ], [quickstartEndpoint]);

  const visibleSectionIds = useMemo(() => [
    "quickstart",
    "overview",
    "playground",
    "api-reference",
    ...filteredEndpointDocs.map((endpoint) => endpoint.slug),
    "resources",
  ], [filteredEndpointDocs]);

  useEffect(() => {
    const root = mainScrollRef.current;

    if (!root) {
      return;
    }

    const computeActiveSection = () => {
      const rootRect = root.getBoundingClientRect();
      const anchorLine = rootRect.top + 140;
      let nextActive = visibleSectionIds[0] ?? "overview";

      for (const id of visibleSectionIds) {
        const element = document.getElementById(id);

        if (!element) {
          continue;
        }

        const rect = element.getBoundingClientRect();

        if (rect.top <= anchorLine) {
          nextActive = id;
          continue;
        }

        break;
      }

      setActiveSectionId(nextActive);
    };

    const observer = new IntersectionObserver(
      () => computeActiveSection(),
      {
        root,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.15, 0.35, 0.65],
      },
    );

    for (const id of visibleSectionIds) {
      const element = document.getElementById(id);

      if (element) {
        observer.observe(element);
      }
    }

    root.addEventListener("scroll", computeActiveSection, { passive: true });
    computeActiveSection();

    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", computeActiveSection);
    };
  }, [visibleSectionIds]);

  const topTabKey = useMemo(() => {
    if (activeSectionId === "resources") {
      return "resources";
    }

    if (activeSectionId === "quickstart" || activeSectionId === "overview" || activeSectionId === "playground") {
      return "docs";
    }

    return "api";
  }, [activeSectionId]);

  const searchResultSummary = useMemo(() => {
    if (!normalizedSearch) {
      return null;
    }

    if (filteredEndpointDocs.length === 0 && filteredResources.length === 0) {
      return `No docs match "${search.trim()}".`;
    }

    return `Showing ${filteredEndpointDocs.length} endpoint${filteredEndpointDocs.length === 1 ? "" : "s"} and ${filteredResources.length} resource${filteredResources.length === 1 ? "" : "s"}.`;
  }, [filteredEndpointDocs.length, filteredResources.length, normalizedSearch, search]);

  const topLevelNavItems: NavItem[] = [
    { id: "quickstart", label: "Quickstart" },
    { id: "overview", label: "Overview" },
    { id: "api-reference", label: "API" },
    { id: "resources", label: "Resources" },
  ];

  const tocItems: NavItem[] = [
    { id: "quickstart", label: "Quickstart" },
    { id: "overview", label: "Overview" },
    { id: "playground", label: "Playground", tone: "subtle" },
    ...filteredEndpointDocs.map((endpoint) => ({
      id: endpoint.slug,
      label: endpoint.summary,
      tone: "subtle" as const,
    })),
    { id: "resources", label: "Resources" },
  ];

  async function createApiKey() {
    if (!selfServeName.trim()) {
      setSelfServeError("Project name is required.");
      return;
    }

    if (!allowCaptchaBypass && !selfServeCaptchaToken.trim()) {
      setSelfServeError("Complete the CAPTCHA challenge before creating a key.");
      return;
    }

    setIsCreatingApiKey(true);
    setSelfServeError(null);
    setSelfServeResult(null);

    try {
      const response = await fetch("/api/v1/projects/self-serve", {
        body: JSON.stringify({
          api_key_label: selfServeApiKeyLabel.trim() || undefined,
          captcha_token: selfServeCaptchaToken.trim(),
          name: selfServeName.trim(),
          slug: selfServeSlug.trim() || undefined,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = await response.json() as ApiErrorShape | ProjectBootstrapResponse;

      if (!response.ok) {
        const error = "error" in payload ? payload.error : null;
        const retryAfter = error?.details && "retry_after_seconds" in error.details
          ? Number(error.details.retry_after_seconds)
          : null;

        const retryMessage = Number.isFinite(retryAfter) && retryAfter
          ? ` Try again in about ${Math.ceil(retryAfter / 60)} minute${Math.ceil(retryAfter / 60) === 1 ? "" : "s"}.`
          : "";

        setSelfServeError(`${error?.message ?? "Could not create an API key."}${retryMessage}`);
        return;
      }

      const successPayload = payload as ProjectBootstrapResponse;

      setSelfServeResult(successPayload);
      setApiKey(successPayload.apiKey.key);
      setBootstrapSecret("");
      setResponseState(null);
      setSelectedEndpointSlug("create-resume");
      setIdempotencyKey(safeRandomId());
      setSelfServeCaptchaToken("");

      if (window.turnstile && turnstileWidgetIdRef.current !== null && typeof window.turnstile.reset === "function") {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
    } catch (error) {
      setSelfServeError(error instanceof Error ? error.message : "Could not create an API key.");
    } finally {
      if (isTurnstileEnabled && window.turnstile && turnstileWidgetIdRef.current !== null && typeof window.turnstile.reset === "function") {
        window.turnstile.reset(turnstileWidgetIdRef.current);
        setSelfServeCaptchaToken("");
      }

      setIsCreatingApiKey(false);
    }
  }

  async function executeRequest() {
    setIsRunning(true);
    setResponseState(null);

    try {
      const url = buildRequestPath(selectedEndpoint.path, pathValues);
      const headers = new Headers();

      if (selectedEndpoint.auth === "bearer" && apiKey.trim()) {
        headers.set("Authorization", `Bearer ${apiKey.trim()}`);
      }

      if (selectedEndpoint.auth === "bootstrap-secret" && bootstrapSecret.trim()) {
        headers.set("x-tinycv-bootstrap-secret", bootstrapSecret.trim());
      }

      if (selectedEndpoint.idempotent && idempotencyKey.trim()) {
        headers.set("Idempotency-Key", idempotencyKey.trim());
      }

      let body: string | undefined;

      if (selectedEndpoint.method !== "GET" && requestBody.trim()) {
        headers.set("Content-Type", "application/json");
        body = requestBody;
      }

      const response = await fetch(url, {
        body,
        headers,
        method: selectedEndpoint.method,
      });

      const text = await response.text();
      let formatted = text;

      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        formatted = text;
      }

      setResponseState({
        body: formatted,
        ok: response.ok,
        status: `${response.status} ${response.statusText}`,
      });
    } catch (error) {
      setResponseState({
        body: error instanceof Error ? error.message : "Request failed.",
        ok: false,
        status: "CLIENT ERROR",
      });
    } finally {
      setIsRunning(false);
    }
  }

  function jumpToSection(id: string) {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    setActiveSectionId(id);
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function openPlayground(endpointSlug: string) {
    setSelectedEndpointSlug(endpointSlug);
    jumpToSection("playground");
  }

  const docsShellClass = cx(
    "min-h-screen px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6",
    isDark
      ? "bg-[#0b0f14] text-slate-100"
      : "bg-[#f7f3ec] text-slate-900",
  );

  const shellClass = cx(
    "mx-auto max-w-[120rem] overflow-hidden rounded-[1.75rem] border shadow-[0_28px_80px_rgba(15,23,42,0.08)] lg:h-[calc(100vh-3rem)] lg:flex lg:flex-col",
    isDark
      ? "border-white/10 bg-[#0f141b]"
      : "border-[#ddd5ca] bg-[#fcfaf6]",
  );

  const dividerClass = isDark ? "border-white/10" : "border-[#e4ddd2]";
  const panelClass = cx(
    "rounded-[1.2rem] border",
    isDark
      ? "border-white/10 bg-[#121923]"
      : "border-[#e4ddd2] bg-white",
  );
  const codePanelClass = cx(
    "overflow-hidden rounded-[1.05rem] border",
    isDark
      ? "border-white/10 bg-[#0c121a]"
      : "border-[#e1d8cc] bg-[#fbfaf7]",
  );
  const mutedTextClass = isDark ? "text-slate-400" : "text-slate-600";
  const headingTextClass = isDark ? "text-white" : "text-slate-950";
  const accentTextClass = isDark ? "text-emerald-300" : "text-emerald-700";
  const inputClass = cx(
    "w-full rounded-[0.95rem] border px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400",
    isDark
      ? "border-white/10 bg-white/[0.03] text-white focus:border-emerald-400/40"
      : "border-[#ddd5ca] bg-white text-slate-900 focus:border-emerald-700/30",
  );
  const topNavButtonClass = (isActive: boolean) => cx(
    "border-b-2 px-1 pb-3 pt-0.5 text-sm font-medium transition",
    isActive
      ? isDark
        ? "border-emerald-300 text-white"
        : "border-emerald-700 text-slate-950"
      : isDark
        ? "border-transparent text-slate-400 hover:text-white"
        : "border-transparent text-slate-500 hover:text-slate-900",
  );

  return (
    <main className={docsShellClass} style={{ colorScheme: theme }}>
      {isTurnstileEnabled ? <Script src={TURNSTILE_SCRIPT_SRC} strategy="afterInteractive" /> : null}
      <div className={shellClass}>
        <header className={cx("border-b px-4 py-4 sm:px-6", dividerClass)}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className={cx("text-[0.78rem] font-semibold uppercase tracking-[0.32em]", accentTextClass)}>
                  Tiny CV
                </p>
                <p className={cx("mt-1 text-sm", mutedTextClass)}>
                  Documentation
                </p>
              </div>

              <div className="flex items-center gap-2 lg:hidden">
                <button
                  className={cx(
                    "inline-flex cursor-pointer items-center rounded-full border px-3 py-2 text-sm font-medium transition",
                    isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]"
                      : "border-[#ddd5ca] bg-white text-slate-700 hover:bg-[#f6f2eb]",
                  )}
                  onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
                  type="button"
                >
                  {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <nav className="overflow-x-auto">
                <div className="flex min-w-max items-center gap-6">
                  {TOP_TABS.map((tab) => (
                    <button
                      className={topNavButtonClass(topTabKey === tab.key)}
                      key={tab.key}
                      onClick={() => jumpToSection(tab.id)}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </nav>

              <div className="lg:hidden">
                <label className="relative block">
                  <SearchIcon className={cx("pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", mutedTextClass)} />
                  <input
                    className={cx(inputClass, "pl-10")}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search endpoints, guides, and resources"
                    value={search}
                  />
                </label>
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 lg:grid lg:flex-1 lg:grid-cols-[18.5rem_minmax(0,1fr)_16rem]">
          <aside className={cx("hidden border-r px-5 py-5 lg:block lg:overflow-y-auto", dividerClass)}>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="relative block">
                  <SearchIcon className={cx("pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", mutedTextClass)} />
                  <input
                    className={cx(inputClass, "pl-10")}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search docs"
                    value={search}
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button
                    className={cx(
                      "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
                      isDark
                        ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]"
                        : "border-[#ddd5ca] bg-white text-slate-700 hover:bg-[#f6f2eb]",
                    )}
                    onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
                    type="button"
                  >
                    {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                    {isDark ? "Light" : "Dark"}
                  </button>
                  <Link
                    className={cx(
                      "inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium transition",
                      isDark
                        ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]"
                        : "border-[#ddd5ca] bg-white text-slate-700 hover:bg-[#f6f2eb]",
                    )}
                    href="/api/v1/openapi.json"
                  >
                    OpenAPI
                  </Link>
                </div>

                {searchResultSummary ? (
                  <p className={cx("text-xs leading-6", mutedTextClass)}>
                    {searchResultSummary}
                  </p>
                ) : null}
              </div>

              <div>
                <p className={cx("text-xs font-semibold uppercase tracking-[0.24em]", mutedTextClass)}>
                  Docs
                </p>
                <div className="mt-3 space-y-1">
                  {topLevelNavItems.map((item) => (
                    <NavButton
                      id={item.id}
                      isActive={activeSectionId === item.id}
                      isDark={isDark}
                      key={item.id}
                      onClick={jumpToSection}
                    >
                      {item.label}
                    </NavButton>
                  ))}
                </div>
              </div>

              {Object.entries(groupedEndpoints).map(([category, endpoints]) => (
                <div key={category}>
                  <p className={cx("text-xs font-semibold uppercase tracking-[0.24em]", mutedTextClass)}>
                    {category}
                  </p>
                  <div className="mt-3 space-y-1">
                    {endpoints.map((endpoint) => (
                      <NavButton
                        id={endpoint.slug}
                        isActive={activeSectionId === endpoint.slug}
                        isDark={isDark}
                        key={endpoint.slug}
                        onClick={jumpToSection}
                        tone="subtle"
                      >
                        {endpoint.summary}
                      </NavButton>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div
            className="min-h-0 px-4 py-5 sm:px-6 lg:overflow-y-auto lg:px-10 lg:py-8"
            ref={mainScrollRef}
          >
            <div className="mx-auto max-w-[52rem] space-y-10">
              <section className="space-y-8" id="quickstart">
                <div className="lg:hidden">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {topLevelNavItems.map((item) => (
                      <MobileJumpButton
                        id={item.id}
                        isDark={isDark}
                        key={item.id}
                        onClick={jumpToSection}
                      >
                        {item.label}
                      </MobileJumpButton>
                    ))}
                  </div>

                  {searchResultSummary ? (
                    <p className={cx("mt-3 text-xs leading-6", mutedTextClass)}>
                      {searchResultSummary}
                    </p>
                  ) : null}
                </div>

                <div className="max-w-3xl">
                  <p className={cx("text-sm font-semibold uppercase tracking-[0.26em]", accentTextClass)}>
                    Quickstart
                  </p>
                  <h1 className={cx("mt-3 text-4xl font-semibold tracking-tight sm:text-[2.9rem]", headingTextClass)}>
                    Get a resume live in three moves.
                  </h1>
                  <p className={cx("mt-6 max-w-2xl text-[1.1rem] leading-8 font-medium", mutedTextClass)}>
                    Tiny CV is small on purpose: create a key, send a draft, publish it.
                    Validation, schemas, claim links, and PDFs are there when you need them, not before.
                  </p>
                </div>

                <div className="space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", isDark ? "bg-white/10 text-white" : "bg-black/5 text-slate-900")}>
                        1
                      </div>
                      <h2 className={cx("text-xl font-bold tracking-tight", headingTextClass)}>
                        Create a project and API key
                      </h2>
                    </div>
                    
                    <div className="pl-12 space-y-8">
                      <p className={cx("max-w-2xl text-[1.02rem] leading-7 font-medium", mutedTextClass)}>
                        No account required yet. Complete the challenge below to create your first project and reveal your live API key. Store it immediately, as it won&apos;t be shown again.
                      </p>

                      <div className={cx("max-w-2xl rounded-2xl border p-6 shadow-sm", panelClass)}>
                        <div className="grid gap-5">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block sm:col-span-2">
                              <span className={cx("text-xs font-bold uppercase tracking-[0.18em]", mutedTextClass)}>
                                Project name
                              </span>
                              <input
                                className={cx(inputClass, "mt-2")}
                                onChange={(event) => setSelfServeName(event.target.value)}
                                placeholder="Acme Recruiting Agent"
                                value={selfServeName}
                              />
                            </label>

                            <label className="block">
                              <span className={cx("text-xs font-bold uppercase tracking-[0.18em]", mutedTextClass)}>
                                Project slug
                              </span>
                              <input
                                className={cx(inputClass, "mt-2")}
                                onChange={(event) => setSelfServeSlug(event.target.value)}
                                placeholder="acme-agent"
                                value={selfServeSlug}
                              />
                            </label>

                            <label className="block">
                              <span className={cx("text-xs font-bold uppercase tracking-[0.18em]", mutedTextClass)}>
                                API key label
                              </span>
                              <input
                                className={cx(inputClass, "mt-2")}
                                onChange={(event) => setSelfServeApiKeyLabel(event.target.value)}
                                placeholder="Production Agent Key"
                                value={selfServeApiKeyLabel}
                              />
                            </label>
                          </div>

                          <div className="space-y-4">
                            {isTurnstileEnabled ? (
                              <div
                                className={cx(
                                  "overflow-hidden rounded-[1rem] border p-3",
                                  isDark ? "border-white/10 bg-white/[0.03]" : "border-[#e1d8cc] bg-[#fbfaf7]",
                                )}
                              >
                                <div ref={turnstileContainerRef} />
                              </div>
                            ) : (
                              <p className={cx("rounded-[1rem] border px-4 py-3 text-sm leading-6", isDark ? "border-white/10 bg-white/[0.02]" : "border-[#e1d8cc] bg-[#fbfaf7]", mutedTextClass)}>
                                {allowCaptchaBypass
                                  ? "CAPTCHA is bypassed in local development."
                                  : "Self-serve key creation is not configured."}
                              </p>
                            )}

                            {selfServeError ? (
                              <p className={cx("text-sm leading-6 font-medium", isDark ? "text-rose-300" : "text-rose-700")}>
                                {selfServeError}
                              </p>
                            ) : null}

                            <button
                              className={cx(
                                "inline-flex w-full cursor-pointer items-center justify-center rounded-[0.95rem] px-4 py-3.5 text-[1rem] font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
                                isDark
                                  ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                                  : `${brandPrimaryButtonClass} !rounded-[0.95rem]`,
                              )}
                              disabled={isCreatingApiKey || (!allowCaptchaBypass && !isTurnstileEnabled) || !selfServeName.trim()}
                              onClick={createApiKey}
                              type="button"
                            >
                              {isCreatingApiKey ? "Creating key..." : "Create API key"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {selfServeResult ? (
                        <div className="max-w-2xl space-y-4">
                          <SimpleCodePanel
                            copiedText={selfServeResult.apiKey.key}
                            isDark={isDark}
                            title="Your API key"
                            value={selfServeResult.apiKey.key}
                          />
                          <div className={cx("rounded-[1rem] border px-4 py-3 text-sm leading-7 font-medium", isDark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50/50", mutedTextClass)}>
                            Project <span className={headingTextClass}>{selfServeResult.project.name}</span> is ready.
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", isDark ? "bg-white/10 text-white" : "bg-black/5 text-slate-900")}>
                        2
                      </div>
                      <h2 className={cx("text-xl font-bold tracking-tight", headingTextClass)}>
                        Create a draft resume
                      </h2>
                    </div>

                    <div className="pl-12 space-y-6">
                      <p className={cx("max-w-2xl text-[1.02rem] leading-7 font-medium", mutedTextClass)}>
                        Send markdown or JSON to create a private draft resume. Tiny CV will return a resume ID that you&apos;ll use for all future moves.
                      </p>

                      <TabbedCodeBlock
                        codePanelClass={codePanelClass}
                        isDark={isDark}
                        tabs={quickstartTabs}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", isDark ? "bg-white/10 text-white" : "bg-black/5 text-slate-900")}>
                        3
                      </div>
                      <h2 className={cx("text-xl font-bold tracking-tight", headingTextClass)}>
                        Publish to the web
                      </h2>
                    </div>

                    <div className="pl-12 space-y-6">
                      <p className={cx("max-w-2xl text-[1.02rem] leading-7 font-medium", mutedTextClass)}>
                        Publish your draft when you&apos;re ready for a public URL. You can also queue a PDF job to get a professional printable file.
                      </p>

                      <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
                        <InlineDocLink href="/api/v1/openapi.json" isDark={isDark}>OpenAPI Spec</InlineDocLink>
                        <InlineDocLink href="/api/v1/spec/markdown" isDark={isDark}>Markdown Guide</InlineDocLink>
                        <InlineDocLink href="/api/v1/spec/json-schema" isDark={isDark}>JSON Schema</InlineDocLink>
                        <InlineDocLink href="/llms-full.txt" isDark={isDark}>LLM Context</InlineDocLink>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6 pt-12 border-t border-black/5" id="overview">
                <div className="space-y-3">
                  <p className={cx("text-sm font-semibold uppercase tracking-[0.24em]", accentTextClass)}>
                    Overview
                  </p>
                  <h2 className={cx("text-3xl font-bold tracking-tight", headingTextClass)}>
                    The mental model is simple.
                  </h2>
                  <p className={cx("max-w-2xl text-[1.05rem] leading-8 font-medium", mutedTextClass)}>
                    Tiny CV keeps one canonical markdown document, publishes a hosted resume page,
                    and can hand you back a PDF on demand.
                  </p>
                </div>

                <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className={cx("text-[1rem] font-bold tracking-tight", headingTextClass)}>
                      Markdown as truth
                    </h3>
                    <p className={cx("text-sm leading-6 font-medium", mutedTextClass)}>
                      Markdown is the source of truth. JSON is just a nicer way to generate it.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className={cx("text-[1rem] font-bold tracking-tight", headingTextClass)}>
                      Private by default
                    </h3>
                    <p className={cx("text-sm leading-6 font-medium", mutedTextClass)}>
                      Drafts stay private. Public URLs appear only when you explicitly publish.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className={cx("text-[1rem] font-bold tracking-tight", headingTextClass)}>
                      Async PDFs
                    </h3>
                    <p className={cx("text-sm leading-6 font-medium", mutedTextClass)}>
                      PDFs are async. Request one when you actually need the artifact.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className={cx("text-[1rem] font-bold tracking-tight", headingTextClass)}>
                      Optional claims
                    </h3>
                    <p className={cx("text-sm leading-6 font-medium", mutedTextClass)}>
                      Claim links are optional. Use them only when a human should take over editing.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-6 pt-12 border-t border-black/5" id="playground">
                <div className="space-y-2">
                  <p className={cx("text-sm font-semibold uppercase tracking-[0.24em]", accentTextClass)}>
                    Playground
                  </p>
                  <h2 className={cx("text-3xl font-bold tracking-tight", headingTextClass)}>
                    Try it live.
                  </h2>
                  <p className={cx("max-w-2xl text-[1.05rem] leading-8 font-medium", mutedTextClass)}>
                    Pick an endpoint, add auth when needed, and inspect the real response without leaving the page.
                  </p>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      <label className="block">
                        <span className={cx("text-xs font-bold uppercase tracking-[0.18em]", mutedTextClass)}>
                          Endpoint
                        </span>
                        <select
                          className={cx(inputClass, "mt-2")}
                          onChange={(event) => setSelectedEndpointSlug(event.target.value)}
                          value={selectedEndpointSlug}
                        >
                          {endpointDocs.map((endpoint) => (
                            <option
                              className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}
                              key={endpoint.slug}
                              value={endpoint.slug}
                            >
                              {endpoint.method} {endpoint.path}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className={cx("rounded-xl border p-4 bg-white/20 backdrop-blur-sm", dividerClass)}>
                        <p className={cx("font-mono text-xs font-bold", headingTextClass)}>
                          {selectedEndpoint.method} {buildRequestPath(selectedEndpoint.path, pathValues)}
                        </p>
                      </div>

                      {selectedEndpoint.auth === "bearer" ? (
                        <label className="block">
                          <span className={cx("text-xs font-bold uppercase tracking-[0.18em]", mutedTextClass)}>
                            Bearer API key
                          </span>
                          <input
                            className={cx(inputClass, "mt-2")}
                            onChange={(event) => setApiKey(event.target.value)}
                            placeholder="tcv_live_xxxxxxxxx"
                            value={apiKey}
                          />
                        </label>
                      ) : null}

                      {selectedEndpoint.auth === "bootstrap-secret" ? (
                        <label className="block">
                          <span className={cx("text-xs font-bold uppercase tracking-[0.18em]", mutedTextClass)}>
                            Bootstrap secret
                          </span>
                          <input
                            className={cx(inputClass, "mt-2")}
                            onChange={(event) => setBootstrapSecret(event.target.value)}
                            placeholder="TINYCV_PLATFORM_BOOTSTRAP_SECRET"
                            value={bootstrapSecret}
                          />
                        </label>
                      ) : null}

                      {selectedEndpoint.idempotent ? (
                        <label className="block">
                          <span className={cx("text-xs font-bold uppercase tracking-[0.18em]", mutedTextClass)}>
                            Idempotency key
                          </span>
                          <div className="mt-2 flex gap-2">
                            <input
                              className={cx(inputClass, "min-w-0 flex-1")}
                              onChange={(event) => setIdempotencyKey(event.target.value)}
                              value={idempotencyKey}
                            />
                            <button
                              className={cx(
                                "cursor-pointer rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition",
                                isDark
                                  ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]"
                                  : "border-[#ddd5ca] bg-white text-slate-700 hover:bg-[#f6f2eb]",
                              )}
                              onClick={() => setIdempotencyKey(safeRandomId())}
                              type="button"
                            >
                              New
                            </button>
                          </div>
                        </label>
                      ) : null}

                      {(selectedEndpoint.pathParams ?? []).length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {selectedEndpoint.pathParams?.map((param) => (
                            <label className="block" key={param.key}>
                              <span className={cx("text-xs font-bold uppercase tracking-[0.18em]", mutedTextClass)}>
                                {param.key}
                              </span>
                              <input
                                className={cx(inputClass, "mt-2")}
                                onChange={(event) => setPathValues((current) => ({
                                  ...current,
                                  [param.key]: event.target.value,
                                }))}
                                value={pathValues[param.key] ?? ""}
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}

                      {selectedEndpoint.method !== "GET" ? (
                        <label className="block">
                          <span className={cx("text-xs font-bold uppercase tracking-[0.18em]", mutedTextClass)}>
                            JSON body
                          </span>
                          <textarea
                            className={cx(inputClass, "mt-2 min-h-[12rem] font-mono text-xs leading-6")}
                            onChange={(event) => setRequestBody(event.target.value)}
                            spellCheck={false}
                            value={requestBody}
                          />
                        </label>
                      ) : null}

                      <button
                        className={cx(
                          "inline-flex w-full cursor-pointer items-center justify-center rounded-full px-4 py-3.5 text-[1rem] font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
                          isDark
                            ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                            : brandPrimaryButtonClass,
                        )}
                        disabled={isRunning}
                        onClick={executeRequest}
                        type="button"
                      >
                        {isRunning ? "Running..." : "Send request"}
                      </button>
                    </div>
                  </div>

                  <SimpleCodePanel
                    copiedText={responseState?.body}
                    isDark={isDark}
                    statusTone={responseState?.ok === false ? "error" : "default"}
                    title={responseState ? responseState.status : "Response"}
                    value={responseState?.body ?? "Run a request to inspect the response here."}
                  />
                </div>
              </section>

              <section className="space-y-12 pt-12 border-t border-black/5" id="api-reference">
                <div className="space-y-3">
                  <p className={cx("text-sm font-semibold uppercase tracking-[0.24em]", accentTextClass)}>
                    API reference
                  </p>
                  <h2 className={cx("text-3xl font-bold tracking-tight", headingTextClass)}>
                    Endpoints
                  </h2>
                  <p className={cx("max-w-2xl text-[1.05rem] leading-8 font-medium", mutedTextClass)}>
                    Start with create and publish. The rest is there when your integration needs more than the happy path.
                  </p>
                </div>

                {filteredEndpointDocs.length === 0 ? (
                  <div className={cx("rounded-2xl border p-8", panelClass)}>
                    <p className={cx("text-base font-bold", headingTextClass)}>
                      No endpoints match your search.
                    </p>
                  </div>
                ) : null}

                {Object.entries(groupedEndpoints).map(([category, endpoints]) => (
                  <div className="space-y-10" key={category}>
                    <div className="space-y-3">
                      <h3 className={cx("text-2xl font-bold tracking-tight", headingTextClass)}>
                        {CATEGORY_TITLES[category as DeveloperEndpointDoc["category"]]}
                      </h3>
                      <p className={cx("max-w-2xl text-[1.02rem] leading-7 font-medium", mutedTextClass)}>
                        {CATEGORY_DESCRIPTIONS[category as DeveloperEndpointDoc["category"]]}
                      </p>
                    </div>

                    <div className="space-y-16">
                      {endpoints.map((endpoint) => {
                        const tabs: CodeTab[] = [
                          {
                            key: "node",
                            label: "Node.js",
                            value: buildNodeExample(endpoint),
                          },
                          {
                            key: "python",
                            label: "Python",
                            value: buildPythonExample(endpoint),
                          },
                          {
                            key: "curl",
                            label: "cURL",
                            value: buildCurlExample(endpoint),
                          },
                        ];

                        return (
                          <article className="space-y-6" id={endpoint.slug} key={endpoint.slug}>
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <span className={cx("rounded-md px-2 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-wider", 
                                  endpoint.method === "GET" ? (isDark ? "bg-blue-400/10 text-blue-400" : "bg-blue-50 text-blue-700") : 
                                  endpoint.method === "POST" ? (isDark ? "bg-emerald-400/10 text-emerald-400" : "bg-emerald-50 text-emerald-700") :
                                  (isDark ? "bg-amber-400/10 text-amber-400" : "bg-amber-50 text-amber-700")
                                )}>
                                  {endpoint.method}
                                </span>
                                <p className={cx("font-mono text-xs font-bold tracking-tight", mutedTextClass)}>
                                  {endpoint.path}
                                </p>
                              </div>

                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <h4 className={cx("text-xl font-bold tracking-tight", headingTextClass)}>
                                    {endpoint.summary}
                                  </h4>
                                  <p className={cx("mt-3 max-w-3xl text-[1rem] leading-7 font-medium", mutedTextClass)}>
                                    {endpoint.description}
                                  </p>
                                </div>

                                <button
                                  className={cx(
                                    "shrink-0 cursor-pointer text-sm font-bold transition rounded-full border px-4 py-2",
                                    isDark
                                      ? "border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/5"
                                      : "border-emerald-700/20 text-emerald-700 hover:bg-emerald-50"
                                  )}
                                  onClick={() => openPlayground(endpoint.slug)}
                                  type="button"
                                >
                                  Try in playground
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
                                <span className={mutedTextClass}>Auth: {renderAuthLabel(endpoint.auth)}</span>
                                {endpoint.idempotent ? <span className={accentTextClass}>· Idempotent</span> : null}
                              </div>
                            </div>

                            <TabbedCodeBlock
                              codePanelClass={codePanelClass}
                              isDark={isDark}
                              tabs={tabs}
                            />

                            {endpoint.exampleResponse ? (
                              <SimpleCodePanel
                                copiedText={JSON.stringify(endpoint.exampleResponse, null, 2)}
                                isDark={isDark}
                                title="Example response"
                                value={JSON.stringify(endpoint.exampleResponse, null, 2)}
                              />
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>

              <section className="space-y-8 pt-12 border-t border-black/5" id="resources">
                <div className="space-y-3">
                  <p className={cx("text-sm font-semibold uppercase tracking-[0.24em]", accentTextClass)}>
                    Resources
                  </p>
                  <h2 className={cx("text-3xl font-bold tracking-tight", headingTextClass)}>
                    Reference files
                  </h2>
                  <p className={cx("max-w-2xl text-[1.05rem] leading-8 font-medium", mutedTextClass)}>
                    Useful for agents, SDKs, and anyone who prefers a spec over vibes.
                  </p>
                </div>

                {filteredResources.length === 0 ? (
                  <div className={cx("rounded-2xl border p-8", panelClass)}>
                    <p className={cx("text-base font-bold", headingTextClass)}>
                      No resources match your search.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {filteredResources.map((resource) => (
                      <Link
                        className={cx(
                          "group relative flex flex-col justify-between gap-4 rounded-2xl border p-6 transition shadow-sm",
                          isDark 
                            ? "border-white/10 bg-[#121923] hover:border-white/20" 
                            : "border-[#e4ddd2] bg-white hover:border-[#ddd5ca] hover:shadow-md",
                        )}
                        href={resource.href}
                        key={resource.href}
                      >
                        <div className="space-y-2">
                          <p className={cx("text-base font-bold tracking-tight", headingTextClass)}>
                            {resource.label}
                          </p>
                          <p className={cx("text-sm leading-6 font-medium", mutedTextClass)}>
                            {resource.note}
                          </p>
                        </div>
                        <div className={cx("flex items-center gap-1.5 text-sm font-bold transition", accentTextClass)}>
                          Open resource
                          <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  <SimpleCodePanel
                    copiedText={truncateText(markdownGuide, 1200)}
                    isDark={isDark}
                    title="Markdown guide preview"
                    value={truncateText(markdownGuide, 1200)}
                  />
                  <SimpleCodePanel
                    copiedText={truncateText(agentCookbook, 1200)}
                    isDark={isDark}
                    title="Agent cookbook preview"
                    value={truncateText(agentCookbook, 1200)}
                  />
                </div>
              </section>
            </div>
          </div>

          <aside className={cx("hidden border-l px-5 py-6 lg:block lg:overflow-y-auto", dividerClass)}>
            <div className="space-y-3">
              <p className={cx("text-xs font-semibold uppercase tracking-[0.24em]", mutedTextClass)}>
                On this page
              </p>
              <div className="space-y-1">
                {tocItems.map((item) => (
                  <TocButton
                    id={item.id}
                    isActive={activeSectionId === item.id}
                    isDark={isDark}
                    key={item.id}
                    onClick={jumpToSection}
                    tone={item.tone}
                  >
                    {item.label}
                  </TocButton>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function NavButton({
  children,
  id,
  isActive,
  isDark,
  onClick,
  tone = "default",
}: {
  children: string;
  id: string;
  isActive: boolean;
  isDark: boolean;
  onClick: (id: string) => void;
  tone?: "default" | "subtle";
}) {
  return (
    <button
      className={cx(
        "block w-full cursor-pointer rounded-[0.9rem] px-3 py-2 text-left text-sm transition",
        isActive
          ? isDark
            ? "bg-emerald-400/10 text-white"
            : "bg-emerald-50 text-emerald-800"
          : tone === "subtle"
            ? isDark
              ? "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
              : "text-slate-500 hover:bg-[#f7f1e7] hover:text-slate-900"
            : isDark
              ? "text-slate-300 hover:bg-white/[0.04] hover:text-white"
              : "text-slate-700 hover:bg-[#f7f1e7] hover:text-slate-950",
      )}
      onClick={() => onClick(id)}
      type="button"
    >
      {children}
    </button>
  );
}

function TocButton({
  children,
  id,
  isActive,
  isDark,
  onClick,
  tone = "default",
}: {
  children: string;
  id: string;
  isActive: boolean;
  isDark: boolean;
  onClick: (id: string) => void;
  tone?: "default" | "subtle";
}) {
  return (
    <button
      className={cx(
        "block w-full cursor-pointer border-l-2 py-1.5 pl-3 text-left text-sm transition",
        isActive
          ? isDark
            ? "border-emerald-300 text-emerald-200"
            : "border-emerald-700 text-emerald-800"
          : tone === "subtle"
            ? isDark
              ? "border-transparent text-slate-500 hover:text-slate-200"
              : "border-transparent text-slate-500 hover:text-slate-900"
            : isDark
              ? "border-transparent text-slate-400 hover:text-white"
              : "border-transparent text-slate-600 hover:text-slate-950",
      )}
      onClick={() => onClick(id)}
      type="button"
    >
      {children}
    </button>
  );
}

function MobileJumpButton({
  children,
  id,
  isDark,
  onClick,
}: {
  children: string;
  id: string;
  isDark: boolean;
  onClick: (id: string) => void;
}) {
  return (
    <button
      className={cx(
        "cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition",
        isDark
          ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]"
          : "border-[#ddd5ca] bg-white text-slate-700 hover:bg-[#f6f2eb]",
      )}
      onClick={() => onClick(id)}
      type="button"
    >
      {children}
    </button>
  );
}

function InlineDocLink({
  children,
  href,
  isDark,
}: {
  children: string;
  href: string;
  isDark: boolean;
}) {
  return (
    <Link
      className={cx(
        "font-medium transition",
        isDark ? "text-slate-200 hover:text-white" : "text-slate-800 hover:text-slate-950",
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

function TabbedCodeBlock({
  codePanelClass,
  isDark,
  tabs,
  title,
}: {
  codePanelClass: string;
  isDark: boolean;
  tabs: CodeTab[];
  title?: string;
}) {
  const [activeKey, setActiveKey] = useState<CodeTab["key"]>(tabs[0]?.key ?? "node");
  const [copied, setCopied] = useState(false);

  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  async function copyCurrentTab() {
    if (!activeTab) {
      return;
    }

    await navigator.clipboard.writeText(activeTab.value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  if (!activeTab) {
    return null;
  }

  return (
    <div className={codePanelClass}>
      <div className={cx(
        "border-b px-4 pt-3",
        isDark ? "border-white/10" : "border-[#e1d8cc]",
      )}
      >
        {title ? (
          <p className={cx("pb-3 text-xs font-semibold uppercase tracking-[0.18em]", isDark ? "text-slate-400" : "text-slate-500")}>
            {title}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                className={cx(
                  "border-b-2 pb-3 text-base font-semibold transition",
                  activeKey === tab.key
                    ? isDark
                      ? "border-emerald-300 text-white"
                      : "border-emerald-700 text-slate-950"
                    : isDark
                      ? "border-transparent text-slate-400 hover:text-white"
                      : "border-transparent text-slate-500 hover:text-slate-950",
                )}
                key={tab.key}
                onClick={() => setActiveKey(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            className={cx(
              "shrink-0 cursor-pointer text-sm font-medium transition",
              isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-950",
            )}
            onClick={copyCurrentTab}
            type="button"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <pre className={cx(
        "overflow-x-auto p-4 text-sm leading-7",
        isDark ? "text-slate-100" : "text-slate-800",
      )}
      >
        {activeTab.value}
      </pre>
    </div>
  );
}

function SimpleCodePanel({
  copiedText,
  isDark,
  statusTone = "default",
  title,
  value,
}: {
  copiedText?: string;
  isDark: boolean;
  statusTone?: "default" | "error";
  title: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    if (!copiedText) {
      return;
    }

    await navigator.clipboard.writeText(copiedText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className={cx(
      "overflow-hidden rounded-[1.05rem] border",
      isDark ? "border-white/10 bg-[#0c121a]" : "border-[#e1d8cc] bg-[#fbfaf7]",
    )}
    >
      <div className={cx(
        "flex items-center justify-between border-b px-4 py-3",
        isDark ? "border-white/10" : "border-[#e1d8cc]",
      )}
      >
        <p className={cx(
          "text-xs font-semibold uppercase tracking-[0.18em]",
          statusTone === "error"
            ? isDark
              ? "text-rose-300"
              : "text-rose-700"
            : isDark
              ? "text-slate-400"
              : "text-slate-500",
        )}
        >
          {title}
        </p>
        {copiedText ? (
          <button
            className={cx(
              "cursor-pointer text-sm font-medium transition",
              isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-950",
            )}
            onClick={copyValue}
            type="button"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
      </div>
      <pre className={cx(
        "overflow-x-auto p-4 text-sm leading-7",
        statusTone === "error"
          ? isDark
            ? "text-rose-200"
            : "text-rose-700"
          : isDark
            ? "text-slate-100"
            : "text-slate-800",
      )}
      >
        {value}
      </pre>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20">
      <path d="M14.17 14.17 18 18M16.25 8.75a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="3.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 1.75v2.5M10 15.75v2.5M4.17 4.17l1.77 1.77M14.06 14.06l1.77 1.77M1.75 10h2.5M15.75 10h2.5M4.17 15.83l1.77-1.77M14.06 5.94l1.77-1.77" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20">
      <path d="M15.96 12.58A7.5 7.5 0 0 1 7.42 4.04 7.5 7.5 0 1 0 15.96 12.58Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function renderAuthLabel(auth: DeveloperEndpointDoc["auth"]) {
  if (auth === "none") {
    return "Public";
  }

  if (auth === "bootstrap-secret") {
    return "Bootstrap secret";
  }

  if (auth === "machine-payment") {
    return "x402 or MPP";
  }

  return "Bearer token";
}

function buildRequestPath(path: string, pathValues: Record<string, string>) {
  return path.replace(/\{([^}]+)\}/g, (_match, key: string) => encodeURIComponent(pathValues[key] ?? `{${key}}`));
}

function truncateText(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit).trimEnd()}\n\n...`;
}

function safeRandomId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `idemp_${Math.random().toString(36).slice(2)}`;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
