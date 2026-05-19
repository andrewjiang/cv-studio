export function ensureResumePrintUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.searchParams.set("print", "1");
  url.searchParams.delete("autoprint");
  return url.toString();
}

export function ensureResumeAutoPrintUrl(rawUrl: string) {
  const url = new URL(ensureResumePrintUrl(rawUrl));
  url.searchParams.set("autoprint", "1");
  return url.toString();
}
