"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className = "w-56",
  debounceMs = 300,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setLocal(value), [value]);

  function handleChange(next: string) {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), debounceMs);
  }

  return (
    <div className={`relative ${className}`}>
      <Icon name="search" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="text"
        placeholder={placeholder}
        className="input pl-9 w-full"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}
