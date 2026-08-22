"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CurrentUser, roleLabel } from "@/lib/types";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";

export default function ProfilePanel({ open, onClose, user }: { open: boolean; onClose: () => void; user: CurrentUser }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const profileHref = user.role === "HR_ADMIN" ? `/admin/employees/${user.id}` : "/dashboard";

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
        <div className="p-5 border-b border-border">
          <div className="flex items-start justify-between">
            <Avatar name={user.full_name} size={64} pictureUrl={user.picture_url} />
            <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center text-muted hover:bg-canvas">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3">
            <div className="text-base font-semibold truncate">{user.full_name}</div>
            <div className="text-xs text-muted mt-0.5">ID: {user.employee_code}</div>
            <div className="text-xs text-muted truncate">{user.email}</div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Link
              href={profileHref}
              onClick={onClose}
              className="flex-1 text-center border border-brand text-brand rounded-md py-2 text-sm font-medium hover:bg-brand-soft"
            >
              My Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium text-danger hover:bg-danger-soft"
            >
              <Icon name="logout" className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-sidebar-active flex items-center justify-center text-white text-sm font-bold shrink-0">
              UW
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">Unwritten Workmate</div>
              <div className="text-xs text-muted truncate">
                {user.position || roleLabel(user.role)}
                {user.department_name ? ` · ${user.department_name}` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
