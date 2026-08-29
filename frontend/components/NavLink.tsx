import Link from "next/link";
import Icon from "@/components/Icon";

export default function NavLink({
  href,
  label,
  icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <Link href={href} title={label} className="flex flex-col items-center gap-1.5 py-1.5 group">
        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
            active ? "bg-sidebar-active text-white" : "bg-white/5 text-sidebar-text group-hover:bg-sidebar-raised"
          }`}
        >
          <Icon name={icon as any} className="h-5 w-5 shrink-0" />
        </div>
        <span className={`text-[10.5px] leading-tight text-center truncate w-full px-0.5 ${active ? "text-white" : "text-sidebar-muted"}`}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
        active ? "bg-sidebar-active text-white" : "text-sidebar-text hover:bg-sidebar-raised"
      }`}
    >
      <Icon name={icon as any} className="h-[17px] w-[17px] shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
