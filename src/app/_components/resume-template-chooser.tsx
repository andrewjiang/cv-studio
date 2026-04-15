"use client";

import { RESUME_TEMPLATES } from "@/app/_lib/resume-templates";
import type { TemplateKey } from "@/app/_lib/hosted-resume-types";

export function ResumeTemplateChooser({
  busyTemplateKey,
  eyebrow,
  onSelect,
  subtitle,
  title,
}: {
  busyTemplateKey?: TemplateKey | null;
  eyebrow?: string | null;
  onSelect: (templateKey: TemplateKey) => void;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[1.42rem] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[1.78rem]">
          {title}
        </h1>
        <p className="max-w-[34rem] text-[0.94rem] leading-6 text-slate-600">
          {subtitle}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {RESUME_TEMPLATES.map((template) => {
          const isBusy = busyTemplateKey === template.key;

          return (
            <button
              key={template.key}
              className="group cursor-pointer rounded-[1.35rem] border border-black/8 bg-white/90 p-5 text-left shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-[1px] hover:border-black/12 hover:bg-white"
              disabled={Boolean(busyTemplateKey)}
              onClick={() => onSelect(template.key)}
              type="button"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[1rem] font-semibold text-slate-950 transition group-hover:text-[var(--accent-strong)]">
                    {template.label}
                  </p>
                  <p className="mt-2 text-[0.91rem] leading-6 text-slate-600">
                    {template.description}
                  </p>
                </div>
                <span className="mt-0.5 rounded-full border border-black/8 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500 transition group-hover:border-[var(--accent)]/20 group-hover:text-[var(--accent-strong)]">
                  {isBusy ? "Creating" : template.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
