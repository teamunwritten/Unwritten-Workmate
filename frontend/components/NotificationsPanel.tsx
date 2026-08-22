"use client";

import Link from "next/link";
import { LeaveApplication, Announcement } from "@/lib/types";
import Icon from "@/components/Icon";

export interface NotificationItem {
  key: string;
  kind: "approval" | "announcement";
  approval?: LeaveApplication;
  announcement?: Announcement;
}

export default function NotificationsPanel({
  open,
  onClose,
  items,
  loading,
  onDismiss,
}: {
  open: boolean;
  onClose: () => void;
  items: NotificationItem[];
  loading: boolean;
  onDismiss: (key: string) => void;
}) {
  const pending = items.filter((i) => i.kind === "approval");
  const announcements = items.filter((i) => i.kind === "announcement");

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 z-40 h-full w-96 max-w-full bg-surface border-l border-border shadow-xl transition-transform duration-200 ease-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-14 shrink-0 border-b border-border flex items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {items.length > 0 && <span className="badge bg-brand-soft text-brand">{items.length}</span>}
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center text-muted hover:bg-canvas">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="text-sm text-muted text-center py-10">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted text-center py-10">You're all caught up.</div>
          ) : (
            <>
              {pending.length > 0 && (
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted mb-2">
                    Pending your approval
                  </div>
                  <div className="space-y-2">
                    {pending.map((item) => {
                      const app = item.approval!;
                      return (
                        <div
                          key={item.key}
                          className="group flex items-start gap-2 rounded-lg border border-border px-3 py-2.5 hover:bg-canvas"
                        >
                          <Link href="/approvals" onClick={onClose} className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{app.leave_type_code} leave request</div>
                            <div className="text-xs text-muted mt-0.5">
                              {app.start_date} → {app.end_date}
                            </div>
                          </Link>
                          <button
                            onClick={() => onDismiss(item.key)}
                            title="Dismiss"
                            className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-muted opacity-0 group-hover:opacity-100 hover:bg-border/60"
                          >
                            <Icon name="close" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {announcements.length > 0 && (
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted mb-2">Announcements</div>
                  <div className="space-y-2">
                    {announcements.map((item) => {
                      const a = item.announcement!;
                      return (
                        <div
                          key={item.key}
                          className="group flex items-start gap-2 rounded-lg border border-border px-3 py-2.5"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{a.title}</div>
                            <div className="text-xs text-muted mt-0.5 line-clamp-2">{a.body}</div>
                          </div>
                          <button
                            onClick={() => onDismiss(item.key)}
                            title="Dismiss"
                            className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-muted opacity-0 group-hover:opacity-100 hover:bg-border/60"
                          >
                            <Icon name="close" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
