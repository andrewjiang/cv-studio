#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_SIZE = "1536x864";
const DEFAULT_QUALITY = "medium";
const DEFAULT_WEBP_QUALITY = "82";

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function requireArg(args, name) {
  const value = args[name]?.trim();

  if (!value) {
    throw new Error(`Missing required --${name} argument.`);
  }

  return value;
}

function sanitizeError(value) {
  const apiKey = process.env.OPENAI_API_KEY;
  const text = typeof value === "string" ? value : JSON.stringify(value);

  return apiKey ? text.replaceAll(apiKey, "[redacted]") : text;
}

function commandExists(command) {
  const result = spawnSync("which", [command], { encoding: "utf8" });

  return result.status === 0;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    throw new Error(`${command} failed: ${stderr || stdout || `exit ${result.status}`}`);
  }
}

async function assertNonEmptyFile(filePath) {
  const stats = await fs.stat(filePath);

  if (!stats.isFile() || stats.size === 0) {
    throw new Error(`Expected non-empty file at ${filePath}.`);
  }
}

async function convertPngToWebp(pngPath, webpPath, webpQuality) {
  if (commandExists("cwebp")) {
    run("cwebp", ["-quiet", "-q", webpQuality, pngPath, "-o", webpPath]);
    return;
  }

  if (commandExists("sips")) {
    run("sips", ["-s", "format", "webp", pngPath, "--out", webpPath]);
    return;
  }

  throw new Error("Missing image converter. Install cwebp or run on macOS with sips available.");
}

async function generateImage({
  apiKey,
  model,
  prompt,
  quality,
  size,
}) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      quality,
      size,
      output_format: "png",
    }),
  });

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    const body = await response.text();
    const suffix = requestId ? ` request_id=${requestId}` : "";
    throw new Error(`OpenAI image generation failed with HTTP ${response.status}.${suffix} ${body}`);
  }

  const payload = await response.json();
  const imageBase64 = payload?.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error(`OpenAI response did not include data[0].b64_json: ${JSON.stringify(payload)}`);
  }

  return Buffer.from(imageBase64, "base64");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = requireArg(args, "slug");
  const prompt = requireArg(args, "prompt");
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required in the process environment. Do not read .env.local.");
  }

  const model = args.model || process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL;
  const size = args.size || DEFAULT_SIZE;
  const quality = args.quality || DEFAULT_QUALITY;
  const outDir = args["out-dir"] || "/tmp";
  const webpQuality = args["webp-quality"] || DEFAULT_WEBP_QUALITY;
  const pngPath = path.join(outDir, `${slug}-hero.png`);
  const webpPath = path.join(outDir, `${slug}-hero.webp`);

  await fs.mkdir(outDir, { recursive: true });

  const imageBytes = await generateImage({
    apiKey,
    model,
    prompt,
    quality,
    size,
  });

  await fs.writeFile(pngPath, imageBytes);
  await assertNonEmptyFile(pngPath);
  await convertPngToWebp(pngPath, webpPath, webpQuality);
  await assertNonEmptyFile(webpPath);

  console.log(`HERO_PNG: ${pngPath}`);
  console.log(`HERO_WEBP: ${webpPath}`);
  console.log(`MODEL: ${model}`);
  console.log(`SIZE: ${size}`);
  console.log(`PROMPT_USED: ${prompt}`);
}

main().catch((error) => {
  console.error(`ERROR: ${sanitizeError(error?.message || String(error))}`);
  process.exit(1);
});
