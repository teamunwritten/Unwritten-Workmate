"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { listColleagues } from "@/lib/api/leave";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";

interface Colleague {
  id: number;
  full_name: string;
  email: string;
  picture_url: string | null;
}

export default function EmployeeSearch({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [colleagues, setColleagues] = useState<Colleague[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function ensureLoaded() {
    if (colleagues === null) {
      const data = await listColleagues();
      setColleagues(data);
    }
  }

  const results = useMemo(() => {
    if (!query.trim() || !colleagues) return [];
    const q = query.trim().toLowerCase();
    return colleagues.filter((c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 8);
  }, [query, colleagues]);

  function handleSelect(c: Colleague) {
    setOpen(false);
    setQuery("");
    if (isAdmin) {
      router.push(`/admin/employees/${c.id}`);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <Icon name="search" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="text"
        placeholder="Search employee"
        className="input pl-9 bg-canvas border-transparent focus:bg-surface"
        value={query}
        onFocus={() => {
          ensureLoaded();
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && query.trim() && (
        <div className="absolute left-0 top-10 z-20 w-80 card p-1.5 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-2.5 py-3 text-xs text-muted text-center">No matching employees.</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-canvas"
              >
                <Avatar name={c.full_name} size={28} pictureUrl={c.picture_url} />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">{c.full_name}</div>
                  <div className="text-[11px] text-muted truncate">{c.email}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
