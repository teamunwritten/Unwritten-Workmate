import Link from "next/link";
import { backendFetch } from "@/lib/session";
import { CurrentUser, LeaveApplication, LeaveBalance, LeaveType } from "@/lib/types";
import LeaveTypeIconCard from "@/components/LeaveTypeIconCard";
import Icon from "@/components/Icon";
import LeaveSectionTabs from "@/components/LeaveSectionTabs";
import LeaveApplicationsTable from "@/components/LeaveApplicationsTable";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  const res = await backendFetch(path);
  if (!res.ok) return fallback;
  return res.json();
}

export default async function LeaveHistoryPage({ searchParams }: { searchParams: { year?: string } }) {
  const year = Number(searchParams.year) || new Date().getFullYear();

  const [applications, balances, leaveTypes, user] = await Promise.all([
    getJson<LeaveApplication[]>(`/leave/applications?year=${year}`, []),
    getJson<LeaveBalance[]>(`/leave/balances?year=${year}`, []),
    getJson<LeaveType[]>("/leave/leave-types", []),
    getJson<CurrentUser | null>("/auth/me", null),
  ]);

  const nameByCode = Object.fromEntries(leaveTypes.map((t) => [t.code, t.name]));
  const applications_sorted = [...applications].sort((a, b) => b.applied_at.localeCompare(a.applied_at));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Leave</h1>
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/leave/history?year=${year - 1}`} className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-canvas">
              <Icon name="chevronLeft" className="h-4 w-4 text-muted" />
            </Link>
            <span className="text-muted font-medium">01 Jan {year} — 31 Dec {year}</span>
            <Link href={`/leave/history?year=${year + 1}`} className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-canvas">
              <Icon name="chevronRight" className="h-4 w-4 text-muted" />
            </Link>
          </div>
        </div>
        <Link href="/leave/apply" className="btn-primary text-sm">
          Apply Leave
        </Link>
      </div>

      <LeaveSectionTabs />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {balances
          .filter((b) => !["LOP"].includes(b.leave_type_code))
          .map((b) => (
            <LeaveTypeIconCard key={b.leave_type_id} balance={b} label={nameByCode[b.leave_type_code] || b.leave_type_code} />
          ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Leave Applications</h2>
        </div>
        {applications_sorted.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted">No leave applications in {year}.</div>
        ) : (
          <LeaveApplicationsTable
            applications={applications_sorted}
            nameByCode={nameByCode}
            applicantName={user?.full_name || "You"}
            applicantPictureUrl={user?.picture_url || null}
          />
        )}
      </div>
    </div>
  );
}
