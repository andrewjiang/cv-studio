import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/app/_components/app-header";
import { brandPrimaryButtonClass, brandSecondaryButtonClass } from "@/app/_components/button-classes";
import { ArrowRightIcon } from "@/app/_components/icons";
import { ResumePaperPreview } from "@/app/_components/resume-paper-preview";
import { getLandingExample } from "@/app/_lib/landing-examples";
import { RESUME_TEMPLATES } from "@/app/_lib/resume-templates";
import { TEMPLATE_STYLE_SHOWCASE, type TemplateStyleShowcaseItem } from "@/app/_lib/template-showcase";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

export const metadata: Metadata = {
  description: "Browse Tiny CV resume templates, formats, and style presets.",
  title: "Templates",
};

const TEMPLATE_FIT_SCALES: Record<TemplateKey, number> = {
  designer: 0.96,
  engineer: 0.96,
  founder: 0.96,
  sales: 0.97,
};

export default function TemplatesPage() {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-[linear-gradient(180deg,#fbf7f0_0%,#f4efe8_100%)] text-slate-900">
        <section className="mx-auto grid max-w-[108rem] gap-10 px-5 pb-10 pt-10 sm:px-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(38rem,1fr)] lg:items-end lg:px-12 lg:pb-14 lg:pt-16">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              Tiny CV templates
            </p>
            <h1
              className="mt-4 max-w-[11ch] text-[3rem] leading-[0.92] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[4.5rem] lg:text-[5.2rem]"
              style={{ fontFamily: "var(--font-display-newsreader)" }}
            >
              Start from a resume that already feels finished.
            </h1>
            <p className="mt-6 max-w-[43rem] text-[1.02rem] leading-8 font-medium text-slate-600">
              Pick the role shape first, then tune the format inside the editor. Every template renders on the same real resume page used for public links and PDF export.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className={`${brandPrimaryButtonClass} min-h-12 px-5 text-[0.98rem]`} href="/new">
                Create a CV
              </Link>
              <Link className={`${brandSecondaryButtonClass} min-h-12 px-5 text-[0.98rem]`} href="#formats">
                Browse formats
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {["Role templates", "Style presets", "Public-page previews"].map((label) => (
              <div className="border-t border-black/10 pt-4" key={label}>
                <p className="text-[0.82rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[108rem] px-5 py-10 sm:px-8 lg:px-12">
          <SectionHeading
            body="These are the four starting points agents and humans should choose from before writing the markdown."
            eyebrow="Role templates"
            title="Choose by the next job."
          />

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {RESUME_TEMPLATES.map((template) => (
              <RoleTemplateCard key={template.key} templateKey={template.key} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[108rem] px-5 py-12 sm:px-8 lg:px-12" id="formats">
          <SectionHeading
            body="The same resume can feel technical, editorial, executive, creative, minimal, or classic after a few style choices."
            eyebrow="Formats and styles"
            title="Show the range before the user opens the editor."
          />

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {TEMPLATE_STYLE_SHOWCASE.map((item) => (
              <StyleTemplateCard item={item} key={item.id} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function RoleTemplateCard({ templateKey }: { templateKey: TemplateKey }) {
  const template = RESUME_TEMPLATES.find((item) => item.key === templateKey)!;
  const example = getLandingExample(templateKey);

  return (
    <article className="group overflow-hidden rounded-[1.35rem] border border-black/8 bg-white/88 shadow-[0_20px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-[1px] hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]">
      <Link
        className="flex min-h-[25rem] items-start justify-center overflow-hidden bg-[linear-gradient(180deg,#fffdf9_0%,#f1eee7_100%)] px-5 py-6"
        href={`/examples/${templateKey}`}
      >
        <ResumePaperPreview
          className="shadow-[0_24px_54px_rgba(15,23,42,0.14)] ring-1 ring-black/5"
          cropHeightRatio={0.96}
          fitScale={TEMPLATE_FIT_SCALES[templateKey]}
          mobileTargetHeight={330}
          targetHeight={370}
          scale={0.46}
          templateKey={templateKey}
        />
      </Link>

      <div className="border-t border-black/8 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
            {template.badge}
          </p>
          <p className="text-[0.82rem] font-semibold text-slate-500">
            {example.role}
          </p>
        </div>
        <h2 className="mt-3 text-[1.28rem] font-bold tracking-[-0.025em] text-slate-950">
          {template.label}
        </h2>
        <p className="mt-3 min-h-18 text-[0.94rem] leading-6 font-medium text-slate-600">
          {template.description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {example.facets.map((facet) => (
            <span
              className="rounded-full border border-black/8 bg-slate-50 px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-slate-500"
              key={facet}
            >
              {facet}
            </span>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className={`${brandPrimaryButtonClass} min-h-11 px-4 text-[0.9rem]`} href={`/new?template=${templateKey}`}>
            Use template
          </Link>
          <Link className={`${brandSecondaryButtonClass} min-h-11 px-4 text-[0.9rem]`} href={`/examples/${templateKey}`}>
            Preview
          </Link>
        </div>
      </div>
    </article>
  );
}

function StyleTemplateCard({ item }: { item: TemplateStyleShowcaseItem }) {
  return (
    <article className="group overflow-hidden rounded-[1.35rem] border border-black/8 bg-white/88 shadow-[0_20px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-[1px] hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]">
      <Link
        className="flex min-h-[24rem] items-start justify-center overflow-hidden bg-[linear-gradient(180deg,#fffdf9_0%,#f2eee8_100%)] px-5 py-6"
        href={item.previewHref}
      >
        <ResumePaperPreview
          className="shadow-[0_24px_54px_rgba(15,23,42,0.14)] ring-1 ring-black/5"
          cropHeightRatio={0.94}
          fitScale={0.96}
          markdown={item.markdown}
          mobileTargetHeight={315}
          targetHeight={350}
          scale={0.44}
          templateKey={item.templateKey}
        />
      </Link>

      <div className="border-t border-black/8 p-5">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
          {item.role}
        </p>
        <h2 className="mt-3 text-[1.28rem] font-bold tracking-[-0.025em] text-slate-950">
          {item.title}
        </h2>
        <p className="mt-3 min-h-18 text-[0.94rem] leading-6 font-medium text-slate-600">
          {item.description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {item.facets.map((facet) => (
            <span
              className="rounded-full border border-black/8 bg-slate-50 px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-slate-500"
              key={facet}
            >
              {facet}
            </span>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className={`${brandPrimaryButtonClass} min-h-11 gap-1.5 px-4 text-[0.9rem]`} href={item.useHref}>
            Use base
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
          <Link className={`${brandSecondaryButtonClass} min-h-11 px-4 text-[0.9rem]`} href={item.previewHref}>
            Full preview
          </Link>
        </div>
      </div>
    </article>
  );
}

function SectionHeading({
  body,
  eyebrow,
  title,
}: {
  body: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
        {eyebrow}
      </p>
      <h2
        className="mt-3 text-[2.25rem] leading-[1] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[3rem]"
        style={{ fontFamily: "var(--font-display-newsreader)" }}
      >
        {title}
      </h2>
      <p className="mt-4 text-[1rem] leading-8 font-medium text-slate-600">
        {body}
      </p>
    </div>
  );
}
