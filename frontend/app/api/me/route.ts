import { NextResponse } from "next/server";
import { backendFetch, getSessionToken } from "@/lib/session";

export async function GET() {
  if (!getSessionToken()) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }
  const res = await backendFetch("/auth/me");
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
