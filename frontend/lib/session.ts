import { cookies } from "next/headers";

const COOKIE_NAME = "session";

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    // Defaults to false so the docker-compose deployment (served over plain HTTP on
    // localhost) works out of the box; set COOKIE_SECURE=true when serving over HTTPS.
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h, matches backend JWT expiry
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export function getSessionToken(): string | undefined {
  return cookies().get(COOKIE_NAME)?.value;
}

export const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:8000";

export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getSessionToken();
  const headers = new Headers(init.headers);
  // Don't force JSON if the caller already set a content-type (e.g. multipart/form-data with
  // its boundary, when proxying a file upload) -- overriding it would corrupt the body.
  if (!headers.has("Content-Type") && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${BACKEND_INTERNAL_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
