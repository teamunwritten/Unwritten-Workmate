import { redirect } from "next/navigation";
import { backendFetch, getSessionToken } from "@/lib/session";
import { CurrentUser } from "@/lib/types";
import AppShell from "@/components/AppShell";
import ClientProviders from "@/components/ClientProviders";

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (!getSessionToken()) return null;
  const res = await backendFetch("/auth/me");
  if (!res.ok) return null;
  return res.json();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await fetchCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <ClientProviders>
      <AppShell user={user!}>{children}</AppShell>
    </ClientProviders>
  );
}
