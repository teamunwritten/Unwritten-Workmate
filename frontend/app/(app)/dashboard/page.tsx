import Link from "next/link";
import { backendFetch } from "@/lib/session";
import {
  Announcement,
  Birthday,
  CurrentUser,
  DepartmentMember,
  LeaveApplication,
  LeaveBalance,
  NewHire,
  UpcomingHoliday,
  roleLabel,
} from "@/lib/types";
import BalanceCard from "@/components/BalanceCard";
import StatusBadge from "@/components/StatusBadge";
import ProfileHeader from "@/components/ProfileHeader";
import Icon from "@/components/Icon";
import DashboardWidget, { WidgetEmpty } from "@/components/DashboardWidget";
import AnnouncementComposer, { DeleteAnnouncementButton } from "@/components/AnnouncementComposer";
import Avatar from "@/components/Avatar";

async function getCurrentUser(): Promise<CurrentUser | null> {
  const res = await backendFetch("/auth/me");
  if (!res.ok) return null;
  return res.json();
}

async function getJson<T>(path: string, fallback: T): Promise<T> {
  const res = await backendFetch(path);
  if (!res.ok) return fallback;
  return res.json();
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const isApprover = user?.role === "MANAGER" || user?.role === "HR_ADMIN";

  const [balances, applications, announcements, birthdays, newHires, deptMembers, holidays, pendingApprovals] =
    await Promise.all([
      getJson<LeaveBalance[]>("/leave/balances", []),
      getJson<LeaveApplication[]>("/leave/applications", []),
      getJson<Announcement[]>("/dashboard/announcements", []),
      getJson<Birthday[]>("/dashboard/birthdays", []),
      getJson<NewHire[]>("/dashboard/new-hires", []),
      getJson<DepartmentMember[]>("/dashboard/department-members", []),
      getJson<UpcomingHoliday[]>("/dashboard/holidays", []),
      isApprover ? getJson<LeaveApplication[]>("/leave/approvals/pending", []) : Promise.resolve([] as LeaveApplication[]),
    ]);

  const currentYear = new Date().getFullYear();
  const pending = applications.filter((a) => a.status === "PENDING").length;
  const approvedThisYear = applications.filter((a) => a.status === "APPROVED" && a.start_date.startsWith(String(currentYear)));
  const daysTaken = Math.round(approvedThisYear.reduce((sum, a) => sum + a.total_deducted_days, 0) * 2) / 2;
  const recent = applications.slice(0, 6);

  return (
    <div className="space-y-6">
      {user && <ProfileHeader user={user} stats={{ pending, approved: approvedThisYear.length, daysTaken }} />}

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Leave balances</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {balances
            .filter((b) => !["WFH", "OD", "LOP"].includes(b.leave_type_code))
            .map((b) => (
              <BalanceCard key={b.leave_type_id} balance={b} />
            ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        <DashboardWidget title="Announcements" accent="danger" action={user?.role === "HR_ADMIN" ? <AnnouncementComposer /> : undefined}>
          {announcements.length === 0 ? (
            <WidgetEmpty>No announcements yet.</WidgetEmpty>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium">{a.title}</div>
                    {user?.role === "HR_ADMIN" && <DeleteAnnouncementButton id={a.id} />}
                  </div>
                  <div className="text-xs text-muted mt-0.5 line-clamp-2">{a.body}</div>
                  <div className="text-[11px] text-muted mt-1">
                    {timeAgo(a.created_at)} · {a.posted_by_name}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardWidget>

        <DashboardWidget title="Birthdays" accent="purple">
          {birthdays.length === 0 ? (
            <WidgetEmpty>No birthdays in the next 30 days.</WidgetEmpty>
          ) : (
            <ul className="space-y-3">
              {birthdays.map((b) => (
                <li key={b.employee_id} className="flex items-center gap-3">
                  <Avatar name={b.full_name} size={32} pictureUrl={b.picture_url} />
                  <div>
                    <div className="text-sm font-medium">{b.full_name}</div>
                    <div className="text-xs text-muted">
                      {new Date(b.date_of_birth + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardWidget>

        <DashboardWidget title="New Hires" accent="brand">
          {newHires.length === 0 ? (
            <WidgetEmpty>No new hires in the last 90 days.</WidgetEmpty>
          ) : (
            <ul className="space-y-3">
              {newHires.map((h) => (
                <li key={h.employee_id} className="flex items-center gap-3">
                  <Avatar name={h.full_name} size={32} pictureUrl={h.picture_url} />
                  <div>
                    <div className="text-sm font-medium">{h.full_name}</div>
                    <div className="text-xs text-muted">{h.position || h.department_name || roleLabel(h.role)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardWidget>

        {isApprover && (
          <DashboardWidget
            title="Requests for Approval"
            accent="warning"
            action={
              pendingApprovals.length > 0 ? (
                <span className="badge bg-warning-soft text-warning">{pendingApprovals.length}</span>
              ) : undefined
            }
          >
            {pendingApprovals.length === 0 ? (
              <WidgetEmpty>Nothing pending.</WidgetEmpty>
            ) : (
              <ul className="space-y-3">
                {pendingApprovals.slice(0, 6).map((app) => (
                  <li key={app.id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{app.leave_type_code}</div>
                      <div className="text-xs text-muted">
                        {app.start_date} → {app.end_date}
                      </div>
                    </div>
                    <StatusBadge status="PENDING" />
                  </li>
                ))}
              </ul>
            )}
            <Link href="/approvals" className="block text-xs text-brand font-medium mt-3">
              View all
            </Link>
          </DashboardWidget>
        )}

        <DashboardWidget title="Department Members" accent="brand">
          {deptMembers.length === 0 ? (
            <WidgetEmpty>No other members in your department yet.</WidgetEmpty>
          ) : (
            <ul className="space-y-3">
              {deptMembers.map((m) => (
                <li key={m.employee_id} className="flex items-center gap-3">
                  <Avatar name={m.full_name} size={32} pictureUrl={m.picture_url} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.full_name}</div>
                    <div className="text-xs text-muted truncate">{m.email}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardWidget>

        <DashboardWidget title="Upcoming Holidays" accent="warning">
          {holidays.length === 0 ? (
            <WidgetEmpty>No upcoming holidays.</WidgetEmpty>
          ) : (
            <ul className="space-y-3">
              {holidays.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{h.name}</div>
                    <div className="text-xs text-muted">{h.holiday_type === "OPTIONAL" ? "Optional" : "Statutory"}</div>
                  </div>
                  <div className="text-sm font-medium text-right shrink-0">
                    {new Date(h.date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardWidget>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Recent applications</h2>
          <Link href="/leave/history" className="text-xs text-brand font-medium">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted flex flex-col items-center gap-2">
            <Icon name="history" className="h-6 w-6 text-muted" />
            No leave applications yet.
          </div>
        ) : (
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((app) => (
                <tr key={app.id}>
                  <td className="font-medium">{app.leave_type_code}</td>
                  <td className="text-muted">
                    {app.start_date} → {app.end_date}
                  </td>
                  <td className="tabular-nums">{app.total_deducted_days}</td>
                  <td>
                    <StatusBadge status={app.is_lop ? "LOP_CONVERTED" : app.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
