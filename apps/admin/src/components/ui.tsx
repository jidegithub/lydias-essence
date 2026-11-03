import { useId, type ReactNode } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import type { Product } from "@lydias-essence/types";
import { getDiscountState, themeBackground } from "@lydias-essence/utils";

export function PageHead({ title, emphasis, subtitle, actions }: { title: string; emphasis?: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>
          {title}
          {emphasis && (
            <>
              {" "}
              <em>{emphasis}</em>
            </>
          )}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </header>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loading-block" role="status">
      <Loader2 className="spin" size={22} aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice bad" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <div style={{ flex: 1 }}>
        <strong>Something went wrong.</strong>
        <div>{message}</div>
        {onRetry && (
          <button type="button" className="btn btn-small" style={{ marginTop: 10 }} onClick={onRetry}>
            <RefreshCw size={14} /> Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="switch-row">
      <div className="switch-copy">
        <strong id={`${id}-l`}>{label}</strong>
        {description && <span id={`${id}-d`}>{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

export function Field({
  label,
  help,
  error,
  children,
  htmlFor
}: {
  label: string;
  help?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? (
        <div className="error-text" id={`${htmlFor}-err`} role="alert">
          {error}
        </div>
      ) : (
        help && (
          <div className="help" id={`${htmlFor}-help`}>
            {help}
          </div>
        )
      )}
    </div>
  );
}

/** Helper for aria wiring of inputs rendered inside <Field>. */
export function describe(id: string, error?: string, help?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-err` : help ? `${id}-help` : undefined
  } as const;
}

export function ProductStatus({ product }: { product: Product }) {
  return product.published ? <span className="pill ok">Published</span> : <span className="pill draft">Draft</span>;
}

export function StockStatus({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock <= 0) return <span className="pill bad">Out of stock</span>;
  if (stock <= threshold) return <span className="pill warn">Low · {stock} left</span>;
  return <span className="pill ok">In stock</span>;
}

export function DiscountStatus({ product }: { product: Product }) {
  const state = getDiscountState(product);
  if (state === "off") return null;
  if (state === "active") return <span className="pill rose">On sale</span>;
  if (state === "upcoming") return <span className="pill">Sale scheduled</span>;
  if (state === "expired") return <span className="pill draft">Sale ended</span>;
  return <span className="pill warn">Check sale price</span>;
}

export function Thumb({ product, small }: { product: Pick<Product, "image_url" | "name" | "background_theme">; small?: boolean }) {
  return (
    <span className={`thumb ${small ? "sm" : ""}`} style={{ background: themeBackground(product.background_theme) }}>
      {product.image_url ? <img src={product.image_url} alt="" loading="lazy" /> : <span aria-hidden="true">✳</span>}
    </span>
  );
}
