"use client";

export async function downloadPdfFromUrl(url: string, fallbackFileName = "resume.pdf") {
  const response = await fetch(url, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readDownloadError(response));
  }

  const contentType = response.headers.get("Content-Type") ?? "";

  if (!contentType.toLowerCase().includes("application/pdf")) {
    throw new Error("The server did not return a PDF.");
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = getDownloadFileName(response.headers.get("Content-Disposition")) ?? fallbackFileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
}

function getDownloadFileName(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ""));
  }

  const asciiMatch = contentDisposition.match(/filename="([^"]+)"/i) ??
    contentDisposition.match(/filename=([^;]+)/i);

  return asciiMatch?.[1]?.trim().replace(/^"|"$/g, "") || null;
}

async function readDownloadError(response: Response) {
  try {
    const body = await response.json() as { error?: unknown };

    if (typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // Fall back to status text below when the error is not JSON.
  }

  return response.statusText || "Unable to download this PDF.";
}
