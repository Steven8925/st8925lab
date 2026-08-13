import type { ReactNode } from "react";
import "./ui.css";

export function Panel({
  title,
  subtitle,
  actions,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <section className="panel">
      <header className="panel__head">
        <div className="panel__titles">
          <h2 className="panel__title">{title}</h2>
          {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="panel__actions">{actions}</div> : null}
      </header>
      <div className={scroll ? "panel__body panel__body--scroll" : "panel__body"}>{children}</div>
    </section>
  );
}

export function Badge({
  tone,
  children,
  title,
}: {
  tone: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span className="badge" data-tone={tone} title={title}>
      {children}
    </span>
  );
}

/** Severity is the only place saturated colour is used, so it reads instantly. */
export function SeverityTag({ severity }: { severity: string }) {
  const upper = severity.toUpperCase();
  return (
    <span className="severity" data-severity={upper}>
      {upper}
    </span>
  );
}

export function StateChip({ state, hint }: { state: string; hint?: string }) {
  return (
    <span className="state-chip" data-state={state} title={hint}>
      <i className="state-chip__dot" />
      {state}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  danger = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <label className="toggle" data-danger={danger || undefined}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      <span className="toggle__text">
        {label}
        {hint ? <em className="toggle__hint">{hint}</em> : null}
      </span>
    </label>
  );
}

export function relativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  if (delta < 1000) return "剛剛";
  if (delta < 60_000) return `${Math.floor(delta / 1000)}秒前`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}分前`;
  return new Date(iso).toLocaleTimeString();
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour12: false });
}
