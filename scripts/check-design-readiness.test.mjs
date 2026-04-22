import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkDesignReadiness,
  isFrontendFile,
  tokenizeClassLikeText,
} from "./check-design-readiness.mjs";

let tempDir = "";

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { force: true, recursive: true });
    tempDir = "";
  }
});

describe("design readiness checks", () => {
  it("treats src/app UI files as frontend files", () => {
    expect(isFrontendFile("src/app/_components/button.tsx")).toBe(true);
    expect(isFrontendFile("src/app/_components/button-classes.ts")).toBe(true);
    expect(isFrontendFile("src/app/globals.css")).toBe(true);
    expect(isFrontendFile("src/app/_lib/button.test.ts")).toBe(false);
    expect(isFrontendFile("scripts/check-design-readiness.mjs")).toBe(false);
  });

  it("tokenizes Tailwind arbitrary values without losing important text color", () => {
    expect(tokenizeClassLikeText("className=\"bg-[#065f46] !text-white hover:bg-[#044e34]\"")).toEqual(
      expect.arrayContaining(["bg-[#065f46]", "!text-white", "hover:bg-[#044e34]"]),
    );
  });

  it("allows the shared primary button class", () => {
    const file = writeFrontendFile("src/app/_components/example.tsx", `
      <Link className={\`\${brandPrimaryButtonClass} px-5 py-3\`} href="/new">Start</Link>
    `);

    expect(checkDesignReadiness([file])).toEqual([]);
  });

  it("requires important white text on inline dark green buttons", () => {
    const file = writeFrontendFile("src/app/_components/example.tsx", `
      <Link className="inline-flex rounded-full bg-[#065f46] px-5 py-3 text-white" href="/new">Start</Link>
    `);

    expect(checkDesignReadiness([file])).toMatchObject([
      {
        line: 2,
        message: "Dark brand-green buttons must use `!text-white` or `brandPrimaryButtonClass`.",
      },
    ]);
  });

  it("rejects dark text overrides on primary button compositions", () => {
    const file = writeFrontendFile("src/app/_components/example.tsx", `
      <button className={\`\${brandPrimaryButtonClass} text-slate-950\`}>Pay</button>
    `);

    expect(checkDesignReadiness([file])).toMatchObject([
      {
        line: 2,
        message: "Dark brand-green button includes dark text token(s): text-slate-950.",
      },
    ]);
  });

  it("allows dark text on light green UI", () => {
    const file = writeFrontendFile("src/app/_components/example.tsx", `
      <button className="rounded-full bg-emerald-400 px-4 py-2 text-slate-950">Copy</button>
    `);

    expect(checkDesignReadiness([file])).toEqual([]);
  });
});

function writeFrontendFile(relativePath, content) {
  if (!tempDir) {
    tempDir = mkdtempSync(path.join(tmpdir(), "tinycv-design-"));
  }

  const absolutePath = path.join(tempDir, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
  return absolutePath;
}
