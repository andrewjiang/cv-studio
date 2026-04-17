#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { PDFDocument } from "pdf-lib";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const execFile = promisify(execFileCallback);
const baseUrl = normalizeOrigin(
  process.env.TINYCV_PDF_TEST_BASE_URL ||
    process.env.BASE_URL ||
    process.env.TINYCV_APP_URL ||
    `http://localhost:${process.env.PORT || "3101"}`,
);
const artifactDir = process.env.TINYCV_PDF_TEST_ARTIFACT_DIR || ".data";
const timeoutMs = Number(process.env.TINYCV_PDF_TEST_TIMEOUT_MS || 90_000);
const workerSecret = process.env.TINYCV_WORKER_SECRET || "tinycv-local-worker-secret";
const bootstrapSecret = process.env.TINYCV_PLATFORM_BOOTSTRAP_SECRET || "tinycv-local-bootstrap-secret";
const visualMode = process.env.TINYCV_PDF_TEST_VISUAL === "1";
const visualDiffThreshold = Number(process.env.TINYCV_PDF_VISUAL_DIFF_THRESHOLD || 0.01);

const LOCAL_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

async function main() {
  const runId = randomUUID().slice(0, 8);
  const template = await fetchJson("/api/v1/templates/engineer");
  const apiKey = process.env.TINYCV_API_KEY || await bootstrapProject(runId);

  log(`Base URL: ${baseUrl}`);
  log(`Using ${process.env.TINYCV_API_KEY ? "provided API key" : "fresh test project"}`);

  const created = await fetchJson("/api/v1/resumes", {
    body: {
      input_format: "markdown",
      markdown: template.markdown,
      template_key: "engineer",
      title: `PDF Renderer Check ${runId}`,
    },
    headers: apiHeaders(apiKey, `pdf-create-${runId}`),
    method: "POST",
  });

  const published = await fetchJson(`/api/v1/resumes/${created.resume_id}/publish`, {
    body: {},
    headers: apiHeaders(apiKey, `pdf-publish-${runId}`),
    method: "POST",
  });

  const queued = await fetchJson(`/api/v1/resumes/${created.resume_id}/pdf-jobs`, {
    body: {},
    headers: apiHeaders(apiKey, `pdf-job-${runId}`),
    method: "POST",
  });

  const completed = await waitForPdfJob({
    apiKey,
    deadline: Date.now() + timeoutMs,
    jobId: queued.job_id,
  });

  if (!completed.pdf_url) {
    throw new Error(`PDF job ${completed.job_id} completed without a pdf_url.`);
  }

  const pdfUrl = absolutize(completed.pdf_url);
  const pdfBytes = await fetchBytes(pdfUrl);
  const pdf = await PDFDocument.load(pdfBytes);
  const firstPage = pdf.getPage(0);
  const size = firstPage.getSize();

  assert(pdf.getPageCount() === 1, `Expected a one-page PDF, received ${pdf.getPageCount()} pages.`);
  assertNear(size.width, 612, 2, "PDF page width should match US Letter width.");
  assertNear(size.height, 792, 2, "PDF page height should match US Letter height.");

  await mkdir(artifactDir, { recursive: true });
  const pdfPath = path.join(artifactDir, "pdf-renderer-check.pdf");
  const reportPath = path.join(artifactDir, "pdf-renderer-check.json");

  await writeFile(pdfPath, pdfBytes);
  await writeFile(reportPath, JSON.stringify({
    pageCount: pdf.getPageCount(),
    pageSize: size,
    pdfPath,
    pdfUrl,
    publicUrl: published.public_url,
    resumeId: created.resume_id,
    status: completed.status,
  }, null, 2));

  if (visualMode) {
    const visualReport = await runVisualComparison({
      actualPdfPath: pdfPath,
      publicUrl: published.public_url,
    });

    await writeFile(reportPath, JSON.stringify({
      pageCount: pdf.getPageCount(),
      pageSize: size,
      pdfPath,
      pdfUrl,
      publicUrl: published.public_url,
      resumeId: created.resume_id,
      status: completed.status,
      visual: visualReport,
    }, null, 2));

    log(`Visual diff ratio: ${(visualReport.diffRatio * 100).toFixed(3)}%`);
    log(`Expected PNG: ${visualReport.expectedPngPath}`);
    log(`Actual PNG: ${visualReport.actualPngPath}`);
    log(`Diff PNG: ${visualReport.diffPngPath}`);
  }

  log(`Public URL: ${published.public_url}`);
  log(`PDF URL: ${pdfUrl}`);
  log(`Saved PDF: ${pdfPath}`);
  log(`Saved report: ${reportPath}`);
}

