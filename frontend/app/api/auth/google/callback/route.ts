import { NextRequest, NextResponse } from "next/server";
import { BACKEND_INTERNAL_URL, setSessionCookie } from "@/lib/session";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const STATE_COOKIE = "oauth_state";
// Must match app/api/auth/google/start/route.ts -- see the comment there on why this isn't
// derived from the incoming request's origin.
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

function redirectToLogin(message: string) {
  const url = new URL("/login", APP_BASE_URL);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const googleError = searchParams.get("error");
  if (googleError) {
    return redirectToLogin("Google sign-in was cancelled.");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToLogin("Sign-in request could not be verified. Please try again.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectToLogin("Google sign-in is not configured.");
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${APP_BASE_URL}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return redirectToLogin("Could not complete Google sign-in.");
  }

  const tokenData = await tokenRes.json();
  const idToken = tokenData.id_token as string | undefined;
  const accessToken = tokenData.access_token as string | undefined;
  const calendarRefreshToken = tokenData.refresh_token as string | undefined;
  if (!idToken) {
    return redirectToLogin("Google did not return an identity token.");
  }

  // Some Workspace orgs omit "picture" from the id_token itself even when the account has a
  // photo -- the userinfo endpoint (queried with the access_token) still returns it. This is
  // cosmetic-only and forwarded as a hint; the backend still derives identity solely from the
  // server-verified id_token.
  let pictureUrlHint: string | undefined;
  if (accessToken) {
    try {
      const userinfoRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (userinfoRes.ok) {
        const userinfo = await userinfoRes.json();
        pictureUrlHint = typeof userinfo.picture === "string" ? userinfo.picture : undefined;
      }
    } catch {
      // Best-effort only -- a failure here should never block sign-in.
    }
  }

  // The backend re-verifies this id_token's signature/audience itself -- this call only
  // forwards it, it never trusts a bare email/claim from the client. calendar_refresh_token
  // (present because /start requests access_type=offline + prompt=consent) lets the backend
  // auto-sync approved leave to this employee's Google Calendar later.
  const backendRes = await fetch(`${BACKEND_INTERNAL_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken, calendar_refresh_token: calendarRefreshToken, picture_url_hint: pictureUrlHint }),
    cache: "no-store",
  });

  if (!backendRes.ok) {
    const body = await backendRes.json().catch(() => ({ detail: "Sign-in failed." }));
    return redirectToLogin(typeof body.detail === "string" ? body.detail : "Sign-in failed.");
  }

  const { access_token } = await backendRes.json();
  setSessionCookie(access_token);

  const res = NextResponse.redirect(new URL("/dashboard", APP_BASE_URL));
  res.cookies.delete(STATE_COOKIE);
  return res;
}
