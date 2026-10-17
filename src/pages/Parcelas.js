import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatBRL, formatDate } from '../components/UI'

const C = {
  primary:     '#1565C0',
  primarySoft: '#E8F0FB',
  primaryDark: '#0D47A1',
  bg:          '#F5F6FA',
  surface:     '#FFFFFF',
  border:      '#E6E9F0',
  text:        '#1A2233',
  textMed:     '#4A5468',
  textLight:   '#5B6577',
  success:     '#166534',
  successSoft: '#E7F6EC',
  warn:        '#9A3412',
  warnSoft:    '#FFF1E0',
  danger:      '#C2410C',
  dangerSoft:  '#FFF7EE',
}

const STATUS_PARCELA = {
  pendente:  { label: 'Pendente',  bg: '#EFF6FF', color: '#1D4ED8' },
  atrasada:  { label: 'Atrasada', bg: C.dangerSoft, color: C.danger },
  paga:      { label: 'Paga',     bg: C.successSoft, color: C.success },
  cancelada: { label: 'Cancelada', bg: '#F3F4F6', color: '#6B7280' },
}

function Badge({ status }) {
  const s = STATUS_PARCELA[status] || { label: status, bg: '#F3F4F6', color: '#374151' }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 999,
      background: s.bg, color: s.color, fontSize: 12, fontWeight: 700,
    }}>{s.label}</span>
  )
}

