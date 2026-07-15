import { BACKEND_API_KEY, BACKEND_URL } from "@/lib/server-config";

// GDPR data-portability export proxy. The backend API key stays server-side.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  const customDataKey = url.searchParams.get("customDataKey");
  const customDataValue = url.searchParams.get("customDataValue");

  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (customDataKey) params.set("customDataKey", customDataKey);
  if (customDataValue) params.set("customDataValue", customDataValue);

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/export?${params.toString()}`, {
      headers: { "X-API-Key": BACKEND_API_KEY },
      cache: "no-store",
    });
    if (!res.ok) {
      return new Response(`Backend error: ${res.status}`, { status: 502 });
    }
    const body = await res.json();
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="visitor-analytics-export.json"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(message, { status: 502 });
  }
}
