async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const error = new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
    (error as any).body = body;
    (error as any).status = res.status;
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiGet = <T>(path: string) => request<T>(path, { method: "GET" });
export const apiPost = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined });
export const apiPatch = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined });
export const apiDelete = <T>(path: string) => request<T>(path, { method: "DELETE" });

/** Multipart upload -- deliberately bypasses request()'s default JSON content-type so the
 * browser can set the multipart boundary itself. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, { method: "POST", body: formData, cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const error = new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
    (error as any).body = body;
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
}