export default function Parcelas() {
  const [parcelas, setParcelas] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState('pendente')
  const [busca, setBusca]       = useState('')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('parcelas')
        .select('*, contratos(id, clientes(nome), contrato_placas(placas(nome)))')
        .order('data_vencimento', { ascending: true })
      if (!data) { setLoading(false); return }

      // Calcular se está atrasada
      const enriquecidas = data.map(p => {
        const venc = p.data_vencimento ? new Date(p.data_vencimento + 'T00:00:00') : null
        const statusReal = p.status === 'paga' || p.status === 'cancelada'
          ? p.status
          : venc && venc < hoje ? 'atrasada' : 'pendente'
        const cliente = p.contratos?.clientes?.nome || '-'
        const placasArr = (p.contratos?.contrato_placas || []).map(cp => cp.placas?.nome).filter(Boolean)
        const placa = placasArr.join(', ') || '-'
        return { ...p, statusReal, cliente, placa }
      })
      setParcelas(enriquecidas)
      setLoading(false)
    }
    carregar()
  }, [])

  const parcelasFiltradas = parcelas.filter(p => {
    if (filtro !== 'todas' && p.statusReal !== filtro) return false
    if (busca) {
      const q = busca.toLowerCase()
      return p.cliente.toLowerCase().includes(q) || p.placa.toLowerCase().includes(q)
    }
    return true
  })

  const totalPendente = parcelas.filter(p => p.statusReal === 'pendente').reduce((s, p) => s + (p.valor || 0), 0)
  const totalAtrasada = parcelas.filter(p => p.statusReal === 'atrasada').reduce((s, p) => s + (p.valor || 0), 0)
  const totalPago     = parcelas.filter(p => p.statusReal === 'paga').reduce((s, p) => s + (p.valor || 0), 0)

  const countPendente = parcelas.filter(p => p.statusReal === 'pendente').length
  const countAtrasada = parcelas.filter(p => p.statusReal === 'atrasada').length

  const marcarPaga = async (id) => {
    await supabase.from('parcelas').update({ status: 'paga', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id)
    setParcelas(prev => prev.map(p => p.id === id ? { ...p, status: 'paga', statusReal: 'paga' } : p))
  }

  const filtros = [
    { id: 'pendente', label: 'Pendentes', count: countPendente },
    { id: 'atrasada', label: 'Atrasadas', count: countAtrasada },
    { id: 'paga',     label: 'Pagas',     count: null },
    { id: 'todas',    label: 'Todas',     count: null },
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, gap: 12, flexDirection: 'column' }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.primarySoft}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Manrope','Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.3px', color: C.text }}>Parcelas</h1>
        <p style={{ margin: 0, fontSize: 14, color: C.textLight }}>Controle de recebimentos por parcela</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'A receber (pendentes)', valor: totalPendente, bg: '#EFF6FF', color: C.primary, icon: '📋' },
          { label: 'Em atraso',             valor: totalAtrasada, bg: C.dangerSoft, color: C.danger, icon: '⚠️' },
          { label: 'Recebido (pago)',        valor: totalPago,     bg: C.successSoft, color: C.success, icon: '✅' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: 12, padding: '16px 18px', border: `1px solid ${k.color}22` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: k.color, marginBottom: 6 }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{formatBRL(k.valor)}</div>
          </div>
        ))}
      </div>

      {/* Filtros + busca */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, background: C.surface, borderRadius: 10, padding: 4, border: `1px solid ${C.border}` }}>
          {filtros.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              style={{
                padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: filtro === f.id ? 700 : 500,
                background: filtro === f.id ? C.primary : 'transparent',
                color: filtro === f.id ? '#fff' : C.textMed,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {f.label}
              {f.count != null && f.count > 0 && (
                <span style={{ background: filtro === f.id ? 'rgba(255,255,255,0.25)' : (f.id === 'atrasada' ? C.danger : C.primary), color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '1px 6px' }}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
        <input
          placeholder="Buscar cliente ou placa..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{
            flex: 1, minWidth: 200, height: 38, padding: '0 12px', borderRadius: 9,
            border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', color: C.text,
            outline: 'none',
          }}
        />
      </div>

      {/* Tabela */}
      <div style={{ background: C.surface, borderRadius: 14, boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F7F8FB' }}>
                {['Cliente', 'Placa(s)', 'Parcela', 'Vencimento', 'Valor', 'Status', 'Ação'].map((h, i) => (
                  <th key={h} style={{
                    padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                    color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.5px',
                    borderBottom: `1px solid ${C.border}`,
                    borderRadius: i === 0 ? '8px 0 0 0' : i === 6 ? '0 8px 0 0' : 0,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parcelasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: C.textLight, fontSize: 13 }}>
                    Nenhuma parcela {filtro !== 'todas' ? `com status "${filtros.find(f=>f.id===filtro)?.label}"` : ''} encontrada.
                  </td>
                </tr>
              )}
              {parcelasFiltradas.map((p, i) => {
                const venc = p.data_vencimento ? new Date(p.data_vencimento + 'T00:00:00') : null
                const diasAtraso = venc && p.statusReal === 'atrasada' ? Math.floor((hoje - venc) / 86400000) : null
                return (
                  <tr key={p.id} style={{
                    borderBottom: `1px solid ${C.border}`,
                    background: p.statusReal === 'atrasada' ? '#FFFBF7' : 'white',
                  }}>
                    <td style={{ padding: '13px 14px', fontWeight: 700, color: C.text }}>{p.cliente}</td>
                    <td style={{ padding: '13px 14px', color: C.textMed, fontSize: 13 }}>{p.placa}</td>
                    <td style={{ padding: '13px 14px', color: C.textMed, fontSize: 13 }}>
                      {p.numero_parcela != null ? `${p.numero_parcela}/${p.total_parcelas || '?'}` : 'Avista'}
                    </td>
                    <td style={{ padding: '13px 14px', color: p.statusReal === 'atrasada' ? C.danger : C.text, fontWeight: p.statusReal === 'atrasada' ? 700 : 400 }}>
                      {formatDate(p.data_vencimento)}
                      {diasAtraso != null && <div style={{ fontSize: 11, color: C.danger }}>{diasAtraso}d de atraso</div>}
                    </td>
                    <td style={{ padding: '13px 14px', fontWeight: 700, color: C.text }}>{formatBRL(p.valor)}</td>
                    <td style={{ padding: '13px 14px' }}><Badge status={p.statusReal} /></td>
                    <td style={{ padding: '13px 14px' }}>
                      {p.statusReal !== 'paga' && p.statusReal !== 'cancelada' && (
                        <button
                          onClick={() => marcarPaga(p.id)}
                          style={{
                            padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                            background: C.successSoft, color: C.success, fontSize: 12, fontWeight: 700,
                            fontFamily: 'inherit',
                          }}
                        >
                          ✓ Marcar paga
                        </button>
                      )}
                      {p.statusReal === 'paga' && <span style={{ fontSize: 12, color: C.success }}>✓ {formatDate(p.data_pagamento)}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {parcelasFiltradas.length > 0 && (
          <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 13, color: C.textMed }}>
            <span>{parcelasFiltradas.length} parcela(s)</span>
            <span style={{ fontWeight: 700, color: C.text }}>Total: {formatBRL(parcelasFiltradas.reduce((s, p) => s + (p.valor || 0), 0))}</span>
          </div>
        )}
      </div>

    </div>
  )
}