async function bootstrapProject(runId) {
  const response = await fetchJson("/api/v1/projects/bootstrap", {
    body: {
      api_key_label: "PDF renderer smoke test",
      name: `Tiny CV PDF Check ${runId}`,
    },
    headers: {
      "content-type": "application/json",
      "x-tinycv-bootstrap-secret": bootstrapSecret,
    },
    method: "POST",
  });

  if (!response.apiKey?.key) {
    throw new Error("Project bootstrap response did not include apiKey.key.");
  }

  return response.apiKey.key;
}

async function runVisualComparison({ actualPdfPath, publicUrl }) {
  const expectedPdfPath = path.join(artifactDir, "pdf-renderer-expected.pdf");
  const diffPngPath = path.join(artifactDir, "pdf-renderer-diff.png");
  const printUrl = addPrintParam(publicUrl);

  await assertPdftoppmAvailable();
  await writeFile(expectedPdfPath, await renderExpectedPdf(printUrl));

  const expectedPngPath = await rasterizeFirstPage(expectedPdfPath, "pdf-renderer-expected");
  const actualPngPath = await rasterizeFirstPage(actualPdfPath, "pdf-renderer-check");
  const expectedPng = PNG.sync.read(await readFile(expectedPngPath));
  const actualPng = PNG.sync.read(await readFile(actualPngPath));

  assert(
    expectedPng.width === actualPng.width && expectedPng.height === actualPng.height,
    `Expected and actual PDF rasters have different dimensions: ${expectedPng.width}x${expectedPng.height} vs ${actualPng.width}x${actualPng.height}.`,
  );

  const diffPng = new PNG({
    height: expectedPng.height,
    width: expectedPng.width,
  });
  const changedPixels = pixelmatch(
    expectedPng.data,
    actualPng.data,
    diffPng.data,
    expectedPng.width,
    expectedPng.height,
    {
      includeAA: true,
      threshold: 0.12,
    },
  );
  const diffRatio = changedPixels / (expectedPng.width * expectedPng.height);

  await writeFile(diffPngPath, PNG.sync.write(diffPng));
  assert(
    diffRatio <= visualDiffThreshold,
    `PDF visual diff ratio ${(diffRatio * 100).toFixed(3)}% exceeded ${(visualDiffThreshold * 100).toFixed(3)}%.`,
  );

  return {
    actualPngPath,
    changedPixels,
    diffPngPath,
    diffRatio,
    expectedPdfPath,
    expectedPngPath,
    printUrl,
    threshold: visualDiffThreshold,
  };
}

async function renderExpectedPdf(printUrl) {
  const puppeteer = await import("puppeteer-core");
  const browserWsEndpoint =
    process.env.TINYCV_BROWSER_WS_ENDPOINT?.trim() ||
    process.env.BROWSERLESS_WS_ENDPOINT?.trim() ||
    null;
  const browser = browserWsEndpoint
    ? await puppeteer.connect({ browserWSEndpoint: browserWsEndpoint })
    : await puppeteer.launch({
      args: [
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-setuid-sandbox",
        "--headless=new",
        "--no-sandbox",
      ],
      executablePath: await getRequiredChromeExecutablePath(),
      headless: true,
      pipe: true,
    });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      deviceScaleFactor: 1,
      height: 1056,
      width: 816,
    });
    await page.goto(printUrl, {
      timeout: 30_000,
      waitUntil: "networkidle0",
    });
    await page.emulateMediaType("print");

    return await page.pdf({
      margin: {
        bottom: "0in",
        left: "0in",
        right: "0in",
        top: "0in",
      },
      preferCSSPageSize: true,
      printBackground: true,
      timeout: 30_000,
    });
  } finally {
    await browser.close();
  }
}

