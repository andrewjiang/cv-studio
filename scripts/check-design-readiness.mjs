#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_BASE_CANDIDATES = [
  process.env.TINYCV_DESIGN_BASE_REF,
  "cv-studio/main",
  "origin/main",
  "main",
].filter(Boolean);

const DARK_GREEN_BACKGROUND = /^(?:hover:|focus:|active:|group-hover:)?bg-(?:\[#(?:065f46|044e34)\]|\[var\(--accent(?:-strong)?\)\]|(?:emerald|green|teal)-(?:600|700|800|900|950))$/;
const DARK_TEXT = /^(?:hover:|focus:|active:|group-hover:)?(?:text-(?:black|slate|gray|zinc|neutral|stone)(?:-\d{2,3})?|text-\[#(?:0|1|2)[0-9a-fA-F]{2,6}\])$/;
const IMPORTANT_WHITE_TEXT = /^(?:hover:|focus:|active:|group-hover:)?!text-white(?:\/\d{1,3})?$/;
const TRUSTED_PRIMARY_CLASS = /\b(?:brandPrimaryButtonClass|primaryActionButtonClass)\b/;
const INTERACTIVE_TAG = /<(?:button|Link|a)\b/;
const FRONTEND_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);

export function isFrontendFile(filePath) {
  const normalizedPath = filePath.split(path.sep).join("/");
  const appPathIndex = normalizedPath.indexOf("src/app/");
  const relativePath = appPathIndex >= 0 ? normalizedPath.slice(appPathIndex) : normalizedPath;

  if (!relativePath.startsWith("src/app/")) {
    return false;
  }

  if (relativePath.includes(".test.")) {
    return false;
  }

  return FRONTEND_EXTENSIONS.has(path.extname(relativePath));
}

export function checkDesignReadiness(files) {
  const findings = [];

  for (const file of files) {
    if (!isFrontendFile(file) || !existsSync(file)) {
      continue;
    }

    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    const contexts = [
      ...extractInteractiveOpeningTagContexts(lines),
      ...extractStandaloneButtonClassContexts(lines),
    ];
    const reported = new Set();

    for (const context of contexts) {
      const tokens = tokenizeClassLikeText(context.text);
      const hasDarkGreenBackground = tokens.some((token) => DARK_GREEN_BACKGROUND.test(token));
      const hasTrustedPrimaryClass = TRUSTED_PRIMARY_CLASS.test(context.text);

      if (!hasDarkGreenBackground && !hasTrustedPrimaryClass) {
        continue;
      }

      const hasImportantWhiteText = tokens.some((token) => IMPORTANT_WHITE_TEXT.test(token));
      const darkTextTokens = tokens.filter((token) => DARK_TEXT.test(token));

      if (hasDarkGreenBackground && !hasImportantWhiteText && !hasTrustedPrimaryClass) {
        pushFinding(reported, findings, {
          file,
          line: context.line,
          message: "Dark brand-green buttons must use `!text-white` or `brandPrimaryButtonClass`.",
          snippet: context.snippet,
        });
      }

      if (hasDarkGreenBackground && darkTextTokens.length > 0 && !hasImportantWhiteText && !hasTrustedPrimaryClass) {
        pushFinding(reported, findings, {
          file,
          line: context.line,
          message: `Dark brand-green button includes dark text token(s): ${[...new Set(darkTextTokens)].join(", ")}.`,
          snippet: context.snippet,
        });
      }
    }

    for (let index = 0; index < lines.length; index += 1) {
      const lineTokens = tokenizeClassLikeText(lines[index]);
      const darkTextTokensOnLine = lineTokens.filter((token) => DARK_TEXT.test(token));

      if (TRUSTED_PRIMARY_CLASS.test(lines[index]) && darkTextTokensOnLine.length > 0 && !lineTokens.some((token) => IMPORTANT_WHITE_TEXT.test(token))) {
        pushFinding(reported, findings, {
          file,
          line: index + 1,
          message: `Dark brand-green button includes dark text token(s): ${[...new Set(darkTextTokensOnLine)].join(", ")}.`,
          snippet: lines[index].trim(),
        });
      }
    }
  }

  return findings;
}

export function extractInteractiveOpeningTagContexts(lines) {
  const contexts = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!INTERACTIVE_TAG.test(lines[index])) {
      continue;
    }

    const start = index;
    const collected = [lines[index]];

    while (index < lines.length - 1 && !isOpeningTagClosed(lines[index])) {
      index += 1;
      collected.push(lines[index]);
    }

    contexts.push({
      line: start + 1,
      snippet: lines[start].trim(),
      text: collected.join(" "),
    });
  }

  return contexts;
}

export function extractStandaloneButtonClassContexts(lines) {
  return lines.flatMap((line, index) => {
    if (!hasStandaloneButtonShape(line) || !line.includes("bg-")) {
      return [];
    }

    return [{
      line: index + 1,
      snippet: line.trim(),
      text: line,
    }];
  });
}

function hasStandaloneButtonShape(line) {
  const tokens = tokenizeClassLikeText(line);
  const hasHorizontalPadding = tokens.some((token) => /^px-/.test(token));
  const hasVerticalPadding = tokens.some((token) => /^py-/.test(token));

  return TRUSTED_PRIMARY_CLASS.test(line) || (tokens.includes("inline-flex") && (hasHorizontalPadding || hasVerticalPadding)) || (hasHorizontalPadding && hasVerticalPadding);
}

function isOpeningTagClosed(line) {
  return line.replaceAll("=>", "").includes(">");
}

function pushFinding(reported, findings, finding) {
  const key = `${finding.file}:${finding.line}:${finding.message}`;

  if (reported.has(key)) {
    return;
  }

  reported.add(key);
  findings.push(finding);
}

export function tokenizeClassLikeText(text) {
  return text
    .split(/[\s"'`{}()]+/)
    .map((token) => token.replace(/^[?:.,]+|[?:.,;]+$/g, ""))
    .filter(Boolean);
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes("--all") ? "all" : "changed";
  const baseArgIndex = args.indexOf("--base");
  const baseRef = baseArgIndex >= 0 ? args[baseArgIndex + 1] : findBaseRef();
  const files = mode === "all" ? listTrackedFrontendFiles() : listChangedFiles(baseRef);
  const frontendFiles = [...new Set(files)].filter(isFrontendFile);

  if (frontendFiles.length === 0) {
    console.log("Tiny CV design readiness: no changed frontend files, skipping.");
    return;
  }

  const findings = checkDesignReadiness(frontendFiles);

  if (findings.length === 0) {
    console.log(`Tiny CV design readiness: checked ${frontendFiles.length} frontend file(s), no dark-green button contrast issues.`);
    return;
  }

  console.error(`Tiny CV design readiness: ${findings.length} dark-green button contrast issue(s).`);

  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
    if (finding.snippet) {
      console.error(`  ${finding.snippet}`);
    }
  }

  console.error("\nUse `brandPrimaryButtonClass` for primary CTAs, or add `!text-white` to dark green buttons.");
  process.exitCode = 1;
}

function findBaseRef() {
  for (const candidate of DEFAULT_BASE_CANDIDATES) {
    try {
      execFileSync("git", ["rev-parse", "--verify", candidate], { stdio: "ignore" });
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  return "";
}

function listChangedFiles(baseRef) {
  const files = [];

  if (baseRef) {
    files.push(...gitLines(["diff", "--name-only", `${baseRef}...HEAD`]));
  }

  files.push(...gitLines(["diff", "--name-only"]));
  files.push(...gitLines(["diff", "--cached", "--name-only"]));
  files.push(...gitLines(["ls-files", "--others", "--exclude-standard"]));

  return files;
}

function listTrackedFrontendFiles() {
  return gitLines(["ls-files", "src/app"]);
}

function gitLines(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";

if (import.meta.url === invokedPath || fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
