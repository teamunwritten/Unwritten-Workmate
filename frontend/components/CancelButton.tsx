"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelApplication } from "@/lib/api/leave";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/ToastProvider";

export default function CancelButton({ applicationId, onCancelled }: { applicationId: number; onCancelled?: () => void }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    const ok = await confirm("Cancel this leave request? This can't be undone.", {
      title: "Cancel leave request",
      confirmLabel: "Cancel request",
      danger: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      await cancelApplication(applicationId);
      showToast("Leave request cancelled.", "success");
      onCancelled?.();
      router.refresh();
    } catch (err: any) {
      showToast(err.message || "Could not cancel this request.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleCancel} disabled={loading} className="btn-secondary text-xs">
      {loading ? "Cancelling..." : "Cancel request"}
    </button>
  );
}
