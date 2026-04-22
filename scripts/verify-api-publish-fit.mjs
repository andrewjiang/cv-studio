#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";

const baseUrl = normalizeOrigin(
  process.env.TINYCV_API_FIT_TEST_BASE_URL ||
    process.env.BASE_URL ||
    process.env.TINYCV_APP_URL ||
    `http://localhost:${process.env.PORT || "3101"}`,
);
const bootstrapSecret = process.env.TINYCV_PLATFORM_BOOTSTRAP_SECRET || "tinycv-local-bootstrap-secret";
const timeoutMs = Number(process.env.TINYCV_API_FIT_TEST_TIMEOUT_MS || 60_000);

const LOCAL_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

const denseResumeMarkdown = `---
stylePreset: technical
accentTone: forest
density: compact
headerAlignment: left
---

# Andrew Jiang
Founder & Product Operator
Los Angeles, CA | [(510) 646-3356](tel:+15106463356) | [andrew.h.jiang@gmail.com](mailto:andrew.h.jiang@gmail.com) | [linkedin.com/in/andrewjiang](https://www.linkedin.com/in/andrewjiang) | [github.com/andrewjiang](https://github.com/andrewjiang) | [x.com/andrewjiang](https://x.com/andrewjiang)

## Summary
Builder and founder with deep business development, product management, design, and engineering experience. YC alum.

## Experience
### Founder and CEO | LockIn
*Los Angeles, CA | Jun 2025 - Present*
- Built LockIn from idea to $50K ARR, owning product design, frontend, LLM inference pipeline, and internal tooling.
- Ran end-to-end GTM across outbound, demos, and customer success; built automation and interactive sales collateral that accelerated prospect education and conversion.
- Designed an LLM identity enrichment engine that maps Telegram contacts to real-world profiles using public and private data sources, bio signals, and membership graphs.
- Implemented an auto-research framework that ran 50+ experiments on prompt design, tool-call queries, and model selection, cutting per-contact inference cost by 75% while matching the accuracy of a model that was 4x more expensive.

### Cofounder and General Partner | Curated
*Los Angeles, CA | Oct 2021 - Present*
- Main fund operator and curator for one of the largest digital art collections in the world, overseeing fundraising, finance, accounting, legal, compliance, security, and custody.
- Built internal software for portfolio management, secondary market analysis and alerts, and accounting workflows.
- Wrote editorials on curation and leading digital artists that became canonical references and directly led to at least $20M in secondary market sales.

### Cofounder and CEO | Soda Labs
*Los Angeles, CA | May 2018 - Jan 2021*
- Built Soda Labs into a hardware-as-a-service company and led the business through acquisition by Foxconn in January 2021.
- Launched Nimble OS, a custom Android OS for large interactive displays, and worked with Foxconn and Sharp to ship it in the Windows Collaboration Display.
- Launched Sparkpoint, an interactive retail signage solution for wine and spirits stores, and signed a nationwide partnership with Southern Glazer's.
- Launched LivMote, an enterprise temperature sensor; sold 5K+ units and secured distribution partnerships with Sharp, Allied Universal, and DaVita Healthcare.

## Additional Experience
- Product Manager, Sprig (2015 - 2016)
- Cofounder and CEO, Bayes Impact (Apr 2014 - Apr 2015)
- Private Equity Associate, American Securities (Aug 2012 - Feb 2014)
- Consultant, Boston Consulting Group (2010 - 2012)

## Education
### NYU Stern School of Business
*Dual B.S. in Finance and Economics, Minor in Statistics*
- Magna Cum Laude, Beta Gamma Sigma
- Graduate TA for Nobel Laureate Robert Engle

## Skills
Leadership: Product strategy, business development, fundraising, GTM, customer success
Technical: JavaScript, Python, Solidity, LLM systems, prompt design, inference optimization
Design & Analytics: Figma, Photoshop, SQL, R, Excel / VBA`;

