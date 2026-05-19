import { ResumeAutoPrintBridge } from "@/app/_components/resume-auto-print-bridge";
import { ResumeDesktopSheet } from "@/app/_components/resume-live-document";
import type { ResumeDocument } from "@/app/_lib/cv-markdown";

export function ResumePrintView({
  autoPrint = false,
  document,
  fitScale,
}: {
  autoPrint?: boolean;
  document: ResumeDocument;
  fitScale: number;
}) {
  return (
    <main className="bg-white text-slate-900">
      {autoPrint ? <ResumeAutoPrintBridge /> : null}
      <ResumeDesktopSheet document={document} fitScale={fitScale} interactive={false} />

      <style media="print">{`@page { size: ${document.style.pageSize}; margin: 0; }`}</style>
    </main>
  );
}
