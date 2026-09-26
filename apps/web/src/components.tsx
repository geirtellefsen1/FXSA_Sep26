import type { CSSProperties, ReactNode } from 'react';
import type { Money as MoneyValue } from '@fxpms/api-client';
import { Icon } from './icons.js';
import { formatMoney } from './tenants.js';

export function Btn({
  kind = 'ghost', size, icon, iconAfter, children, onClick, type, title, disabled,
}: {
  kind?: 'ghost' | 'primary' | 'ai' | 'quiet' | string;
  size?: 'sm' | 'lg';
  icon?: string;
  iconAfter?: string;
  children?: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  disabled?: boolean;
}) {
  const cls = ['btn', `btn--${kind}`];
  if (size === 'sm') cls.push('btn--sm');
  if (size === 'lg') cls.push('btn--lg');
  if (!children) cls.push('btn--icon');
  return (
    <button type={type || 'button'} className={cls.join(' ')} onClick={onClick} title={title} disabled={disabled}>
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14} />}
      {children}
      {iconAfter && <Icon name={iconAfter} size={size === 'sm' ? 12 : 14} />}
    </button>
  );
}

export function Badge({
  tone = 'neutral', dot, children, icon,
}: {
  tone?: 'neutral' | 'good' | 'watch' | 'bad' | 'ai' | string;
  dot?: boolean;
  children?: ReactNode;
  icon?: string;
}) {
  return (
    <span className={`badge badge--${tone}`}>
      {dot && <span className="badge__dot" />}
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}

export function Avatar({ name, size, bot }: { name?: string; size?: 'sm' | 'lg'; bot?: boolean }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const cls = ['avatar'];
  if (size === 'sm') cls.push('avatar--sm');
  if (size === 'lg') cls.push('avatar--lg');
  if (bot) cls.push('avatar--bot');
  return <div className={cls.join(' ')}>{bot ? <Icon name="bot" size={size === 'lg' ? 22 : 13} /> : initials}</div>;
}

export function Card({
  title, subtitle, action, children, padding = true, inset, count, icon, tone,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  padding?: boolean;
  inset?: boolean;
  count?: ReactNode;
  icon?: string;
  tone?: 'ai' | string;
}) {
  return (
    <section className={`card ${inset ? 'card--inset' : ''}`}>
      {(title || action) && (
        <header className="card__hd">
          <div>
            <div className="card__title">
              {icon && <Icon name={icon} size={15} style={{ color: tone === 'ai' ? 'var(--ai-600)' : 'var(--ink-500)' }} />}
              {title}
              {count != null && <span className="badge badge--neutral" style={{ fontSize: 10.5, padding: '1px 6px' }}>{count}</span>}
            </div>
            {subtitle && <div className="card__sub" style={{ marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action && <div className="card__actions">{action}</div>}
        </header>
      )}
      {padding ? <div className="card__bd">{children}</div> : children}
    </section>
  );
}

export function Kpi({
  label, value, sub, delta, tone, prefix,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  delta?: number | null;
  tone?: 'bad' | 'good' | string;
  prefix?: ReactNode;
}) {
  const dCls = delta == null ? '' : delta > 0 ? 'kpi__delta--up' : delta < 0 ? 'kpi__delta--down' : 'kpi__delta--flat';
  const dIcon = delta == null ? null : delta > 0 ? 'arrow-up' : delta < 0 ? 'arrow-down' : 'arrow-right';
  return (
    <div className="kpi">
      <div className="kpi__lbl">{label}</div>
      <div className={`kpi__val ${tone === 'bad' ? 'kpi__val--bad' : ''} ${tone === 'good' ? 'kpi__val--good' : ''}`}>
        {prefix && <span style={{ fontWeight: 400, color: 'var(--ink-500)', marginRight: 2 }}>{prefix}</span>}
        {value}
      </div>
      {sub && <div className="kpi__sub">{sub}</div>}
      {delta != null && (
        <div className={`kpi__delta ${dCls}`}>
          <Icon name={dIcon!} size={12} />{Math.abs(delta).toFixed(1)}% vs last week
        </div>
      )}
    </div>
  );
}

export type AiTask = {
  severity?: 'bad' | 'watch' | null;
  confidence: number;
  title: ReactNode;
  rationale: ReactNode;
  affects?: string[];
  impact?: ReactNode;
  action: ReactNode;
};

export function AiCard({
  task, onApprove, onReject, onAdjust, dense,
}: {
  task: AiTask;
  onApprove?: (task: AiTask) => void;
  onReject?: (task: AiTask) => void;
  onAdjust?: (task: AiTask) => void;
  dense?: boolean;
}) {
  const sev = task.severity;
  return (
    <div className="ai-card" style={dense ? { padding: '12px 14px' } : undefined}>
      <div
        className="ai-card__icon"
        style={
          sev === 'bad'
            ? { background: 'var(--bad-600)', boxShadow: '0 2px 8px -2px rgba(220, 38, 38, 0.4)' }
            : sev === 'watch'
              ? { background: 'var(--watch-600)', boxShadow: '0 2px 8px -2px rgba(217, 119, 6, 0.4)' }
              : undefined
        }
      >
        <Icon name={sev ? 'alert' : 'sparkles'} size={15} />
      </div>
      <div className="ai-card__bd">
        <div className="ai-card__meta">
          AI proposes
          <span style={{ marginLeft: 8, opacity: 0.7, fontWeight: 500, letterSpacing: 0 }}>· {Math.round(task.confidence * 100)}% confidence</span>
        </div>
        <div className="ai-card__title">{task.title}</div>
        <div className="ai-card__reason">{task.rationale}</div>
        {task.affects && (
          <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {task.affects.map((a) => (
              <span key={a} className="badge badge--ai" style={{ fontSize: 10.5 }}>{a}</span>
            ))}
          </div>
        )}
        {task.impact && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ai-700)', fontWeight: 600 }}>
            <Icon name="trending-up" size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
            {task.impact}
          </div>
        )}
        <div className="ai-card__actions">
          <Btn kind="ai" size="sm" icon="check" onClick={() => onApprove?.(task)}>Approve · {task.action}</Btn>
          <Btn kind="ghost" size="sm" onClick={() => onAdjust?.(task)}>Adjust</Btn>
          <Btn kind="quiet" size="sm" onClick={() => onReject?.(task)}>Dismiss</Btn>
        </div>
      </div>
    </div>
  );
}

export function SevDot({ status }: { status?: string | null }) {
  return <span className={`sev sev--${status === 'good' ? 'good' : status === 'watch' ? 'watch' : status === 'bad' ? 'bad' : 'neutral'}`} />;
}

export function Money({
  value, mute, big,
}: {
  value: MoneyValue | null;
  mute?: boolean;
  big?: boolean;
}) {
  if (!value) return <span className={`tabnum ${mute ? 'muted' : ''}`}>—</span>;
  const { symbol, number } = formatMoney(value.amount_minor, value.currency);
  const style: CSSProperties | undefined = big ? { fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' } : undefined;
  return (
    <span className={`tabnum ${mute ? 'muted' : ''}`} style={style}>
      <span style={{ color: mute ? 'var(--ink-400)' : 'var(--ink-500)', fontWeight: 500, marginRight: 2 }}>{symbol}</span>
      {number}
    </span>
  );
}

export function Spark({
  data, color = 'var(--good-600)', height = 32, width = 120,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const stepX = (width - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => `${pad + i * stepX},${pad + (1 - (v - min) / range) * (height - pad * 2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width, height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const CHANNEL_MAP: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  whatsapp: { icon: 'whatsapp', color: 'var(--good-700)', bg: 'var(--good-50)', label: 'WhatsApp' },
  email: { icon: 'mail', color: 'var(--info-700)', bg: 'var(--info-50)', label: 'Email' },
  chat: { icon: 'message', color: 'var(--ai-700)', bg: 'var(--ai-50)', label: 'Chatbot' },
  phone: { icon: 'phone', color: 'var(--watch-700)', bg: 'var(--watch-50)', label: 'Phone' },
};

export function ChannelChip({ channel, size = 12 }: { channel: string; size?: number }) {
  const c = CHANNEL_MAP[channel] ?? CHANNEL_MAP.chat!;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', borderRadius: 5, background: c.bg, color: c.color, fontSize: 11, fontWeight: 600 }}>
      <Icon name={c.icon} size={size} />{c.label}
    </span>
  );
}

export type Tab = { id: string; label: ReactNode; count?: number | null };

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--ink-150)', marginBottom: 18 }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '9px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: active === t.id ? 'var(--ink-900)' : 'var(--ink-500)',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {t.label}
          {t.count != null && <span className="badge badge--neutral" style={{ fontSize: 10, padding: '0 5px' }}>{t.count}</span>}
          {active === t.id && (
            <span style={{ position: 'absolute', bottom: -1, left: 8, right: 8, height: 2, background: 'var(--orange-600)', borderRadius: 1 }} />
          )}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open, onClose, title, subtitle, children, width = 560, footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  width?: number;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(14, 27, 46, 0.45)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20, animation: 'fade-in 0.15s ease-out' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 14, width, maxWidth: '100%', maxHeight: '90vh', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', animation: 'slide-up 0.18s ease-out' }}
      >
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--ink-150)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: 17 }}>{title}</h3>
            {subtitle && <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, color: 'var(--ink-500)' }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '14px 22px', borderTop: '1px solid var(--ink-150)', background: 'var(--ink-50)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function HeatStrip({ occupancy, height = 28 }: { occupancy: number[]; height?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, height, alignItems: 'stretch' }}>
      {occupancy.map((v, i) => {
        let bg = 'var(--good-600)';
        if (v < 0.7) bg = 'var(--bad-500, #ef4444)';
        else if (v < 0.85) bg = 'var(--watch-600)';
        else if (v > 0.95) bg = 'var(--orange-600)';
        const opacity = 0.35 + v * 0.55;
        return <div key={i} style={{ flex: 1, background: bg, opacity, borderRadius: 2 }} title={`${Math.round(v * 100)}%`} />;
      })}
    </div>
  );
}

export function Donut({
  value, size = 56, stroke = 7, color = 'var(--good-600)', track = 'var(--ink-150)', label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: size > 50 ? 14 : 12, color: 'var(--ink-900)' }}>{label ?? `${Math.round(value * 100)}%`}</div>
    </div>
  );
}

export function Empty({ icon = 'inbox', title, sub }: { icon?: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-500)' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--ink-100)', display: 'grid', placeItems: 'center', margin: '0 auto 12px', color: 'var(--ink-400)' }}>
        <Icon name={icon} size={22} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink-700)' }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
