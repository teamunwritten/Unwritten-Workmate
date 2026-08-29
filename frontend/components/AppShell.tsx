"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CurrentUser, roleLabel } from "@/lib/types";
import Icon from "@/components/Icon";
import EmployeeSearch from "@/components/EmployeeSearch";
import Avatar from "@/components/Avatar";
import NotificationsPanel, { NotificationItem } from "@/components/NotificationsPanel";
import ProfilePanel from "@/components/ProfilePanel";
import NavLink from "@/components/NavLink";
import CollapsibleSection from "@/components/CollapsibleSection";
import Breadcrumbs from "@/components/Breadcrumbs";
import { deleteAnnouncement, listAnnouncements } from "@/lib/api/dashboard";
import { listPendingApprovals } from "@/lib/api/leave";
import { emitAnnouncementRemoved, onAnnouncementRemoved } from "@/lib/announcementEvents";
import { NAV_ITEMS, ADMIN_ITEMS } from "@/lib/navigation";

function loadDismissed(userId: number): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(`notif_dismissed_${userId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(userId: number, dismissed: Set<string>) {
  window.localStorage.setItem(`notif_dismissed_${userId}`, JSON.stringify([...dismissed]));
}

function loadSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem("sidebar_collapsed");
  // Collapsed by default -- only an explicit "false" (the user expanded it before) opens it.
  return raw === null ? true : raw === "true";
}

export default function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [appsMenuOpen, setAppsMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const canApprove = user.role === "MANAGER" || user.role === "HR_ADMIN";

  const [notifLoading, setNotifLoading] = useState(true);
  const [allItems, setAllItems] = useState<NotificationItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setDismissed(loadDismissed(user.id));
    setSidebarCollapsed(loadSidebarCollapsed());
  }, [user.id]);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    setNotifLoading(true);
    Promise.all([canApprove ? listPendingApprovals() : Promise.resolve([]), listAnnouncements()])
      .then(([approvals, announcements]) => {
        if (cancelled) return;
        setAllItems([
          ...approvals.map((a) => ({ key: `approval-${a.id}`, kind: "approval" as const, approval: a })),
          ...announcements.map((a) => ({ key: `announcement-${a.id}`, kind: "announcement" as const, announcement: a })),
        ]);
      })
      .finally(() => {
        if (!cancelled) setNotifLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canApprove]);

  useEffect(() => {
    return onAnnouncementRemoved((id) => {
      setAllItems((prev) => prev.filter((item) => item.key !== `announcement-${id}`));
    });
  }, []);

  const visibleItems = allItems.filter((item) => !dismissed.has(item.key));

  async function dismissNotification(key: string) {
    const item = allItems.find((i) => i.key === key);
    // Announcements are shared, org-wide content -- an admin dismissing one here actually
    // deletes it (matching the "Remove" button on the dashboard widget) so it disappears
    // everywhere, not just from their own notification list. A non-admin can't delete it, so
    // their dismissal just hides it locally. Pending-approval notifications always stay
    // local-only dismiss -- dismissing a notification must never resolve a real leave request.
    if (item?.kind === "announcement" && user.role === "HR_ADMIN") {
      setAllItems((prev) => prev.filter((i) => i.key !== key));
      try {
        await deleteAnnouncement(item.announcement!.id);
        emitAnnouncementRemoved(item.announcement!.id);
        router.refresh();
      } catch {
        // Deletion failed -- put it back rather than leaving the UI out of sync with the server.
        setAllItems((prev) => [...prev, item]);
      }
      return;
    }

    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      saveDismissed(user.id, next);
      return next;
    });
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={`${
          sidebarCollapsed ? "w-[84px]" : "w-60"
        } shrink-0 bg-sidebar-bg flex flex-col h-screen sticky top-0 transition-[width] duration-150`}
      >
        <div className={`h-14 flex items-center gap-2 border-b border-white/10 ${sidebarCollapsed ? "justify-center px-2" : "px-4"}`}>
          <div className="h-7 w-7 rounded-md bg-sidebar-active flex items-center justify-center text-white text-xs font-bold shrink-0">
            UW
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white truncate">Unwritten Workmate</div>
              <div className="text-[10.5px] text-sidebar-muted truncate">Team Unwritten</div>
            </div>
          )}
        </div>

        <nav className={`flex-1 overflow-y-auto py-3 ${sidebarCollapsed ? "px-2.5 space-y-1" : "px-2.5 space-y-0.5"}`}>
          {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => {
            // "Leaves" covers the whole /leave/* section (summary, apply, holidays), not just its own href.
            const active =
              item.href === "/leave/history"
                ? (pathname?.startsWith("/leave") ?? false)
                : pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false);
            return (
              <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={active} collapsed={sidebarCollapsed} />
            );
          })}

          {user.role === "HR_ADMIN" && (
            <CollapsibleSection
              title="Admin"
              icon="admin"
              items={ADMIN_ITEMS}
              storageKey="nav_section_admin_open"
              sidebarCollapsed={sidebarCollapsed}
              onNavigate={toggleSidebar}
            />
          )}
        </nav>

        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex items-center gap-2 py-2.5 border-t border-white/10 text-sidebar-muted hover:text-sidebar-text hover:bg-sidebar-raised ${
            sidebarCollapsed ? "justify-center px-0" : "px-4"
          }`}
        >
          <Icon name={sidebarCollapsed ? "chevronRight" : "chevronLeft"} className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span className="text-[11px] font-medium">Collapse</span>}
        </button>

        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-t border-white/10 text-[10.5px] text-sidebar-muted">
            Signed in as <span className="text-sidebar-text">{roleLabel(user.role)}</span>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-5 gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <EmployeeSearch isAdmin={user.role === "HR_ADMIN"} />
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setAppsMenuOpen((v) => !v)}
                className="h-8 w-8 rounded-md flex items-center justify-center text-muted hover:bg-canvas"
                title="Apps"
              >
                <Icon name="grid" className="h-[18px] w-[18px]" />
              </button>
              {appsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAppsMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 w-52 card p-1.5">
                    <div className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                      Unwritten Apps
                    </div>
                    <a
                      href="https://signature.hostunwritten.online/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setAppsMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-ink hover:bg-canvas"
                    >
                      <div className="h-6 w-6 rounded bg-brand-soft text-brand flex items-center justify-center text-[10px] font-bold shrink-0">
                        US
                      </div>
                      Unwritten Sign
                    </a>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative h-8 w-8 rounded-md flex items-center justify-center text-muted hover:bg-canvas"
              title="Notifications"
            >
              <Icon name="bell" className="h-[18px] w-[18px]" />
              {visibleItems.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[13px] h-[13px] px-[3px] rounded-full bg-danger text-white text-[8.5px] font-semibold flex items-center justify-center leading-none">
                  {visibleItems.length > 9 ? "9+" : visibleItems.length}
                </span>
              )}
            </button>
            <button className="h-8 w-8 rounded-md flex items-center justify-center text-muted hover:bg-canvas" title="Settings">
              <Icon name="settings" className="h-[18px] w-[18px]" />
            </button>

            <button onClick={() => setProfileMenuOpen(true)} className="block ml-2">
              <Avatar name={user.full_name} size={32} pictureUrl={user.picture_url} />
            </button>
          </div>
        </header>
        {pathname !== "/dashboard" && (
          <div className="h-9 border-b border-border bg-surface flex items-center px-5">
            <Breadcrumbs />
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6 bg-canvas">{children}</main>
      </div>

      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        items={visibleItems}
        loading={notifLoading}
        onDismiss={dismissNotification}
      />

      <ProfilePanel open={profileMenuOpen} onClose={() => setProfileMenuOpen(false)} user={user} />
    </div>
  );
}
