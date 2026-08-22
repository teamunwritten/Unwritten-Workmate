import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/session";

async function forward(req: NextRequest, params: { path: string[] }) {
  const backendPath = "/" + params.path.join("/");
  const search = req.nextUrl.search;

  const hasBody = !["GET", "HEAD", "DELETE"].includes(req.method);
  // arrayBuffer (not text()) so binary bodies -- file uploads, multipart boundaries -- survive
  // the proxy hop unmangled.
  const bodyBuffer = hasBody ? await req.arrayBuffer() : undefined;
  const incomingContentType = req.headers.get("content-type");

  const res = await backendFetch(`${backendPath}${search}`, {
    method: req.method,
    body: bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
    headers: incomingContentType ? { "Content-Type": incomingContentType } : undefined,
  });

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  // Binary/file passthrough (e.g. file downloads) -- must not go through text(), which would
  // corrupt non-text content.
  const buffer = await res.arrayBuffer();
  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", contentType || "application/octet-stream");
  const disposition = res.headers.get("content-disposition");
  if (disposition) responseHeaders.set("Content-Disposition", disposition);
  return new NextResponse(buffer, { status: res.status, headers: responseHeaders });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params);
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params);
}
