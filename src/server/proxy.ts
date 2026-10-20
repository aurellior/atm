import { NextRequest, NextResponse } from "next/server";

export function getRemoteApiUrl(): string {
  return (
    process.env.REMOTE_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://apemsapi.sinergimp.co.id"
  ).replace(/\/$/, "");
}

/**
 * Proxies incoming Next.js API requests server-to-server to the existing backend
 * when DATABASE_URL is not configured yet, eliminating browser CORS errors.
 */
export async function proxyToRemoteBackend(
  req: NextRequest,
  targetPath: string
): Promise<NextResponse> {
  const baseUrl = getRemoteApiUrl();
  const search = req.nextUrl.search || "";
  const targetUrl = `${baseUrl}${targetPath}${search}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) {
    headers["Authorization"] = auth;
  }
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  } else {
    headers["Content-Type"] = "application/json";
  }

  let body: BodyInit | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }

    return NextResponse.json(json, { status: response.status });
  } catch (error: any) {
    console.error("Proxy error to remote backend:", error);
    return NextResponse.json(
      {
        error:
          error?.message || "Gagal menghubungi server backend remote",
      },
      { status: 502 }
    );
  }
}
