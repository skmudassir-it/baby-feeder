import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://173.249.10.236:5003";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(req, path, "GET");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(req, path, "POST");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(req, path, "PUT");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(req, path, "DELETE");
}

async function proxy(
  req: NextRequest,
  path: string[],
  method: string
): Promise<NextResponse> {
  const url = `${BACKEND_URL}/api/${path.join("/")}`;
  const headers: Record<string, string> = {};

  if (req.headers.get("content-type")) {
    headers["content-type"] = req.headers.get("content-type")!;
  }
  if (req.headers.get("authorization")) {
    headers["authorization"] = req.headers.get("authorization")!;
  }

  try {
    const body =
      method === "GET" || method === "DELETE"
        ? undefined
        : await req.text();

    const resp = await fetch(url, {
      method,
      headers,
      body: body || undefined,
    });

    const data = await resp.text();
    let json;
    try {
      json = JSON.parse(data);
    } catch {
      return new NextResponse(data, {
        status: resp.status,
        headers: { "content-type": "text/plain" },
      });
    }

    return NextResponse.json(json, { status: resp.status });
  } catch (err) {
    console.error("Proxy error:", err);
    return NextResponse.json(
      { error: "Backend unreachable" },
      { status: 502 }
    );
  }
}
