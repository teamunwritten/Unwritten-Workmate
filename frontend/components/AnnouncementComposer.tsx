"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncement, deleteAnnouncement } from "@/lib/api/dashboard";
import { emitAnnouncementRemoved } from "@/lib/announcementEvents";
import Icon from "@/components/Icon";

export default function AnnouncementComposer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAnnouncement({ title, body });
      setTitle("");
      setBody("");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="h-6 w-6 rounded-full flex items-center justify-center text-brand hover:bg-brand-soft"
          title="Post announcement"
        >
          <Icon name="apply" className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <form onSubmit={handleSubmit} className="mb-3 space-y-2 border-b border-border pb-3">
          <input
            className="input text-sm"
            placeholder="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input text-sm"
            placeholder="Announcement text"
            rows={2}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit" disabled={submitting} className="btn-primary text-xs">
            {submitting ? "Posting..." : "Post"}
          </button>
        </form>
      )}
    </div>
  );
}

export function DeleteAnnouncementButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteAnnouncement(id);
      emitAnnouncementRemoved(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={handleDelete} disabled={busy} className="text-muted hover:text-danger text-xs">
      Remove
    </button>
  );
}
