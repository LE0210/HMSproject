import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';

/* ------------------------------- Card ---------------------------------- */

/** `icon` may be an icon-set name (preferred) or any string of literal text. */
function renderIcon(icon, size = 16) {
  if (icon === undefined || icon === null || icon === false) return null;
  if (typeof icon === 'object') return icon;
  const isEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.test(icon);
  if (!isEmoji) return <Icon name={icon} size={size} />;
  return <span aria-hidden="true">{icon}</span>;
}

export function Card({ title, icon, action, children, className = '', bodyClass = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          {title && (
            <h3>
              {renderIcon(icon) && <span className="h-ico">{renderIcon(icon)}</span>}
              {title}
            </h3>
          )}
          {action}
        </header>
      )}
      <div className={`card-body ${bodyClass}`}>{children}</div>
    </section>
  );
}

/* ------------------------------ Stat ----------------------------------- */

export function Stat({ label, value, foot, tone = '', icon, tile, attention }) {
  return (
    <div className="stat">
      <div>
        <div className="label">{label}</div>
        <div className={`value ${tone}`}>{value}</div>
        {foot && <div className={`foot${attention ? ' attention' : ''}`}>{foot}</div>}
      </div>
      {icon && <div className={`tile ${tile || ''}`}>{renderIcon(icon, 19)}</div>}
    </div>
  );
}

/* ----------------------------- Badge ----------------------------------- */

const BADGE_TONES = {
  Scheduled: 'blue',
  Completed: 'green',
  Cancelled: 'grey',
  NoShow: 'red',
  Pending: 'amber',
  Dispensed: 'green',
  Urgent: 'red',
  Routine: 'green',
  STAT: 'red',
  Ordered: 'grey',
  InProgress: 'blue',
  Paid: 'green',
  PartiallyPaid: 'amber',
  Unpaid: 'red',
  Active: 'green',
  Inactive: 'grey',
  InStock: 'green',
  LowStock: 'amber',
  OutOfStock: 'red',
  Doctor: 'blue',
  Nurse: 'teal',
  Pharmacist: 'purple',
  Admin: 'red',
  BillingClerk: 'amber',
  LabTech: 'green',
};

export function Badge({ children, tone, status }) {
  const t = tone || BADGE_TONES[status || children] || 'grey';
  return <span className={`badge ${t}`}>{children}</span>;
}

/* ----------------------------- Avatar ---------------------------------- */

const AVATAR_TONES = ['blue', 'green', 'purple', 'amber', 'red'];

export function Avatar({ initials, tone, size, title }) {
  const t = tone || AVATAR_TONES[(String(initials || '').charCodeAt(0) || 0) % AVATAR_TONES.length];
  return (
    <div className={`avatar ${t}${size === 'sm' ? ' sm' : ''}`} title={title}>
      {initials || '—'}
    </div>
  );
}

/* ------------------------------ Modal ---------------------------------- */

export function Modal({ open, onClose, title, children, footer, wide }) {
  const ref = useRef(null);

  // Escape closes; focus moves into the dialog for keyboard users.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        className={`modal${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={17} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* ----------------------------- Fields ---------------------------------- */

export function Field({ label, required, error, hint, children }) {
  return (
    <div className="field">
      {label && (
        <label>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="faint small" style={{ marginTop: 4 }}>{hint}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

/* ---------------------------- Utilities -------------------------------- */

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading-block">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 10px' }} />
        <div className="faint small">{label}</div>
      </div>
    </div>
  );
}

export function Empty({ icon = '📭', title, hint }) {
  return (
    <div className="empty">
      <span className="big" aria-hidden="true">
        {icon}
      </span>
      <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{title}</div>
      {hint && <div style={{ marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert danger">
      <span className="alert-ico" aria-hidden="true">⚠</span>
      <div className="alert-body">
        <strong>Could not load this data</strong>
        <div>{error.message}</div>
        {onRetry && (
          <button className="btn btn-outline btn-sm" style={{ marginTop: 9 }} onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/* Date and currency formatters now live in `../utils/format.js`, so this
   module exports only React components. Mixing the two breaks Vite's Fast
   Refresh and forces a full page reload on every edit. */