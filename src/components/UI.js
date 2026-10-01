import React, { useState } from 'react'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
export const COLORS = {
  primary:      '#1565C0',
  primaryLight: '#1E88E5',
  primarySoft:  '#E3F2FD',
  primaryDark:  '#0D47A1',
  bg:           '#F5F6FA',
  surface:      '#FFFFFF',
  border:       '#E8ECF0',
  borderLight:  '#F0F3F7',
  text:         '#1A2332',
  textMedium:   '#4A5568',
  textLight:    '#8A96A8',
  success:      '#2E7D32',
  successSoft:  '#E8F5E9',
  warning:      '#F57F17',
  warningSoft:  '#FFFDE7',
  danger:       '#C62828',
  dangerSoft:   '#FFEBEE',
  info:         '#0277BD',
  infoSoft:     '#E1F5FE',
  purple:       '#5E35B1',
  purpleSoft:   '#EDE7F6',
}

// ─── PAGE HEADER ─────────────────────────────────────────────────────────────
export function PageHeader({ title, sub, action }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}`
    }}>
      <div>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: COLORS.text,
          margin: 0, letterSpacing: '-0.3px'
        }}>{title}</h1>
        {sub && <p style={{ fontSize: 13, color: COLORS.textLight, marginTop: 4, margin: '4px 0 0' }}>{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ─── CARD ────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, hover = false, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => hover && setHovered(false)}
      style={{
        background: COLORS.surface,
        borderRadius: 14,
        border: `1px solid ${hovered ? COLORS.border : COLORS.border}`,
        padding: '22px 24px',
        boxShadow: hovered
          ? '0 8px 24px rgba(21,101,192,0.10)'
          : '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {children}
    </div>
  )
}

// ─── KPI CARD ────────────────────────────────────────────────────────────────
export function KPI({ label, valor, sub, cor, icon, trend }) {
  return (
    <div style={{
      background: COLORS.surface,
      borderRadius: 14,
      padding: '20px 22px',
      border: `1px solid ${COLORS.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          fontSize: 11, color: COLORS.textLight, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.6px'
        }}>{label}</div>
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: COLORS.primarySoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16
          }}>{icon}</div>
        )}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 700,
        color: cor || COLORS.primary,
        letterSpacing: '-0.5px', lineHeight: 1
      }}>{valor}</div>
      {sub && (
        <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 6 }}>{sub}</div>
      )}
      {trend !== undefined && (
        <div style={{
          fontSize: 11, fontWeight: 600, marginTop: 8,
          color: trend >= 0 ? COLORS.success : COLORS.danger
        }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
export function Badge({ texto, cor }) {
  const cores = {
    verde:    { bg: COLORS.successSoft,  text: COLORS.success,  dot: '#4CAF50' },
    azul:     { bg: COLORS.primarySoft,  text: COLORS.primary,  dot: COLORS.primary },
    amarelo:  { bg: COLORS.warningSoft,  text: COLORS.warning,  dot: '#FBC02D' },
    vermelho: { bg: COLORS.dangerSoft,   text: COLORS.danger,   dot: '#EF5350' },
    cinza:    { bg: '#F0F3F7',           text: COLORS.textLight, dot: '#9E9E9E' },
    roxo:     { bg: COLORS.purpleSoft,   text: COLORS.purple,   dot: '#7E57C2' },
    info:     { bg: COLORS.infoSoft,     text: COLORS.info,     dot: '#0288D1' },
  }
  const c = cores[cor] || cores.cinza
  return (
    <span style={{
      background: c.bg, color: c.text,
      borderRadius: 20, padding: '4px 10px',
      fontSize: 11, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 5
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: c.dot, display: 'inline-block', flexShrink: 0
      }} />
      {texto}
    </span>
  )
}

// ─── BUTTON ──────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled = false, style = {}, type = 'button' }) {
  const [hovered, setHovered] = useState(false)

  const styles = {
    primary: {
      background: hovered ? COLORS.primaryDark : COLORS.primary,
      color: '#fff',
      border: 'none',
      boxShadow: hovered ? '0 4px 16px rgba(21,101,192,0.35)' : '0 2px 8px rgba(21,101,192,0.25)',
    },
    secondary: {
      background: hovered ? COLORS.bg : COLORS.surface,
      color: COLORS.textMedium,
      border: `1px solid ${COLORS.border}`,
      boxShadow: 'none',
    },
    ghost: {
      background: hovered ? COLORS.primarySoft : 'transparent',
      color: COLORS.primary,
      border: `1px solid ${hovered ? COLORS.primary : 'transparent'}`,
      boxShadow: 'none',
    },
    danger: {
      background: hovered ? '#B71C1C' : COLORS.surface,
      color: hovered ? '#fff' : COLORS.danger,
      border: `1px solid ${hovered ? '#B71C1C' : '#FFCDD2'}`,
      boxShadow: 'none',
    },
  }
  const sizes = {
    sm: { padding: '6px 14px', fontSize: 12, borderRadius: 8 },
    md: { padding: '10px 20px', fontSize: 13, borderRadius: 10 },
    lg: { padding: '13px 28px', fontSize: 14, borderRadius: 12 },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.18s ease',
        fontFamily: 'inherit',
        ...styles[variant],
        ...sizes[size],
        ...style
      }}
    >{children}</button>
  )
}

