"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import desktopEditorShot from "../../../docs/cv-studio-desktop.png";
import { AgentInstructionCopyButton } from "@/app/_components/agent-instruction-copy-button";
import { brandPrimaryButtonClass } from "@/app/_components/button-classes";
import { ResumeDocumentContent, ResumePreview, fontFamilyForChoice } from "@/app/_components/resume-content";
import { AppHeader } from "./app-header";
import { ArrowRightIcon, CheckIcon, GitHubIcon, LayoutIcon, FileTextIcon, GlobeIcon, CodeIcon } from "./icons";
import { getPageMetrics } from "@/app/_lib/cv-fit";
import { parseCvMarkdown, resolveMobileResumeTypography } from "@/app/_lib/cv-markdown";
import {
  LANDING_EXAMPLES,
  getLandingExample,
} from "@/app/_lib/landing-examples";
import { getResumeTemplate } from "@/app/_lib/resume-templates";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

const GITHUB_REPO_URL = "https://github.com/andrewjiang/cv-studio";
const LANDING_PREVIEW_FIT_SCALES: Record<TemplateKey, number> = {
  designer: 0.94,
  engineer: 0.96,
  founder: 0.985,
  sales: 0.98,
};

const LANDING_EXAMPLE_ROTATIONS: Record<TemplateKey, string> = {
  designer: "rotate-[1.35deg]",
  engineer: "-rotate-[1.35deg]",
  founder: "rotate-[1.1deg]",
  sales: "-rotate-[1.1deg]",
};

const TESTIMONIALS = [
  {
    author: "Sarah Chen",
    quote: "I used to spend hours fighting with Word margins. Tiny CV let me focus on my experience, and the auto-scaling kept everything on one perfect page without me even thinking about it.",
    role: "Senior Product Designer",
    src: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=256&h=256&auto=format&fit=crop",
  },
  {
    author: "Marcus Thorne",
    quote: "The markdown-first approach is a breath of fresh air. It feels like I'm writing code, and the output is always professional. No more template theater—just clean, honest typography.",
    role: "Lead Frontend Engineer",
    src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&h=256&auto=format&fit=crop",
  },
  {
    author: "Elena Rossi",
    quote: "Finally, a builder that understands whitespace. I love how it keeps my portfolio links clean and the overall design minimal. It’s the most sophisticated way to host a professional identity.",
    role: "Creative Director",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&h=256&auto=format&fit=crop",
  },
  {
    author: "David Kim",
    quote: "Tiny CV is the first tool that actually solves the one-page problem properly. The API integration is a game-changer for our automated recruiting pipeline. It's built for how we hire now.",
    role: "Founder & CTO",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop",
  },
];

const AGENT_INSTRUCTION = `Read the Tiny CV documentation first.

Help me create a complete one-page resume in Tiny CV. Interview me for missing details, choose the best template, draft the markdown, validate it, publish the public link, and export a PDF if I ask.

Do not invent employers, dates, credentials, metrics, or links. Ask when something is missing.`;

type LandingBillingLaunchState = {
  founderPassLimit: number;
  founderPassRemaining: number;
};

