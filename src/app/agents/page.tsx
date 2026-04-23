import type { Metadata } from "next";
import Link from "next/link";
import { AgentInstructionCopyButton } from "@/app/_components/agent-instruction-copy-button";
import { brandPrimaryButtonClass } from "@/app/_components/button-classes";
import { ArrowRightIcon } from "@/app/_components/icons";
import {
  TINYCV_AGENT_GUIDE_URL,
  TINYCV_AGENT_INSTRUCTION,
} from "@/app/_lib/developer-platform-guides";

export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: {
    canonical: "/agents",
  },
  description: "Guide for agents that write, validate, publish, hand off, and export Tiny CV resumes.",
  openGraph: {
    description: "Guide for agents that write, validate, publish, hand off, and export Tiny CV resumes.",
    title: "Tiny CV Agent Guide",
    url: "/agents",
  },
  title: "Tiny CV Agent Guide",
};

const interviewQuestions = [
  "What role, company type, seniority, and industry is this resume targeting?",
  "Can you share a current resume, LinkedIn, portfolio, GitHub, personal site, job description, or notes?",
  "What name, headline, location, email, phone, and public links should appear?",
  "For each role, what were the company, title, location, exact dates, scope, and most important outcomes?",
  "Which metrics can you verify: revenue, users, latency, conversion, quota, hiring, fundraising, or time saved?",
  "Which projects, selected work, education, credentials, awards, or certifications should be included?",
  "What should stay private or be omitted?",
  "Do you want only markdown, a public Tiny CV link, an edit link for the markdown editor, or a PDF export too?",
];

const templateGuidance = [
  {
    key: "engineer",
    label: "Engineer",
    useFor: "Software, product, AI, infrastructure, data, security, developer relations, and engineering leadership.",
    signal: "Use when stacks, shipped systems, projects, and quantified technical impact matter.",
  },
  {
    key: "designer",
    label: "Designer",
    useFor: "Product design, brand design, design engineering, research, creative direction, and portfolio-forward roles.",
    signal: "Use when selected work, craft, systems, process, and portfolio links need room.",
  },
  {
    key: "sales",
    label: "Sales",
    useFor: "Account executives, GTM founders, customer success, growth, partnerships, and revenue ops.",
    signal: "Use when pipeline, quota, ACV, segments, close rates, and customer outcomes are the proof.",
  },
  {
    key: "founder",
    label: "Founder",
    useFor: "Founders, operators, chiefs of staff, product leaders, and cross-functional company builders.",
    signal: "Use when the story crosses product, hiring, fundraising, GTM, leadership, and execution.",
  },
];

const workflowSteps = [
  "Read this guide, /api/v1/spec/markdown, and /openapi.json.",
  "Choose the template that fits the user's next target role.",
  "Draft Tiny CV markdown with the candidate name as #, sections as ##, and entries as ###.",
  "Validate with POST /api/v1/resumes/validate using quality_gate: \"publish\" before publishing or paying.",
  "Before publishing or paying, show the final markdown, selected template, unverified facts, and next action.",
  "Resolve validation errors before asking the user to approve publish/payment.",
  "Ask for approval unless the user already explicitly authorized autonomous publishing and payment.",
  "If the user only wants markdown, stop there and show the markdown.",
  "If the user wants a public link and the agent can pay, use POST /api/v1/paid/agent-finish with x402 or MPP.",
  "If the user has a bearer API key, create a draft, publish it, and request a PDF only when asked.",
  "If the user wants to keep editing, request and return an edit claim link.",
  "Return the public URL, edit claim URL when useful, and PDF job or PDF URL if requested.",
];

const publishReadyChecklist = [
  "# candidate name",
  "Headline under 80 characters",
  "Contact line under the headline",
  "## Summary with one concise paragraph",
  "## Experience with ### entries",
  "Separate - bullet lines",
  "No inline • or · lists",
  "Validate with quality_gate: \"publish\"",
];

const reviewGateNotes = [
  "Selected template and why it fits the target role.",
  "Final Tiny CV markdown.",
  "Missing or unverified facts.",
  "The next action: publish public link, charge Agent Finish, queue PDF, return edit link, or stop at markdown.",
];

