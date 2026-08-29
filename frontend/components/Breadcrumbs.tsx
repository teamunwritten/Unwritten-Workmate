"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { ALL_NAV_ITEMS, SECTION_LABELS } from "@/lib/navigation";

export default function Breadcrumbs() {
  const pathname = usePathname() || "/dashboard";
  if (pathname === "/dashboard") return null;

  const match = ALL_NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  const segments = pathname.split("/").filter(Boolean);
  const sectionHref = `/${segments[0]}`;
  const sectionLabel = SECTION_LABELS[sectionHref];
  const showSection = sectionLabel && match && match.href !== sectionHref;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px] text-muted min-w-0">
      <Link href="/dashboard" className="flex items-center hover:text-ink shrink-0">
        <Icon name="home" className="h-3.5 w-3.5" />
      </Link>
      {showSection && (
        <>
          <Icon name="chevronRight" className="h-3 w-3 shrink-0" />
          <span className="shrink-0">{sectionLabel}</span>
        </>
      )}
      {match && (
        <>
          <Icon name="chevronRight" className="h-3 w-3 shrink-0" />
          <span className="text-ink font-medium truncate">{match.label}</span>
        </>
      )}
    </nav>
  );
}