async function main() {
  const runId = randomUUID().slice(0, 8);
  const apiKey = process.env.TINYCV_API_KEY || await bootstrapProject(runId);

  log(`Base URL: ${baseUrl}`);
  log(`Using ${process.env.TINYCV_API_KEY ? "provided API key" : "fresh test project"}`);

  const validation = await fetchJson("/api/v1/resumes/validate", {
    body: {
      input_format: "markdown",
      markdown: denseResumeMarkdown,
      quality_gate: "publish",
      template_key: "founder",
    },
    headers: bearerJsonHeaders(apiKey),
    method: "POST",
  });

  assert(validation.valid === true, `Publish validation failed: ${JSON.stringify(validation.errors)}`);
  assert(validation.publish_ready === true, `Resume was not publish-ready: ${JSON.stringify(validation.publish_errors)}`);

  const created = await fetchJson("/api/v1/resumes", {
    body: {
      input_format: "markdown",
      markdown: denseResumeMarkdown,
      template_key: "founder",
      title: `API Fit Check ${runId}`,
    },
    headers: apiHeaders(apiKey, `api-fit-create-${runId}`),
    method: "POST",
  });

  const published = await fetchJson(`/api/v1/resumes/${created.resume_id}/publish`, {
    body: {},
    headers: apiHeaders(apiKey, `api-fit-publish-${runId}`),
    method: "POST",
  });

  assert(published.public_url, "Published resume did not include public_url.");

  const browser = await openBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({
      deviceScaleFactor: 1,
      height: 1200,
      width: 1280,
    });
    await page.goto(absolutize(published.public_url), {
      timeout: timeoutMs,
      waitUntil: "networkidle0",
    });
    await page.evaluate(async () => {
      await document.fonts?.ready;
    });

    const fit = await page.evaluate(() => {
      const content = document.querySelector(".cv-sheet .cv-content-root");
      const bounds = content?.parentElement;

      if (!content || !bounds) {
        throw new Error("Published resume did not render desktop fit nodes.");
      }

      const boundsRect = bounds.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const scale = Number.parseFloat(
        getComputedStyle(content).getPropertyValue("--cv-scale") || "1",
      );

      return {
        bottomGap: boundsRect.bottom - contentRect.bottom,
        overflow: content.scrollHeight > bounds.clientHeight + 1,
        scale,
      };
    });

    assert(fit.overflow === false, `Published resume content overflowed: ${JSON.stringify(fit)}`);
    assert(fit.bottomGap >= 16, `Published resume bottom gap is too tight: ${fit.bottomGap}px.`);
    assert(fit.bottomGap <= 120, `Published resume bottom gap is too loose: ${fit.bottomGap}px.`);

    log(`Public URL: ${published.public_url}`);
    log(`Measured scale: ${fit.scale.toFixed(3)}`);
    log(`Bottom gap: ${fit.bottomGap.toFixed(1)}px`);
  } finally {
    await browser.close();
  }
}

async function bootstrapProject(runId) {
  const response = await fetchJson("/api/v1/projects/bootstrap", {
    body: {
      api_key_label: "API publish fit smoke test",
      name: `Tiny CV API Fit Check ${runId}`,
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

async function openBrowser() {
  const puppeteer = await import("puppeteer-core");
  const browserWsEndpoint =
    process.env.TINYCV_BROWSER_WS_ENDPOINT?.trim() ||
    process.env.BROWSERLESS_WS_ENDPOINT?.trim() ||
    null;

  if (browserWsEndpoint) {
    return puppeteer.connect({ browserWSEndpoint: browserWsEndpoint });
  }

  return puppeteer.launch({
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

  throw new Error("API publish fit check requires Chromium. Set TINYCV_BROWSER_WS_ENDPOINT or TINYCV_CHROME_EXECUTABLE_PATH.");
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
    throw new Error(`${options.method || "GET"} ${pathOrUrl} returned ${response.status}: ${text}`);
  }

  return json;
}

function apiHeaders(apiKey, idempotencyKey) {
  return {
    ...bearerJsonHeaders(apiKey),
    "idempotency-key": idempotencyKey,
  };
}

function bearerJsonHeaders(apiKey) {
  return {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
}

function absolutize(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, "");
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
  console.log(`[api-fit-check] ${message}`);
}

main().catch((error) => {
  console.error(`[api-fit-check] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
