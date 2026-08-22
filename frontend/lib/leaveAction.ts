import { backendFetch } from "@/lib/session";

export interface LeaveActionResult {
  ok: boolean;
  title: string;
  message: string;
}

export async function resolveLeaveActionToken(token: string | undefined): Promise<LeaveActionResult> {
  if (!token) {
    return { ok: false, title: "Missing link", message: "This action link is missing its token." };
  }
  try {
    const res = await backendFetch(`/actions/leave?token=${encodeURIComponent(token)}`, { method: "POST" });
    if (!res.ok) {
      return { ok: false, title: "Something went wrong", message: "Could not process this action. Please use the portal instead." };
    }
    return res.json();
  } catch {
    return { ok: false, title: "Something went wrong", message: "Could not reach the server. Please use the portal instead." };
  }
}
