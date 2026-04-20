import type { ReactNode } from "react";
import {
  RESUME_ACCENT_LABELS,
  RESUME_ACCENT_TONES,
  RESUME_DENSITIES,
  RESUME_DENSITY_LABELS,
  RESUME_HEADER_ALIGNMENT_LABELS,
  RESUME_HEADER_ALIGNMENTS,
  RESUME_PRESET_LABELS,
  RESUME_STYLE_PRESETS,
  type ResumeAccentTone,
  type ResumeDensity,
  type ResumeHeaderAlignment,
  type ResumePageSize,
  type ResumeStylePrefs,
  type ResumeStylePreset,
} from "@/app/_lib/cv-markdown";

const PAGE_SIZE_OPTIONS: Array<{ label: string; value: ResumePageSize }> = [
  { label: "Letter", value: "letter" },
  { label: "Legal", value: "legal" },
];

const PAGE_MARGIN_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '0.65"', value: "0.65" },
  { label: '0.8"', value: "0.8" },
  { label: '1.0"', value: "1" },
];

export const primaryActionButtonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent)] px-5 text-[0.92rem] font-semibold !text-white transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-85";

export const iconActionButtonClass =
  "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white/92 text-slate-700 transition hover:border-black/20 hover:bg-white";

export const textActionLinkClass =
  "inline-flex cursor-pointer items-center gap-2 text-[0.86rem] font-medium text-slate-600 underline-offset-4 transition hover:text-slate-950 hover:underline";

export const menuButtonClass =
  "block w-full cursor-pointer rounded-[0.75rem] px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent";

export function StylePreferenceControls({
  onAccentToneChange,
  onDensityChange,
  onHeaderAlignmentChange,
  onPageMarginChange,
  onPageSizeChange,
  onPresetChange,
  onShowHeaderDividerChange,
  onShowSectionDividerChange,
  style,
}: {
  onAccentToneChange: (accentTone: ResumeAccentTone) => void;
  onDensityChange: (density: ResumeDensity) => void;
  onHeaderAlignmentChange: (headerAlignment: ResumeHeaderAlignment) => void;
  onPageMarginChange: (pageMargin: number) => void;
  onPageSizeChange: (pageSize: ResumePageSize) => void;
  onPresetChange: (stylePreset: ResumeStylePreset) => void;
  onShowHeaderDividerChange: (showHeaderDivider: boolean) => void;
  onShowSectionDividerChange: (showSectionDivider: boolean) => void;
  style: ResumeStylePrefs;
}) {
  return (
    <div className="border-b border-black/8 px-5 py-4">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Presets
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {RESUME_STYLE_PRESETS.map((preset) => (
              <button
                key={preset}
                className={
                  style.stylePreset === preset
                    ? "cursor-pointer rounded-[1rem] border border-[var(--accent)] bg-[var(--accent)]/8 px-3 py-3 text-left"
                    : "cursor-pointer rounded-[1rem] border border-black/8 bg-white/60 px-3 py-3 text-left transition hover:border-black/14 hover:bg-white/80"
                }
                onClick={() => onPresetChange(preset)}
                type="button"
              >
                <p className="text-[0.88rem] font-semibold text-slate-900">
                  {RESUME_PRESET_LABELS[preset]}
                </p>
                <p className="mt-1 text-[0.76rem] leading-5 text-slate-500">
                  {describePreset(preset)}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <StyleSelect
            label="Accent"
            onChange={(value) => onAccentToneChange(value as ResumeAccentTone)}
            options={RESUME_ACCENT_TONES.map((tone) => ({
              label: RESUME_ACCENT_LABELS[tone],
              value: tone,
            }))}
            value={style.accentTone}
          />
          <StyleSelect
            label="Density"
            onChange={(value) => onDensityChange(value as ResumeDensity)}
            options={RESUME_DENSITIES.map((density) => ({
              label: RESUME_DENSITY_LABELS[density],
              value: density,
            }))}
            value={style.density}
          />
          <StyleSelect
            label="Header alignment"
            onChange={(value) => onHeaderAlignmentChange(value as ResumeHeaderAlignment)}
            options={RESUME_HEADER_ALIGNMENTS.map((alignment) => ({
              label: RESUME_HEADER_ALIGNMENT_LABELS[alignment],
              value: alignment,
            }))}
            value={style.headerAlignment}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,1.15fr)] md:items-end">
          <StyleSelect
            label="Page size"
            onChange={(value) => onPageSizeChange(value as ResumePageSize)}
            options={PAGE_SIZE_OPTIONS}
            value={style.pageSize}
          />
          <StyleSelect
            label="Page margin"
            onChange={(value) => onPageMarginChange(Number.parseFloat(value))}
            options={PAGE_MARGIN_OPTIONS}
            value={String(style.pageMargin)}
          />
          <CheckboxGroupControl label="Dividers">
            <CheckboxControl
              checked={style.showHeaderDivider}
              label="Header"
              onChange={onShowHeaderDividerChange}
            />
            <CheckboxControl
              checked={style.showSectionDivider}
              label="Section"
              onChange={onShowSectionDividerChange}
            />
          </CheckboxGroupControl>
        </div>
      </div>
    </div>
  );
}

export function EditorLoadingState() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-5">
      <div className="flex items-center justify-between text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span>Loading local draft</span>
        <span>Markdown</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 rounded-[1.1rem] border border-black/6 bg-white/36 px-4 py-4">
        <SkeletonLine className="h-4 w-[28%]" />
        <SkeletonLine className="h-4 w-[44%]" />
        <SkeletonLine className="h-4 w-[82%]" />
        <SkeletonLine className="h-4 w-[76%]" />
        <div className="h-3" />
        <SkeletonLine className="h-4 w-[22%]" />
        <SkeletonLine className="h-4 w-[90%]" />
        <SkeletonLine className="h-4 w-[87%]" />
        <SkeletonLine className="h-4 w-[79%]" />
        <div className="h-3" />
        <SkeletonLine className="h-4 w-[26%]" />
        <SkeletonLine className="h-4 w-[56%]" />
        <SkeletonLine className="h-4 w-[84%]" />
        <SkeletonLine className="h-4 w-[81%]" />
        <SkeletonLine className="h-4 w-[73%]" />
      </div>
    </div>
  );
}

