"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/leave/history", label: "Summary" },
  { href: "/leave/apply", label: "Leave Application" },
  { href: "/leave/holidays", label: "Holidays" },
];

export default function LeaveSectionTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border">
      <div className="flex gap-6 overflow-x-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
