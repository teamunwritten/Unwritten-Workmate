"use client";

import { useState } from "react";

const PALETTE = ["#2e6fe8", "#7c3aed", "#0f9d58", "#e8710a", "#d33a6a", "#0891b2"];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({ name, size = 32, pictureUrl }: { name: string; size?: number; pictureUrl?: string | null }) {
  const [failed, setFailed] = useState(false);

  if (pictureUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pictureUrl}
        alt={name}
        // Google's photo CDN can reject the request based on the page's Referer header;
        // no-referrer avoids that hotlink rejection.
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full text-white font-semibold flex items-center justify-center shrink-0"
      style={{ backgroundColor: colorFor(name), width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}
