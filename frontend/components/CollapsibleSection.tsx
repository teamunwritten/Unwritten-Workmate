"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import NavLink from "@/components/NavLink";
import { NavItem } from "@/lib/navigation";

function loadOpen(storageKey: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(storageKey);
  return raw === null ? fallback : raw === "true";
}

export default function CollapsibleSection({
  title,
  icon,
  items,
  storageKey,
  sidebarCollapsed,
  onNavigate,
}: {
  title: string;
  icon: string;
  items: NavItem[];
  storageKey: string;
  sidebarCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => items.some((item) => pathname?.startsWith(item.href)));

  useEffect(() => {
    setOpen((prev) => prev || loadOpen(storageKey, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    if (sidebarCollapsed) {
      onNavigate?.();
      setOpen(true);
      window.localStorage.setItem(storageKey, "true");
      return;
    }
    setOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(storageKey, String(next));
      return next;
    });
  }

  if (sidebarCollapsed) {
    return (
      <button onClick={toggle} title={title} className="flex flex-col items-center gap-1.5 py-1.5 w-full group">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-white/5 text-sidebar-text group-hover:bg-sidebar-raised transition-colors">
          <Icon name={icon as any} className="h-5 w-5 shrink-0" />
        </div>
        <span className="text-[10.5px] leading-tight text-center truncate w-full px-0.5 text-sidebar-muted">{title}</span>
      </button>
    );
  }

  return (
    <div className="pt-2">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-text hover:bg-sidebar-raised"
      >
        <Icon name={icon as any} className="h-[17px] w-[17px] shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        <Icon name={open ? "chevronDown" : "chevronRight"} className="h-3.5 w-3.5 text-sidebar-muted" />
      </button>
      {open && (
        <div className="mt-0.5 ml-2 pl-3.5 border-l border-white/10 space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false);
            return <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={active} />;
          })}
        </div>
      )}
    </div>
  );
}
