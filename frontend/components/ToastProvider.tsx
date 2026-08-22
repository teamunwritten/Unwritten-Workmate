"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Icon from "@/components/Icon";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<{ showToast: (message: string, type?: ToastType) => void } | null>(null);

const STYLE: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: "bg-success-soft", border: "border-success/40", text: "text-success", icon: "approvals" },
  error: { bg: "bg-danger-soft", border: "border-danger/40", text: "text-danger", icon: "restriction" },
  info: { bg: "bg-brand-soft", border: "border-brand/40", text: "text-brand", icon: "bell" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] space-y-2 w-80">
        {toasts.map((t) => {
          const style = STYLE[t.type];
          return (
            <div
              key={t.id}
              className={`card border ${style.border} ${style.bg} px-3.5 py-3 flex items-start gap-2.5 shadow-lg animate-[fadeIn_0.15s_ease-out]`}
            >
              <Icon name={style.icon as any} className={`h-4 w-4 shrink-0 mt-0.5 ${style.text}`} />
              <div className={`text-[13px] font-medium flex-1 ${style.text}`}>{t.message}</div>
              <button onClick={() => dismiss(t.id)} className={`text-xs ${style.text} opacity-60 hover:opacity-100`}>
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
