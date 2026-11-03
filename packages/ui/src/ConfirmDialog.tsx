import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "./Toast";

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  /**
   * The operation to perform. The dialog stays open (buttons disabled) while it runs,
   * closes only on success, and shows the error inline if it fails.
   */
  run?: () => Promise<unknown>;
  /** Shown as a short disappearing toast once `run` has actually succeeded. */
  successMessage?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

interface Pending {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setError("");
      setPending({ options, resolve });
    });
  }, []);

  const close = useCallback(
    (result: boolean) => {
      setPending((p) => {
        p?.resolve(result);
        return null;
      });
      setBusy(false);
      busyRef.current = false;
    },
    []
  );

  const onConfirm = useCallback(async () => {
    if (!pending || busyRef.current) return; // block double submits
    const { options } = pending;
    if (!options.run) {
      close(true);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await options.run();
      close(true);
      if (options.successMessage) toast.success(options.successMessage);
    } catch (err) {
      busyRef.current = false;
      setBusy(false);
      setError(err instanceof Error && err.message ? err.message : "That didn’t work. Please try again.");
    }
  }, [pending, close, toast]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <DialogView
          options={pending.options}
          busy={busy}
          error={error}
          onConfirm={onConfirm}
          onCancel={() => {
            if (!busyRef.current) close(false);
          }}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function DialogView({
  options,
  busy,
  error,
  onConfirm,
  onCancel
}: {
  options: ConfirmOptions;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const danger = options.tone === "danger";

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (nodes.length === 0) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="le-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={ref}
        className="le-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.message ? descId : undefined}
        aria-busy={busy}
      >
        <h2 id={titleId}>{options.title}</h2>
        {options.message && <p id={descId}>{options.message}</p>}
        {error && (
          <div className="le-dialog-error" role="alert">
            {error}
          </div>
        )}
        <div className="le-dialog-actions">
          <button type="button" ref={cancelRef} className="le-btn" onClick={onCancel} disabled={busy}>
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button type="button" className={`le-btn ${danger ? "le-btn-danger" : "le-btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 size={15} className="le-spin-icon" aria-hidden="true" />}
            {busy ? "Working…" : options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