export function PreviewLoadingState({
  pageMetrics,
}: {
  pageMetrics: {
    paddingBottom: number;
    paddingTop: number;
    paddingX: number;
  };
}) {
  return (
    <div
      className="flex h-full flex-col bg-white"
      style={{
        paddingBottom: `${pageMetrics.paddingBottom}px`,
        paddingLeft: `${pageMetrics.paddingX}px`,
        paddingRight: `${pageMetrics.paddingX}px`,
        paddingTop: `${pageMetrics.paddingTop}px`,
      }}
    >
      <SkeletonLine className="h-12 w-[42%]" />
      <SkeletonLine className="mt-4 h-4 w-[38%]" />
      <SkeletonLine className="mt-4 h-3 w-[78%]" />

      <div className="mt-7">
        <div className="flex items-center gap-3">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-px flex-1" />
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          <SkeletonLine className="h-4 w-[94%]" />
          <SkeletonLine className="h-4 w-[92%]" />
          <SkeletonLine className="h-4 w-[76%]" />
        </div>
      </div>

      <div className="mt-7">
        <div className="flex items-center gap-3">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-px flex-1" />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between gap-6">
            <SkeletonLine className="h-4 w-[42%]" />
            <SkeletonLine className="h-3 w-28" />
          </div>
          <SkeletonLine className="mt-2 h-3 w-20" />
          <div className="mt-4 flex flex-col gap-2.5">
            <SkeletonLine className="h-4 w-[96%]" />
            <SkeletonLine className="h-4 w-[91%]" />
            <SkeletonLine className="h-4 w-[88%]" />
            <SkeletonLine className="h-4 w-[82%]" />
          </div>
        </div>
      </div>

      <div className="mt-7">
        <div className="flex items-center gap-3">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-px flex-1" />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <SkeletonLine className="h-4 w-[48%]" />
          <SkeletonLine className="h-4 w-[82%]" />
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div className="flex items-center gap-3">
          <SkeletonLine className="h-3 w-16" />
          <SkeletonLine className="h-px flex-1" />
        </div>
        <div className="mt-4 grid grid-cols-[7rem_1fr] gap-x-6 gap-y-2">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-3 w-[72%]" />
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-3 w-[64%]" />
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-3 w-[58%]" />
        </div>
      </div>
    </div>
  );
}

