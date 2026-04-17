import { buildLlmsManifest } from "@/app/_lib/developer-platform-docs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return new Response(buildLlmsManifest(new URL(request.url).origin), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