export function TinyCvLandingPage({
  billingLaunchState,
  continueEditingHref,
}: {
  billingLaunchState: LandingBillingLaunchState;
  continueEditingHref: string | null;
}) {
  const primaryHref = continueEditingHref ?? "/new";
  const primaryLabel = continueEditingHref ? "Continue editing" : "Start writing";

  return (
    <main className="min-h-screen bg-[#fbf7f0] text-slate-900 selection:bg-[#065f46] selection:text-white overflow-x-clip" suppressHydrationWarning>
      <AppHeader continueEditingHref={continueEditingHref} />

      <div className="mx-auto max-w-[80rem] space-y-24 px-5 py-4 sm:px-8 sm:py-8 lg:px-12 lg:py-12">
        <section className="relative flex flex-col items-center text-center">
          {/* Subtle background glow to add depth */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[60rem] bg-[radial-gradient(circle,rgba(6,95,70,0.08)_0%,transparent_70%)] blur-[120px] pointer-events-none" />

          <div className="relative max-w-4xl">
            <div className="mb-6 inline-flex max-w-full items-center justify-center gap-2.5 rounded-full border border-black/5 bg-white/50 px-5 py-2.5 shadow-sm backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-500">
                Building with agents?
              </p>
              <Link className="inline-flex items-center gap-1.5 text-sm font-bold text-[#065f46] transition-colors hover:text-[#044e34]" href="/documentation">
                Start here
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            <h1
              className="mt-10 mx-auto max-w-[15ch] text-[3rem] leading-[0.9] font-medium tracking-[-0.05em] text-slate-950 sm:text-[4.25rem] lg:text-[5.2rem]"
              style={{ fontFamily: "var(--font-display-newsreader)" }}
            >
              The resume builder that stays on one page.
            </h1>
            <p className="mx-auto mt-8 max-w-[42rem] text-[1rem] leading-[1.5] font-medium text-slate-600 sm:text-[1.05rem] lg:max-w-none">
              Write in markdown, preview on real paper, and host clean versions for every role you are chasing.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
              <LandingPrimaryLink className="w-full px-9 py-4 text-[1rem] sm:w-auto" href={primaryHref}>
                {primaryLabel}
              </LandingPrimaryLink>
              <Link
                className="inline-flex items-center justify-center gap-1.5 text-[0.98rem] font-semibold text-slate-600 transition hover:text-slate-950"
                href="#examples"
              >
                Browse templates
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="relative mt-20 w-full lg:mt-24">
            <LandingHeroProof />
          </div>
        </section>

        <section
          className="mx-auto grid max-w-5xl gap-12 border-y border-black/8 py-16 lg:grid-cols-3 lg:gap-16 lg:py-20"
          id="product"
        >
          <ValueStatement
            body="Edit a document, not a form. Your source stays readable."
            icon={<FileTextIcon className="h-5 w-5" />}
            title="Write in markdown"
          />
          <ValueStatement
            body="The layout is designed around a real printable page. No guessing."
            icon={<LayoutIcon className="h-5 w-5" />}
            title="Preview on paper"
          />
          <ValueStatement
            body="Share a focused public link instead of a builder UI."
            icon={<GlobeIcon className="h-5 w-5" />}
            title="Host the link"
          />
        </section>

            <section className="space-y-16" id="examples">
              <div className="mx-auto max-w-4xl text-center">
                <LandingEyebrow>Examples</LandingEyebrow>
                <h2
                  className="mt-6 text-[2.6rem] leading-[0.95] font-bold tracking-[-0.045em] text-slate-950 sm:text-[3.8rem]"
                  style={{ fontFamily: "var(--font-display-newsreader)" }}
                >
                  Proven foundations for every career path.
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-[1.05rem] leading-8 font-medium text-slate-600">
                  Start with a shape that fits the role, then make the page yours.
                </p>
              </div>

              <div className="relative left-1/2 grid w-[min(100vw-2rem,86rem)] -translate-x-1/2 gap-x-10 gap-y-12 px-2 sm:grid-cols-2 md:px-4 lg:grid-cols-4 lg:gap-x-12">
                {LANDING_EXAMPLES.map((example) => (
                  <ExampleCard key={example.key} templateKey={example.key} />
                ))}
              </div>
            </section>

            <section className="grid gap-14 py-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(34rem,1.15fr)] lg:items-center lg:gap-24 lg:py-16">
              <div className="max-w-xl">
                <LandingEyebrow>Editor</LandingEyebrow>
                <h2
                  className="mt-6 text-[2.35rem] leading-[0.98] font-bold tracking-[-0.04em] text-slate-950 sm:text-[3rem]"
                  style={{ fontFamily: "var(--font-display-newsreader)" }}
                >
                  <span className="block">Markdown on the left.</span>
                  <span className="block">Paper on the right.</span>
                </h2>
                <p className="mt-6 text-[1.05rem] leading-8 font-medium text-slate-600">
                  The editor keeps the source simple and the output honest: markdown on one side, a real page on the other.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    "One source of truth.",
                    "A live paper preview instead of guesswork.",
                    "Enough style control to tune the page without turning it into a design project.",
                  ].map((text) => (
                    <li className="flex items-start gap-3 text-[1rem] font-medium text-slate-700" key={text}>
                      <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#065f46]/[0.08] text-[#065f46]">
                        <CheckIcon className="h-3 w-3" />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              <LandingLaptopPreview />
            </section>

            <LandingTestimonialCarousel />

            <section className="grid gap-12 rounded-[2.5rem] border border-black/8 bg-white/60 p-8 shadow-sm lg:grid-cols-[minmax(0,0.95fr)_minmax(28rem,1.05fr)] lg:items-center lg:gap-20 lg:p-14" id="api">
              <div className="max-w-xl">
                <LandingEyebrow>Agents</LandingEyebrow>
                <h2
                  className="mt-6 text-[2.6rem] leading-[0.95] font-bold tracking-[-0.04em] text-slate-950 sm:text-[3.2rem]"
                  style={{ fontFamily: "var(--font-display-newsreader)" }}
                >
                  Let your agent build the whole thing.
                </h2>
                <p className="mt-6 text-[1.05rem] leading-8 font-medium text-slate-600">
                  Tiny CV gives agents the format, templates, validation, publishing, and export path they need to guide someone from rough background notes to a polished public CV.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <LandingPrimaryLink href="/documentation">
                    Read agent docs
                  </LandingPrimaryLink>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-7 py-3.5 text-[0.98rem] font-bold text-slate-950 transition hover:bg-slate-50"
                    href="/api/v1/openapi.json"
                  >
                    View OpenAPI
                  </Link>
                </div>
              </div>

              <AgentInstructionBlock />
            </section>

            <section className="grid gap-8 rounded-[2.5rem] border border-black/8 bg-[#0f241d] p-8 text-white shadow-sm lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:p-12" id="pricing">
              <div>
                <LandingEyebrow inverse>Launch pricing</LandingEyebrow>
                <h2
                  className="mt-5 text-[2.35rem] leading-[0.98] font-bold tracking-[-0.04em] sm:text-[3rem]"
                  style={{ fontFamily: "var(--font-display-newsreader)" }}
                >
                  Built for the whole job hunt.
                </h2>
                <p className="mt-5 max-w-xl text-[1.02rem] leading-8 font-medium text-white/72">
                  Free stays useful. Paid plans are for people who want hosted versions, cleaner public pages, and fewer rough edges between editing, sharing, and sending.
                </p>
                <p className="mt-5 font-mono text-[0.78rem] font-bold uppercase tracking-[0.18em] text-emerald-200">
                  {billingLaunchState.founderPassRemaining} of {billingLaunchState.founderPassLimit} Founder spots left
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <PricingCard
                  body="For the first 100 paid users: lifetime hosting, branding removal, and early access to Pro publishing features."
                  price="$100"
                  title="Founder Pass"
                />
                <PricingCard
                  body="Hosted versions, cleaner public pages, and Pro limits for people actively applying."
                  price="$40/year"
                  title="Annual Pro"
                />
              </div>
            </section>

            <section className="rounded-[2.5rem] border border-black/8 bg-white/60 p-8 lg:p-12 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="max-w-2xl">
                <h3 className="text-[1.8rem] font-bold tracking-tight text-slate-950">
                  Open source and built in public.
                </h3>
                <p className="mt-3 text-[1.05rem] font-medium text-slate-600 leading-relaxed">
                    Tiny CV is open source on GitHub. The editor, renderer, docs, and API are designed to stay inspectable.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <Link
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-[0.94rem] font-bold text-slate-900 transition hover:bg-slate-50 shadow-sm"
                    href={GITHUB_REPO_URL}
                    target="_blank"
                  >
                    <GitHubIcon className="h-5 w-5" />
                    Star on GitHub
                  </Link>
                </div>
              </div>
            </section>

            <section className="py-20 text-center">
              <div className="mx-auto max-w-4xl">
                <h2
                  className="text-[2.7rem] leading-[0.98] font-bold tracking-[-0.045em] text-slate-950 sm:text-[3.8rem] sm:whitespace-nowrap"
                  style={{ fontFamily: "var(--font-display-newsreader)" }}
                >
                  Make the one page that matters.
                </h2>
                <div className="mt-12">
                  <LandingPrimaryLink className="px-12 py-5 text-[1.1rem]" href={primaryHref}>
                    {primaryLabel}
                  </LandingPrimaryLink>
                </div>
              </div>
            </section>
          </div>

          <footer className="border-t border-black/5 bg-black/[0.01] px-5 py-16 sm:px-8 lg:px-12 mt-20">
            <div className="mx-auto max-w-[80rem] flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#065f46] text-white">
                  <span className="text-[0.55rem] font-bold">CV</span>
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-950">
                  Tiny CV
                </p>
              </div>

              <nav className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-bold text-slate-500">
                <Link className="transition hover:text-slate-950" href="/documentation">
                  Documentation
                </Link>
                <Link className="transition hover:text-slate-950" href="/api/v1/openapi.json">
                  OpenAPI
                </Link>
                <Link className="transition hover:text-slate-950" href={GITHUB_REPO_URL} target="_blank">
                  GitHub
                </Link>
                <Link className="transition hover:text-slate-950" href="https://x.com/andrewjiang" target="_blank">
                  Twitter
                </Link>
              </nav>

              <p className="text-sm font-medium text-slate-400">
                &copy; 2026 Tiny CV. Built by andrewjiang.
              </p>
            </div>
          </footer>
    </main>
  );
}

function LandingHeroProof() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Subtle parallax: starts after a small scroll, moves at ~10% speed
      // so it reaches its 100px cap near the bottom of the hero resume.
      const parallaxFactor = 0.1;
      const startThreshold = 20;
      const maxOffset = 100;

      const progress = Math.max(0, scrollY - startThreshold);
      const newOffset = Math.min(progress * parallaxFactor, maxOffset);
      setOffset(newOffset);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative flex justify-center pb-16 lg:pb-32">
      <div className="relative">
        {/* Paper Preview - The "Desktop" view */}
        <div className="relative z-10">
          <LandingPaperPreview
            className="shadow-[0_80px_160px_-30px_rgba(15,23,42,0.15),0_30px_60px_-15px_rgba(15,23,42,0.08),0_10px_30px_-5px_rgba(15,23,42,0.04)] ring-1 ring-black/5"
            cropHeightRatio={1}
            fitScale={0.96}
            scale={1.04}
            templateKey="engineer"
          />
        </div>

        {/* Mobile Preview Overlap - iPhone 15 Pro style */}
        <div className="absolute -right-18 top-[8%] z-20 hidden sm:block md:-right-34 lg:-right-60 scale-[0.82] lg:scale-100">
          <div 
            className="will-change-transform"
            style={{ transform: `translateY(${offset}px)` }}
          >
            <LandingMobilePreview templateKey="engineer" />
          </div>
        </div>
      </div>

      <div className="mt-16 sm:hidden">
        <LandingMobilePreview templateKey="engineer" />
      </div>
    </div>
  );
}

