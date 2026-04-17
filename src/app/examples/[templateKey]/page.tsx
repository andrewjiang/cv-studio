import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingPaperPreview } from "@/app/_components/tinycv-landing-page";
import { ResumeDocumentContent, fontFamilyForChoice } from "@/app/_components/resume-content";
import { parseCvMarkdown, resolveMobileResumeTypography } from "@/app/_lib/cv-markdown";
import {
  LANDING_EXAMPLES,
  getLandingExample,
} from "@/app/_lib/landing-examples";
import { getResumeTemplate } from "@/app/_lib/resume-templates";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

type ExamplePageProps = {
  params: Promise<{ templateKey: string }>;
};

const TEMPLATE_KEYS: TemplateKey[] = ["engineer", "designer", "sales", "founder"];

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
    description: `${example.label} example for Tiny CV.`,
    title: `${example.label} example | Tiny CV`,
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
  const mobileTypeScale = resolveMobileResumeTypography(document.style);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbf7f0_0%,#f4efe8_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-[92rem]">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">
              Tiny CV example
            </p>
            <h1
              className="mt-3 text-[2.7rem] leading-[0.96] font-semibold tracking-[-0.045em] text-slate-950 sm:text-[3.5rem]"
              style={{ fontFamily: "var(--font-display-newsreader)" }}
            >
              {example.label}
            </h1>
            <p className="mt-3 max-w-[36rem] text-[1rem] leading-8 text-slate-600">
              {example.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-[0.98rem] font-semibold !text-white transition hover:bg-[var(--accent-strong)]"
              href={`/new?template=${templateKey}`}
            >
              Use this template
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/90 px-5 py-3 text-[0.98rem] font-semibold text-slate-800 transition hover:border-black/16 hover:bg-white"
              href="/#examples"
            >
              Back to examples
            </Link>
          </div>
        </div>

        <div className="lg:hidden">
          <article
            className="rounded-[1.6rem] border border-black/8 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
            style={{ fontFamily: fontFamilyForChoice(document.style.bodyFont) }}
          >
            <ResumeDocumentContent
              document={document}
              fitScale={1}
              typeScale={mobileTypeScale}
              variant="mobile"
            />
          </article>
        </div>

        <div className="hidden justify-center lg:flex">
          <LandingPaperPreview cropHeightRatio={1} scale={0.8} templateKey={templateKey as TemplateKey} />
        </div>
      </div>
    </main>
  );
}
