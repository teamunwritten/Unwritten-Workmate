import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const STATE_COOKIE = "oauth_state";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ detail: "Google sign-in is not configured (missing GOOGLE_CLIENT_ID)." }, { status: 500 });
  }

  const state = randomBytes(24).toString("hex");
  // Deliberately NOT derived from req.nextUrl.origin: behind Docker/standalone Next.js that
  // can resolve to the container's hostname instead of the public origin, and Google requires
  // an exact match to the redirect URI registered in Cloud Console -- so it must be explicit.
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const redirectUri = `${appBaseUrl}/api/auth/google/callback`;

  const authUrl = new URL(GOOGLE_AUTH_ENDPOINT);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  // calendar.events lets the backend auto-create/delete the "On leave" event on approval/
  // cancellation. access_type=offline + prompt=consent guarantee Google actually returns a
  // refresh_token (it's otherwise only issued on the very first consent ever).
  authUrl.searchParams.set("scope", "openid email profile https://www.googleapis.com/auth/calendar.events");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent select_account");

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  return res;
}