export function LandingMobilePreview({
  className,
  templateKey,
}: {
  className?: string;
  templateKey: TemplateKey;
}) {
  const template = getResumeTemplate(templateKey);
  const document = parseCvMarkdown(template.markdown);
  const baseMobileTypeScale = resolveMobileResumeTypography(document.style);
  const mobileTypeScale = {
    ...baseMobileTypeScale,
    body: baseMobileTypeScale.body * 0.9,
    contact: baseMobileTypeScale.contact * 0.9,
    date: baseMobileTypeScale.date * 0.9,
    entryMeta: baseMobileTypeScale.entryMeta * 0.9,
    entryTitle: baseMobileTypeScale.entryTitle * 0.9,
    headline: baseMobileTypeScale.headline * 0.9,
    name: baseMobileTypeScale.name * 0.9,
    sectionLabel: baseMobileTypeScale.sectionLabel * 0.9,
    skills: baseMobileTypeScale.skills * 0.9,
  };

  return (
    <div
      className={cx(
        "relative mx-auto w-[340px] rounded-[3.7rem] border-[7px] border-slate-300 bg-slate-300 p-1 shadow-[0_60px_120px_-20px_rgba(15,23,42,0.35),0_30px_60px_-30px_rgba(15,23,42,0.45)] ring-1 ring-black/5 text-left",
        className,
      )}
    >
      {/* Physical Details */}
      <div className="absolute -right-[9px] top-44 h-20 w-[3px] rounded-r-md bg-slate-300" />
      <div className="absolute -left-[9px] top-36 h-10 w-[3px] rounded-l-md bg-slate-300" />
      <div className="absolute -left-[9px] top-52 h-16 w-[3px] rounded-l-md bg-slate-300" />
      <div className="absolute -left-[9px] top-72 h-16 w-[3px] rounded-l-md bg-slate-300" />

      {/* Screen Container */}
      <div
        className="relative h-[596px] overflow-hidden rounded-[3.15rem] bg-[#fcfaf6] text-left sm:h-[660px]"
        style={{ fontFamily: fontFamilyForChoice(document.style.bodyFont) }}
      >
        {/* Dynamic Island */}
        <div className="absolute left-1/2 top-4 z-50 flex h-7 w-24 -translate-x-1/2 items-center justify-end rounded-full bg-slate-300 px-4">
          <div className="h-2 w-2 rounded-full bg-indigo-500/10 shadow-inner" />
        </div>

        <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide">
          <article className="px-6 py-18 text-left sm:px-7 sm:py-20">
            <ResumeDocumentContent
              document={document}
              typeScale={mobileTypeScale}
              variant="mobile"
            />
          </article>
        </div>

        {/* Bottom indicator */}
        <div className="absolute bottom-2.5 left-1/2 h-1.5 w-36 -translate-x-1/2 rounded-full bg-slate-950/5" />
      </div>
    </div>
  );
}

function LandingLaptopPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[46rem] px-1">
      <div className="absolute inset-x-[4.5%] bottom-[-0.45rem] z-0 h-[1.15rem] rounded-b-[999px] bg-[linear-gradient(180deg,#d4dbe4_0%,#b8c1cd_100%)] shadow-[0_18px_30px_rgba(15,23,42,0.1)]" />
      <div className="absolute left-1/2 bottom-[-0.1rem] z-10 h-[2px] w-[18%] -translate-x-1/2 rounded-full bg-white/55" />

      <div className="relative z-20 rounded-[1.85rem] bg-[linear-gradient(180deg,#d8dde5_0%,#c4ccd7_100%)] p-[10px] shadow-[0_28px_70px_rgba(15,23,42,0.12)]">
        <div className="overflow-hidden rounded-[1.45rem] border border-black/7 bg-[#f7f8fa] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          <Image
            alt="Tiny CV editor with markdown on the left and a one-page preview on the right."
            className="h-auto w-full"
            priority
            src={desktopEditorShot}
          />
        </div>
      </div>
    </div>
  );
}

function ValueStatement({
  body,
  icon,
  title,
}: {
  body: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="group relative space-y-4 rounded-2xl border border-transparent p-2 transition duration-300">
      <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#065f46]/[0.06] text-[#065f46] shadow-sm transition duration-500 group-hover:scale-110 group-hover:bg-[#065f46] group-hover:text-white">
          {icon}
        </div>
        <div className="space-y-2">
          <p className="text-[1.15rem] font-bold tracking-tight text-slate-950">
            {title}
          </p>
          <p className="max-w-[20rem] text-[0.96rem] leading-7 font-medium text-slate-600">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

function ExampleCard({
  templateKey,
}: {
  templateKey: TemplateKey;
}) {
  const example = getLandingExample(templateKey);
  const exampleIcon = getLandingExampleIcon(templateKey);

  return (
    <article className="group flex flex-col items-center text-center">
      <Link
        className={cx(
          "relative block origin-bottom transition duration-700",
          LANDING_EXAMPLE_ROTATIONS[templateKey],
        )}
        href={`/new?template=${templateKey}`}
      >
        <LandingPaperPreview
          className="shadow-[0_30px_70px_rgba(15,23,42,0.12)] ring-1 ring-black/5"
          cropHeightRatio={1}
          fitScale={LANDING_PREVIEW_FIT_SCALES[templateKey]}
          scale={0.44}
          templateKey={templateKey}
        />
        <div className="absolute inset-0 rounded-[1.2rem] bg-[#065f46]/[0.02] opacity-0 transition duration-500 group-hover:opacity-100" />
      </Link>

      <div className="mt-10 space-y-2">
        <h3 className="flex items-center justify-center gap-2 text-[1.2rem] font-bold tracking-tight text-slate-950">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#065f46]/[0.07] text-[#065f46] shadow-sm">
            {exampleIcon}
          </span>
          {example.label}
        </h3>
        <p className="max-w-[16rem] text-[0.92rem] leading-6 font-medium text-slate-500">
          {example.description}
        </p>
        <div className="pt-4">
          <Link
            className="text-[0.94rem] font-bold text-[#065f46] hover:text-[#044e34] transition-colors inline-flex items-center gap-1.5"
            href={`/new?template=${templateKey}`}
          >
            Use template
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function getLandingExampleIcon(templateKey: TemplateKey) {
  const className = "h-3.5 w-3.5";

  switch (templateKey) {
    case "engineer":
      return <CodeIcon className={className} />;
    case "designer":
      return <LayoutIcon className={className} />;
    case "sales":
      return <GlobeIcon className={className} />;
    case "founder":
      return <FileTextIcon className={className} />;
    default:
      return <FileTextIcon className={className} />;
  }
}

function AgentInstructionBlock() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#123f32]/12 bg-[#fbf7f0] shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-4 border-b border-black/8 px-6 py-4">
        <p className="font-mono text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#065f46]">
          Agent instruction
        </p>
        <Link
          className="inline-flex items-center gap-1.5 text-[0.86rem] font-bold text-[#065f46] transition hover:text-[#044e34]"
          href="/documentation"
        >
          Read docs
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap px-6 py-7 font-mono text-[0.82rem] leading-7 text-slate-800">
        {AGENT_INSTRUCTION}
      </pre>
      <div className="flex justify-end border-t border-black/8 bg-white/55 px-6 py-4">
        <AgentInstructionCopyButton value={AGENT_INSTRUCTION} />
      </div>
    </div>
  );
}

function PricingCard({
  body,
  price,
  title,
}: {
  body: string;
  price: string;
  title: string;
}) {
  return (
    <article className="rounded-[1.7rem] border border-white/12 bg-white/[0.07] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <p className="text-[0.95rem] font-bold text-white/90">{title}</p>
      <p
        className="mt-4 text-[2.35rem] leading-none font-bold tracking-[-0.04em] text-white"
        style={{ fontFamily: "var(--font-display-newsreader)" }}
      >
        {price}
      </p>
      <p className="mt-5 text-[0.94rem] leading-7 font-medium text-white/68">
        {body}
      </p>
    </article>
  );
}

export function LandingPaperPreview({
  className,
  cropHeightRatio = 1,
  fitScale = 1,
  scale,
  templateKey,
}: {
  className?: string;
  cropHeightRatio?: number;
  fitScale?: number;
  scale: number;
  templateKey: TemplateKey;
}) {
  const template = getResumeTemplate(templateKey);
  const document = parseCvMarkdown(template.markdown);
  const pageMetrics = getPageMetrics(document.style);
  const previewHeight = pageMetrics.pageHeight * scale * cropHeightRatio;

  return (
    <div
      className={cx(
        "overflow-hidden rounded-[1.2rem] border border-slate-300 bg-white text-left",
        className,
      )}
      style={{
        height: `${previewHeight}px`,
        width: `${pageMetrics.pageWidth * scale}px`,
      }}
    >
      <div
        className="origin-top-left"
        style={{
          height: `${pageMetrics.pageHeight}px`,
          transform: `scale(${scale})`,
          width: `${pageMetrics.pageWidth}px`,
        }}
      >
        <ResumePreview
          document={document}
          fitScale={fitScale}
          interactive={false}
          showPageGuides={false}
        />
      </div>
    </div>
  );
}

function LandingTestimonialCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="mx-auto max-w-4xl py-12 lg:py-20">
      <div className="relative flex flex-col items-center text-center overflow-hidden min-h-[440px]">
        {TESTIMONIALS.map((t, i) => (
          <div
            className={cx(
              "absolute inset-0 flex flex-col items-center transition-all duration-700 ease-in-out",
              i === index ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12 pointer-events-none",
            )}
            key={t.author}
          >
            <div className="relative mb-10 h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl lg:h-32 lg:w-32">
              <Image
                alt={t.author}
                className="object-cover"
                fill
                src={t.src}
              />
            </div>
            <blockquote
              className="px-4 text-[1.65rem] leading-[1.3] font-medium tracking-tight text-slate-950 sm:text-[1.9rem]"
              style={{ fontFamily: "var(--font-display-newsreader)" }}
            >
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <cite className="mt-8 block not-italic">
              <span className="block text-[1.1rem] font-bold text-slate-950">{t.author}</span>
              <span className="mt-1 block text-[0.94rem] font-medium text-slate-500">{t.role}</span>
            </cite>
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex justify-center gap-2.5">
        {TESTIMONIALS.map((_, i) => (
          <button
            className={cx(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-8 bg-[#065f46]" : "w-1.5 bg-black/10 hover:bg-black/20",
            )}
            key={i}
            onClick={() => setIndex(i)}
            type="button"
          />
        ))}
      </div>
    </section>
  );
}

function LandingEyebrow({
  children,
  inverse = false,
}: {
  children: string;
  inverse?: boolean;
}) {
  return (
    <p
      className={cx(
        "text-[0.76rem] font-semibold uppercase tracking-[0.28em]",
        inverse ? "text-emerald-200" : "text-[#065f46]",
      )}
    >
      {children}
    </p>
  );
}

function LandingPrimaryLink({
  children,
  className,
  href,
}: {
  children: string;
  className?: string;
  href: string;
}) {
  return (
    <Link
      className={cx(
        brandPrimaryButtonClass,
        "px-5 py-3 text-[0.98rem]",
        className,
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