// ─── INPUT ───────────────────────────────────────────────────────────────────
export function Input({ label, value, onChange, type = 'text', placeholder = '', required = false, style = {}, rows }) {
  const [focused, setFocused] = useState(false)
  const inputStyle = {
    width: '100%',
    padding: '10px 13px',
    borderRadius: 10,
    border: `1.5px solid ${focused ? COLORS.primary : COLORS.border}`,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    color: COLORS.text,
    background: COLORS.surface,
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
    boxShadow: focused ? `0 0 0 3px ${COLORS.primarySoft}` : 'none',
    fontFamily: 'inherit',
  }
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && (
        <label style={{
          fontSize: 12, fontWeight: 600,
          color: focused ? COLORS.primary : COLORS.textMedium,
          display: 'block', marginBottom: 6,
          transition: 'color 0.18s ease'
        }}>
          {label}{required && <span style={{ color: COLORS.danger, marginLeft: 2 }}>*</span>}
        </label>
      )}
      {rows ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
        />
      )}
    </div>
  )
}

// ─── SELECT ──────────────────────────────────────────────────────────────────
export function Select({ label, value, onChange, options = [], required = false, style = {} }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && (
        <label style={{
          fontSize: 12, fontWeight: 600,
          color: focused ? COLORS.primary : COLORS.textMedium,
          display: 'block', marginBottom: 6,
          transition: 'color 0.18s ease'
        }}>
          {label}{required && <span style={{ color: COLORS.danger, marginLeft: 2 }}>*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '10px 13px',
          borderRadius: 10,
          border: `1.5px solid ${focused ? COLORS.primary : COLORS.border}`,
          fontSize: 13,
          outline: 'none',
          background: COLORS.surface,
          color: COLORS.text,
          boxSizing: 'border-box',
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
          boxShadow: focused ? `0 0 0 3px ${COLORS.primarySoft}` : 'none',
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <option value="">Selecione...</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,35,50,0.55)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: COLORS.surface,
        borderRadius: 18,
        padding: 32,
        width: '100%',
        maxWidth: width,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        border: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${COLORS.border}`
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: COLORS.bg, border: 'none',
              cursor: 'pointer', fontSize: 18, color: COLORS.textLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1
            }}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── SECTION BOX ─────────────────────────────────────────────────────────────
export function SectionBox({ title, action, children, style = {} }) {
  return (
    <div style={{
      background: COLORS.surface,
      borderRadius: 14,
      border: `1px solid ${COLORS.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      ...style
    }}>
      {title && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 22px',
          borderBottom: `1px solid ${COLORS.borderLight}`,
          background: '#FAFBFD'
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{title}</span>
          {action}
        </div>
      )}
      <div style={{ padding: '20px 22px' }}>{children}</div>
    </div>
  )
}

// ─── ALERT / NOTICE ──────────────────────────────────────────────────────────
export function Alert({ tipo = 'info', children }) {
  const map = {
    info:    { bg: COLORS.primarySoft, color: COLORS.primary,    icon: 'ℹ️' },
    success: { bg: COLORS.successSoft, color: COLORS.success,    icon: '✅' },
    warning: { bg: COLORS.warningSoft, color: COLORS.warning,    icon: '⚠️' },
    danger:  { bg: COLORS.dangerSoft,  color: COLORS.danger,     icon: '🚨' },
  }
  const t = map[tipo] || map.info
  return (
    <div style={{
      background: t.bg, color: t.color,
      borderRadius: 10, padding: '12px 16px',
      fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'flex-start', gap: 10,
      border: `1px solid ${t.color}22`
    }}>
      <span style={{ flexShrink: 0 }}>{t.icon}</span>
      <span>{children}</span>
    </div>
  )
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, sub, action }) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 24px',
      color: COLORS.textLight
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.textMedium, marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, marginBottom: 16 }}>{sub}</div>}
      {action}
    </div>
  )
}

// ─── TABLE HELPERS ───────────────────────────────────────────────────────────
export function Table({ children }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        {children}
      </table>
    </div>
  )
}

export function Th({ children, style = {} }) {
  return (
    <th style={{
      padding: '10px 14px', textAlign: 'left',
      fontSize: 11, fontWeight: 700,
      color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '0.5px',
      borderBottom: `2px solid ${COLORS.border}`,
      background: '#FAFBFD',
      ...style
    }}>{children}</th>
  )
}

export function Td({ children, style = {} }) {
  return (
    <td style={{
      padding: '12px 14px',
      borderBottom: `1px solid ${COLORS.borderLight}`,
      color: COLORS.text,
      ...style
    }}>{children}</td>
  )
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────
export function formatBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export function diasRestantes(fim) {
  if (!fim) return null
  return Math.ceil((new Date(fim) - new Date()) / (1000 * 60 * 60 * 24))
}

// ─── STATUS CONSTANTS ────────────────────────────────────────────────────────
export const STATUS_PLACA = {
  ativa:      { label: 'Ativa',       cor: 'verde' },
  manutencao: { label: 'Manutenção',  cor: 'amarelo' },
  inativa:    { label: 'Inativa',     cor: 'cinza' },
}

export const STATUS_CONTRATO = {
  ativo:      { label: 'Ativo',       cor: 'verde' },
  encerrado:  { label: 'Encerrado',   cor: 'cinza' },
  renovado:   { label: 'Renovado',    cor: 'azul' },
  cancelado:  { label: 'Cancelado',   cor: 'vermelho' },
}

export const STATUS_PAGAMENTO = {
  aguardando: { label: 'Aguardando',  cor: 'amarelo' },
  pago:       { label: 'Pago',        cor: 'verde' },
  parcial:    { label: 'Parcial',     cor: 'azul' },
  atrasado:   { label: 'Atrasado',    cor: 'vermelho' },
}
