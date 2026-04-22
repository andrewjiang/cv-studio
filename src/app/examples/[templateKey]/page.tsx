import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/app/_components/app-header";
import { brandPrimaryButtonClass, brandSecondaryButtonClass } from "@/app/_components/button-classes";
import { ResumeDesktopSheet, ResumeMobileSheet } from "@/app/_components/resume-live-document";
import { parseCvMarkdown } from "@/app/_lib/cv-markdown";
import {
  LANDING_EXAMPLES,
  getLandingExample,
} from "@/app/_lib/landing-examples";
import { getResumeTemplate } from "@/app/_lib/resume-templates";
import { TEMPLATE_KEYS } from "@/app/_lib/template-showcase";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

type ExamplePageProps = {
  params: Promise<{ templateKey: string }>;
};

export function generateStaticParams() {
  return LANDING_EXAMPLES.map((example) => ({ templateKey: example.key }));
}

export async function generateMetadata({ params }: ExamplePageProps) {
  const { templateKey } = await params;

  if (!TEMPLATE_KEYS.includes(templateKey as TemplateKey)) {
    return {
      title: "Example not found | Tiny CV",
    };
  }

  const example = getLandingExample(templateKey as TemplateKey);

  return {
    description: `${example.label} template for Tiny CV.`,
    title: `${example.label} Template`,
  };
}

export default async function ExamplePage({ params }: ExamplePageProps) {
  const { templateKey } = await params;

  if (!TEMPLATE_KEYS.includes(templateKey as TemplateKey)) {
    notFound();
  }

  const example = getLandingExample(templateKey as TemplateKey);
  const template = getResumeTemplate(templateKey as TemplateKey);
  const document = parseCvMarkdown(template.markdown);

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-[linear-gradient(180deg,#faf7f1_0%,#f4efe8_100%)] text-slate-900">
        <section className="mx-auto flex w-full max-w-[112rem] flex-col px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                Tiny CV template
              </p>
              <h1
                className="mt-3 text-[2.4rem] leading-[0.96] font-semibold tracking-[-0.045em] text-slate-950 sm:text-[3.4rem]"
                style={{ fontFamily: "var(--font-display-newsreader)" }}
              >
                {example.label} Template
              </h1>
              <p className="mt-3 max-w-[36rem] text-[1rem] leading-8 text-slate-600">
                {example.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className={`${brandPrimaryButtonClass} min-h-12 px-5 text-[0.98rem]`}
                href={`/new?template=${templateKey}`}
              >
                Use this template
              </Link>
              <Link
                className={`${brandSecondaryButtonClass} min-h-12 px-5 text-[0.98rem]`}
                href="/templates"
              >
                Back to templates
              </Link>
            </div>
          </div>

          <div className="lg:hidden">
            <ResumeMobileSheet document={document} />
          </div>

          <div className="hidden items-start justify-center lg:flex">
            <ResumeDesktopSheet document={document} />
          </div>
        </section>
      </main>
    </>
  );
}
