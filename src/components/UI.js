import React from 'react'

export function PageHeader({ title, sub, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a18' }}>{title}</h1>
        {sub && <p style={{ fontSize: 13, color: '#888', marginTop: 3 }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #eee',
      padding: '20px', ...style
    }}>
      {children}
    </div>
  )
}

export function KPI({ label, valor, sub, cor }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: cor || '#1a1a18' }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export function Badge({ texto, cor }) {
  const cores = {
    verde: { bg: '#EAF3DE', text: '#27500A' },
    azul: { bg: '#E6F1FB', text: '#0C447C' },
    amarelo: { bg: '#FAEEDA', text: '#633806' },
    vermelho: { bg: '#FCEBEB', text: '#791F1F' },
    cinza: { bg: '#F0EFE8', text: '#555' },
    roxo: { bg: '#EEEDFE', text: '#3C3489' },
  }
  const c = cores[cor] || cores.cinza
  return (
    <span style={{
      background: c.bg, color: c.text,
      borderRadius: 20, padding: '3px 10px',
      fontSize: 11, fontWeight: 600, display: 'inline-block'
    }}>{texto}</span>
  )
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled = false, style = {} }) {
  const styles = {
    primary: { background: '#1a1a18', color: '#fff', border: 'none' },
    secondary: { background: '#fff', color: '#333', border: '1px solid #ddd' },
    danger: { background: '#fff', color: '#c0392b', border: '1px solid #fdd' },
  }
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 12 },
    md: { padding: '9px 18px', fontSize: 13 },
    lg: { padding: '12px 24px', fontSize: 14 },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      borderRadius: 8, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, ...styles[variant], ...sizes[size], ...style
    }}>{children}</button>
  )
}

export function Input({ label, value, onChange, type = 'text', placeholder = '', required = false, style = {} }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 4 }}>{label}{required && ' *'}</label>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}

export function Select({ label, value, onChange, options = [], required = false }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 4 }}>{label}{required && ' *'}</label>}
      <select
        value={value} onChange={e => onChange(e.target.value)} required={required}
        style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
      >
        <option value="">Selecione...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Modal({ title, onClose, children, width = 500 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28, width,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a18' }}>{title}</h2>
          <button onClick={onClose} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

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

export const STATUS_PLACA = {
  ativa: { label: 'Ativa', cor: 'verde' },
  manutencao: { label: 'Manutenção', cor: 'amarelo' },
  inativa: { label: 'Inativa', cor: 'cinza' },
}

export const STATUS_CONTRATO = {
  ativo: { label: 'Ativo', cor: 'verde' },
  encerrado: { label: 'Encerrado', cor: 'cinza' },
  renovado: { label: 'Renovado', cor: 'azul' },
  cancelado: { label: 'Cancelado', cor: 'vermelho' },
}

export const STATUS_PAGAMENTO = {
  aguardando: { label: 'Aguardando', cor: 'amarelo' },
  pago: { label: 'Pago', cor: 'verde' },
  parcial: { label: 'Parcial', cor: 'azul' },
  atrasado: { label: 'Atrasado', cor: 'vermelho' },
}
