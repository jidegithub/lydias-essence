import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  leaving?: boolean;
}

export interface ToastApi {
  success: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Routine confirmations vanish on their own; errors stay longer and can be dismissed. */
export const TOAST_DURATION: Record<ToastKind, number> = { success: 3000, info: 4000, error: 9000 };
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const remove = useCallback((id: number) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 180);
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setItems((list) => [...list.filter((t) => !(t.message === message && t.kind === kind)), { id, kind, message }].slice(-MAX_VISIBLE));
      timers.current.set(id, window.setTimeout(() => remove(id), TOAST_DURATION[kind]));
    },
    [remove]
  );

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((h) => window.clearTimeout(h));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      info: (m) => push("info", m),
      error: (m) => push("error", m),
      dismiss: remove
    }),
    [push, remove]
  );

  const polite = items.filter((t) => t.kind !== "error");
  const assertive = items.filter((t) => t.kind === "error");

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="le-toasts">
        {/* Two always-mounted live regions so screen readers announce new messages reliably. */}
        <div className="le-toast-region" role="status" aria-live="polite" aria-atomic="false">
          {polite.map((t) => (
            <ToastView key={t.id} toast={t} onClose={remove} />
          ))}
        </div>
        <div className="le-toast-region" role="alert" aria-live="assertive" aria-atomic="false">
          {assertive.map((t) => (
            <ToastView key={t.id} toast={t} onClose={remove} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onClose }: { toast: ToastItem; onClose: (id: number) => void }) {
  const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? AlertCircle : Info;
  return (
    <div className={`le-toast le-toast-${toast.kind} ${toast.leaving ? "is-leaving" : ""}`}>
      <Icon size={18} aria-hidden="true" />
      <span className="le-toast-text">{toast.message}</span>
      {toast.kind === "error" && (
        <button type="button" className="le-toast-close" onClick={() => onClose(toast.id)} aria-label="Dismiss message">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
