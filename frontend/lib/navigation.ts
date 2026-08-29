export interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/leave/history", label: "Leaves", icon: "apply" },
  { href: "/approvals", label: "Approvals", icon: "approvals", roles: ["MANAGER", "HR_ADMIN"] },
  { href: "/calendar", label: "Team Calendar", icon: "calendar" },
  { href: "/org-chart", label: "Org Chart", icon: "tree" },
  { href: "/files", label: "Files", icon: "folder" },
];

export const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin/employees", label: "Employees", icon: "employees" },
  { href: "/admin/leave-types", label: "Leave Types", icon: "leaveType" },
  { href: "/admin/policies", label: "Policies", icon: "policy" },
  { href: "/admin/holidays", label: "Holidays", icon: "holiday" },
  { href: "/admin/restrictions", label: "Restrictions", icon: "restriction" },
  { href: "/admin/balance-adjustments", label: "Balance Adjustments", icon: "adjustment" },
];

// All route labels, longest href first, so breadcrumb matching prefers the most specific match.
export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, ...ADMIN_ITEMS].sort((a, b) => b.href.length - a.href.length);

export const SECTION_LABELS: Record<string, string> = {
  "/leave": "Leaves",
  "/admin": "Admin",
};
