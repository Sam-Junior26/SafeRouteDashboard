import React from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import { friendly } from '../lib/data';


export function Loading({ label = 'Loading...' }) {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={20} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className="error-box">
      <span>{error}</span>

      {onRetry && (
        <button
          className="btn btn-secondary"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = 'Nothing here yet',
  message = 'Data will appear here when it is available.',
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">—</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export function StatusBadge({ status }) {
  return (
    <span
      className={`badge badge-${String(
        status || 'unknown'
      ).toLowerCase()}`}
    >
      {friendly(status || 'unknown')}
    </span>
  );
}

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>

        {subtitle && <p>{subtitle}</p>}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search...',
}) {
  return (
    <label className="search-box">
      <Search size={17} />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'teal',
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{label}</span>

        <span className={`metric-icon ${tone}`}>
          {Icon && <Icon size={18} />}
        </span>
      </div>

      <strong>{value ?? '—'}</strong>

      {hint && <small>{hint}</small>}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <h2>{title}</h2>

          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}