const editHandoffNotes = [
  {
    body: "Set return_edit_claim_url: true on POST /api/v1/resumes for a draft edit link, or on POST /api/v1/resumes/{resume_id}/publish for a public link plus edit link.",
    title: "Bearer API",
  },
  {
    body: "POST /api/v1/paid/agent-finish always returns claim.editor_claim_url and resume.editor_claim_url with the hosted resume and queued PDF job.",
    title: "Agent Finish",
  },
  {
    body: "When the user opens the one-time claim link, Tiny CV attaches the resume to their browser workspace and opens the markdown editor. They can then sign up or sign in and claim the workspace into their account.",
    title: "Human handoff",
  },
];

const noInventItems = [
  "employers",
  "dates",
  "degrees",
  "credentials",
  "metrics",
  "awards",
  "links",
  "titles",
  "locations",
  "funding",
  "customers",
  "quotas",
];

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-[#fbf7f0] text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        <nav className="flex flex-wrap items-center justify-between gap-4 text-sm font-bold">
          <Link className="text-[#065f46] transition hover:text-[#044e34]" href="/">
            Tiny CV
          </Link>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-600">
            <Link className="transition hover:text-slate-950" href="/documentation">
              Developer docs
            </Link>
            <Link className="transition hover:text-slate-950" href="/openapi.json">
              OpenAPI
            </Link>
            <Link className="transition hover:text-slate-950" href="/llms-full.txt">
              LLM context
            </Link>
            <AgentInstructionCopyButton
              idleLabel="Copy agent prompt"
              value={TINYCV_AGENT_INSTRUCTION}
            />
          </div>
        </nav>

        <section className="grid gap-8 border-b border-black/8 pb-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,1.1fr)] lg:items-start">
          <div>
            <p className="font-mono text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#065f46]">
              Agent guide
            </p>
            <h1
              className="mt-6 max-w-[11ch] text-[3.25rem] leading-[0.9] font-bold tracking-[-0.045em] sm:text-[4.8rem]"
              style={{ fontFamily: "var(--font-display-newsreader)" }}
            >
              Let your agent write your resume.
            </h1>
            <p className="mt-6 max-w-xl text-[1.08rem] leading-8 font-medium text-slate-600">
              Use this guide when you want an agent to interview you, draft a clean Tiny CV resume, validate it, publish the link, hand you an edit link, and export a PDF when asked.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className={`${brandPrimaryButtonClass} px-6 py-3 text-sm shadow-sm`}
                href="/documentation#paid-agent-finish"
              >
                Agent Finish endpoint
                <ArrowRightIcon className="ml-1.5 h-3.5 w-3.5" />
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"
                href="/api/v1/spec/markdown"
              >
                Markdown guide
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/8 px-5 py-4">
              <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#065f46]">
                Copy into an agent
              </p>
            </div>
            <pre className="whitespace-pre-wrap px-5 py-5 font-mono text-[0.84rem] leading-7 text-slate-800">
              {TINYCV_AGENT_INSTRUCTION}
            </pre>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 bg-[#fbf7f0] px-5 py-4">
              <p className="text-xs font-semibold text-slate-500">
                Canonical URL: {TINYCV_AGENT_GUIDE_URL}
              </p>
              <AgentInstructionCopyButton value={TINYCV_AGENT_INSTRUCTION} />
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <SectionIntro
            eyebrow="Interview"
            title="Ask before drafting."
            body="The best Tiny CV starts with verified facts. Ask for the missing pieces, then compress the story into one page."
          />
          <div className="grid gap-3">
            {interviewQuestions.map((question, index) => (
              <div className="rounded-[1rem] border border-black/8 bg-white px-5 py-4 shadow-sm" key={question}>
                <p className="text-sm font-semibold leading-6 text-slate-800">
                  <span className="mr-2 font-mono text-xs font-bold text-[#065f46]">{String(index + 1).padStart(2, "0")}</span>
                  {question}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-black/8 pt-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <SectionIntro
            eyebrow="Templates"
            title="Choose for the next role."
            body="Pick the template by the job the user wants next, not just the job they had last."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {templateGuidance.map((template) => (
              <article className="rounded-[1.25rem] border border-black/8 bg-white p-5 shadow-sm" key={template.key}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold tracking-tight">{template.label}</h2>
                  <Link className="text-sm font-bold text-[#065f46] hover:text-[#044e34]" href={`/examples/${template.key}`}>
                    Preview
                  </Link>
                </div>
                <p className="mt-3 text-sm leading-6 font-medium text-slate-600">{template.useFor}</p>
                <p className="mt-3 text-sm leading-6 font-semibold text-slate-800">{template.signal}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-black/8 pt-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <SectionIntro
            eyebrow="Truth"
            title="Never invent."
            body="A polished resume is only useful if it stays true. Missing facts are questions, not creative prompts."
          />
          <div className="rounded-[1.25rem] border border-[#7f1d1d]/15 bg-white p-6 shadow-sm">
              <p className="text-[1rem] leading-7 font-semibold text-slate-800">
              Do not invent {formatList(noInventItems)}. If a number would help but the user cannot verify it, use truthful scale language instead.
            </p>
          </div>
        </section>

        <section className="grid gap-8 border-t border-black/8 pt-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <SectionIntro
            eyebrow="Quality gate"
            title="Make markdown publish-ready."
            body="Tiny CV accepts draft markdown freely, but API publish and paid Agent Finish require a clean structure."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {publishReadyChecklist.map((item) => (
              <div className="rounded-[1rem] border border-black/8 bg-white px-5 py-4 shadow-sm" key={item}>
                <p className="text-sm font-semibold leading-6 text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-black/8 pt-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <SectionIntro
            eyebrow="Workflow"
            title="Validate, publish, export."
            body="Use Tiny CV to move from raw facts to a finished artifact without making the user learn the API."
          />
          <ol className="grid gap-3">
            {workflowSteps.map((step, index) => (
              <li className="rounded-[1rem] border border-black/8 bg-white px-5 py-4 shadow-sm" key={step}>
                <p className="text-sm font-semibold leading-6 text-slate-800">
                  <span className="mr-2 font-mono text-xs font-bold text-[#065f46]">{String(index + 1).padStart(2, "0")}</span>
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-8 border-t border-black/8 pt-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <SectionIntro
            eyebrow="Review gate"
            title="Ask before spending or publishing."
            body="Publishing a public resume and spending x402/MPP funds are high-trust actions. Review the artifact first unless the user already opted into autonomous completion."
          />
          <div className="rounded-[1.25rem] border border-black/8 bg-white p-6 shadow-sm">
            <p className="text-base font-bold tracking-tight text-slate-950">
              Before publishing or paying, show the user:
            </p>
            <ul className="mt-4 grid gap-3">
              {reviewGateNotes.map((note) => (
                <li className="flex gap-3 text-sm font-semibold leading-6 text-slate-800" key={note}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#065f46]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-8 border-t border-black/8 pt-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <SectionIntro
            eyebrow="Handoff"
            title="Let the human keep editing."
            body="When the user wants direct markdown control, return a Tiny CV edit claim link with the finished resume."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {editHandoffNotes.map((note) => (
              <article className="rounded-[1.25rem] border border-black/8 bg-white p-5 shadow-sm" key={note.title}>
                <p className="text-base font-bold tracking-tight text-slate-950">{note.title}</p>
                <p className="mt-3 text-sm leading-6 font-medium text-slate-600">{note.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 border-t border-black/8 pt-12 md:grid-cols-3">
          <ActionLink
            body="Machine-readable schema and x402/MPP metadata."
            href="/openapi.json"
            title="OpenAPI"
          />
          <ActionLink
            body="No-account paid path for a hosted resume, claim link, queued PDF job, and receipt."
            href="/documentation#paid-agent-finish"
            title="Agent Finish"
          />
          <ActionLink
            body="Single-file context bundle for agents that prefer plain text."
            href="/llms-full.txt"
            title="LLM docs"
          />
        </section>
      </div>
    </main>
  );
}

function SectionIntro({
  body,
  eyebrow,
  title,
}: {
  body: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#065f46]">{eyebrow}</p>
      <h2
        className="mt-3 text-3xl leading-tight font-bold tracking-[-0.035em] text-slate-950"
        style={{ fontFamily: "var(--font-display-newsreader)" }}
      >
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 font-medium text-slate-600">{body}</p>
    </div>
  );
}

function ActionLink({
  body,
  href,
  title,
}: {
  body: string;
  href: string;
  title: string;
}) {
  return (
    <Link className="group rounded-[1.25rem] border border-black/8 bg-white p-6 shadow-sm transition hover:border-black/15 hover:shadow-md" href={href}>
      <p className="text-lg font-bold tracking-tight text-slate-950">{title}</p>
      <p className="mt-3 text-sm leading-6 font-medium text-slate-600">{body}</p>
      <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#065f46]">
        Open
        <ArrowRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}

function formatList(items: string[]) {
  if (items.length <= 1) {
    return items.join("");
  }

  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}