async function rasterizeFirstPage(pdfPath, outputName) {
  const outputPrefix = path.join(artifactDir, outputName);

  await execFile("pdftoppm", [
    "-f",
    "1",
    "-l",
    "1",
    "-png",
    "-r",
    "144",
    pdfPath,
    outputPrefix,
  ]);

  return `${outputPrefix}-1.png`;
}

async function assertPdftoppmAvailable() {
  try {
    await execFile("pdftoppm", ["-v"]);
  } catch {
    throw new Error(
      "Visual PDF comparison requires Poppler's pdftoppm. Install poppler, or run pnpm test:pdf for the portable smoke test.",
    );
  }
}

async function getRequiredChromeExecutablePath() {
  const explicitPath = process.env.TINYCV_CHROME_EXECUTABLE_PATH?.trim();

  if (explicitPath) {
    await assertPathExists(explicitPath);
    return explicitPath;
  }

  for (const candidate of LOCAL_CHROME_CANDIDATES) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Visual PDF comparison requires Chromium. Set TINYCV_BROWSER_WS_ENDPOINT or TINYCV_CHROME_EXECUTABLE_PATH.",
  );
}

async function waitForPdfJob({ apiKey, deadline, jobId }) {
  let workerWarningShown = false;

  while (Date.now() < deadline) {
    const job = await fetchJson(`/api/v1/pdf-jobs/${jobId}`, {
      headers: bearerHeaders(apiKey),
    });

    if (job.status === "completed") {
      return job;
    }

    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(`PDF job ${jobId} ended with status ${job.status}: ${job.error_message || job.error_code || "unknown error"}`);
    }

    const workerResponse = await fetchJson("/api/v1/jobs/process", {
      body: {
        pdf_job_limit: 1,
        webhook_limit: 1,
      },
      headers: {
        authorization: `Bearer ${workerSecret}`,
        "content-type": "application/json",
        "x-tinycv-worker-secret": workerSecret,
      },
      method: "POST",
      softFail: true,
    });

    if (!workerResponse.ok && !workerWarningShown) {
      workerWarningShown = true;
      log(`Worker trigger returned ${workerResponse.status}; continuing to poll because after() may already be processing the job.`);
    }

    await sleep(1_500);
  }

  throw new Error(`Timed out waiting for PDF job ${jobId}. Increase TINYCV_PDF_TEST_TIMEOUT_MS if the browser service is slow.`);
}

async function fetchJson(pathOrUrl, options = {}) {
  const response = await fetch(absolutize(pathOrUrl), {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: options.headers,
    method: options.method || "GET",
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    if (options.softFail) {
      return {
        body: json,
        ok: false,
        status: response.status,
      };
    }

    throw new Error(`${options.method || "GET"} ${pathOrUrl} returned ${response.status}: ${text}`);
  }

  return options.softFail
    ? {
      body: json,
      ok: true,
      status: response.status,
    }
    : json;
}

async function fetchBytes(pathOrUrl) {
  const response = await fetch(absolutize(pathOrUrl));

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET ${pathOrUrl} returned ${response.status}: ${text}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function apiHeaders(apiKey, idempotencyKey) {
  return {
    ...bearerHeaders(apiKey),
    "content-type": "application/json",
    "idempotency-key": idempotencyKey,
  };
}

function bearerHeaders(apiKey) {
  return {
    authorization: `Bearer ${apiKey}`,
  };
}

function absolutize(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function addPrintParam(pathOrUrl) {
  const url = new URL(absolutize(pathOrUrl));
  url.searchParams.set("print", "1");
  return url.toString();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNear(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message} Expected ${expected}, received ${actual}.`);
  }
}

function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertPathExists(candidatePath) {
  if (!(await pathExists(candidatePath))) {
    throw new Error(`Chrome executable not found at ${candidatePath}.`);
  }
}

async function pathExists(candidatePath) {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

function log(message) {
  console.log(`[pdf-check] ${message}`);
}

main().catch((error) => {
  console.error(`[pdf-check] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
