"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  message: string;
}

const ConfirmContext = createContext<{ confirm: (message: string, options?: ConfirmOptions) => Promise<boolean> } | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ message, ...options });
    });
  }, []);

  function handle(result: boolean) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="card w-full max-w-sm p-5 animate-[fadeIn_0.15s_ease-out]">
            {state.title && <div className="text-sm font-semibold mb-2">{state.title}</div>}
            <p className="text-sm text-ink">{state.message}</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => handle(false)} className="btn-secondary text-xs">
                {state.cancelLabel || "Cancel"}
              </button>
              <button
                onClick={() => handle(true)}
                className="btn-primary text-xs"
                style={state.danger ? { backgroundColor: "var(--color-danger)" } : undefined}
              >
                {state.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}