export function modeButtonClass(active: boolean) {
  return active
    ? "cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-[0.88rem] font-semibold text-white shadow-[0_6px_16px_rgba(15,23,42,0.14)]"
    : "cursor-pointer rounded-full px-4 py-2 text-[0.88rem] font-semibold text-slate-500 transition hover:text-slate-700";
}

export function MenuSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="border-b border-black/6 px-1 py-1.5 last:border-b-0">
      <p className="px-3 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

export function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4v9m0 0 3.5-3.5M12 13l-3.5-3.5M5 16.5v1A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5v-1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function DesktopIcon() {
  return (
    <svg aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" fill="none" viewBox="0 0 24 24">
      <rect x="4.5" y="5.5" width="15" height="10.5" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 19h6M12 16v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function MobileIcon() {
  return (
    <svg aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" fill="none" viewBox="0 0 24 24">
      <rect x="7.5" y="3.75" width="9" height="16.5" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="16.7" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="M9.25 9.25H7.75a3.75 3.75 0 0 0 0 7.5h1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M14.75 9.25h1.5a3.75 3.75 0 0 1 0 7.5h-1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.75 12h6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function PublishIcon() {
  return (
    <svg aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 14V5.5m0 0 3.25 3.25M12 5.5 8.75 8.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M5.5 14.5v2.25A1.75 1.75 0 0 0 7.25 18.5h9.5A1.75 1.75 0 0 0 18.5 16.75V14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 7.5h14M5 12h14M5 16.5h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-[0.95rem] w-[0.95rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="m6.75 9 5.25 6 5.25-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[1rem] w-[1rem] animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-20" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" className={className ?? "h-[1rem] w-[1rem]"} fill="none" viewBox="0 0 24 24">
      <path
        d="m5.5 12.5 4.25 4.25L18.5 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

export function CopyIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" className={className ?? "h-[1rem] w-[1rem]"} fill="none" viewBox="0 0 24 24">
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M5.5 15.5h-1a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function GlobeIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" className={className ?? "h-[1rem] w-[1rem]"} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M3.6 9h16.8M3.6 15h16.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12 3a13.5 13.5 0 0 0 0 18 13.5 13.5 0 0 0 0-18Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function TuneIcon() {
  return (
    <svg aria-hidden="true" className="h-[1rem] w-[1rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="M6.5 16.75 14.75 8.5l2.75 2.75-8.25 8.25H6.5v-2.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m14.75 8.5 1.15-1.15a1.94 1.94 0 1 1 2.75 2.75L17.5 11.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-[1rem] w-[1rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="M6.75 6.75 17.25 17.25M17.25 6.75 6.75 17.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function StyleSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <div className="relative rounded-[0.95rem] border border-black/8 bg-white/76">
        <select
          className="h-11 w-full appearance-none bg-transparent px-4 pr-10 text-[0.9rem] font-medium text-slate-800 outline-none"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
          <ChevronDownIcon />
        </span>
      </div>
    </label>
  );
}

function CheckboxControl({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-11 cursor-pointer items-center gap-3 rounded-[0.95rem] border border-black/8 bg-white/76 px-4">
      <input
        checked={checked}
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="text-[0.84rem] font-medium text-slate-700">{label}</span>
    </label>
  );
}

function CheckboxGroupControl({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <div className="grid gap-3 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function SkeletonLine({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-full bg-slate-200/70 ${className}`} />;
}

function describePreset(preset: ResumeStylePreset) {
  switch (preset) {
    case "classic":
      return "Neutral, ATS-safe, and low-decoration.";
    case "creative":
      return "Expressive but printable: centered header and richer accent.";
    case "minimal":
      return "Contemporary sans serif with restrained rules.";
    case "editorial":
      return "Serif-led hierarchy with a more authored feel.";
    case "executive":
      return "Formal tone with stronger contrast and spacing.";
    case "technical":
      return "Compact, efficient, and slightly more system-like.";
  }
}
