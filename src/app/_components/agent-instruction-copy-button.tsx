"use client";

import { useState } from "react";
import { CopyIcon } from "@/app/_components/icons";

export function AgentInstructionCopyButton({
  copiedLabel = "Copied",
  idleLabel = "Copy instruction",
  value,
}: {
  copiedLabel?: string;
  idleLabel?: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyInstruction() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-[0.86rem] font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
      onClick={copyInstruction}
      type="button"
    >
      <CopyIcon className="h-4 w-4" />
      {copied ? copiedLabel : idleLabel}
    </button>
  );
}
