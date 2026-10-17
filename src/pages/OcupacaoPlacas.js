import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatBRL, formatDate } from '../components/UI'

const C = {
  primary:     '#1565C0',
  primarySoft: '#E8F0FB',
  bg:          '#F5F6FA',
  surface:     '#FFFFFF',
  border:      '#E6E9F0',
  text:        '#1A2233',
  textMed:     '#4A5468',
  textLight:   '#5B6577',
  success:     '#166534',
  successSoft: '#E7F6EC',
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function calcStatus(inicio, fim) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  if (!inicio || !fim) return 'ativo'
  const di = new Date(inicio + 'T00:00:00')
  const df = new Date(fim + 'T23:59:59')
  if (di > hoje) return 'reservado'
  if (df < hoje) return 'expirado'
  return 'ativo'
}

function GanttBar({ contrato, minDate, maxDate, totalDays }) {
  if (!contrato.data_inicio || !contrato.data_fim) return null
  const di = new Date(contrato.data_inicio + 'T00:00:00')
  const df = new Date(contrato.data_fim + 'T23:59:59')
  const offsetDays = Math.max((di - minDate) / 86400000, 0)
  const durDays    = Math.min((df - di) / 86400000 + 1, totalDays - offsetDays)
  const left  = (offsetDays / totalDays) * 100
  const width = Math.max((durDays / totalDays) * 100, 1)
  const status = calcStatus(contrato.data_inicio, contrato.data_fim)
  const colors = {
    ativo:     '#1565C0',
    reservado: '#7C3AED',
    expirado:  '#6B7280',
  }
  const bg = colors[status] || colors.ativo
  return (
    <div
      title={`${contrato.clientes?.nome || '-'} · ${formatDate(contrato.data_inicio)} – ${formatDate(contrato.data_fim)} · ${formatBRL(contrato.valor_total)}`}
      style={{
        position: 'absolute', left: `${left}%`, width: `${width}%`,
        height: 28, borderRadius: 6, background: bg,
        display: 'flex', alignItems: 'center', paddingLeft: 8,
        overflow: 'hidden', cursor: 'default',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        minWidth: 4,
      }}
    >
      {width > 10 && (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {contrato.clientes?.nome || '-'}
        </span>
      )}
    </div>
  )
}

export default function OcupacaoPlacas() {
  const [placas, setPlacas]       = useState([])
  const [contratos, setContratos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [periodo, setPeriodo]     = useState(12)
  const [placaSel, setPlacaSel]   = useState(null)

  useEffect(() => {
    async function carregar() {
      const [p, c] = await Promise.all([
        supabase.from('placas').select('*').order('nome'),
        supabase.from('contratos').select('*, clientes(nome), contrato_placas(placa_id)').order('data_inicio'),
      ])
      setPlacas(p.data || [])
      setContratos(c.data || [])
      setLoading(false)
    }
    carregar()
  }, [])

  const hoje = new Date()
  const maxDate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0) // fim do mês atual
  const minDate = new Date(hoje.getFullYear(), hoje.getMonth() - (periodo - 1), 1)
  const totalDays = Math.ceil((maxDate - minDate) / 86400000) + 1

  // Gerar marcadores de meses para o eixo X
  const marcadoresMeses = []
  for (let i = 0; i < periodo; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (periodo - 1) + i, 1)
    const offsetDays = (d - minDate) / 86400000
    const left = (offsetDays / totalDays) * 100
    marcadoresMeses.push({ label: MESES[d.getMonth()], ano: d.getFullYear(), left })
  }

  // Linha do hoje
  const hojeOffset = ((hoje - minDate) / 86400000 / totalDays) * 100

  // Stats por placa
  const statsPlaca = (placa) => {
    const cs = contratos.filter(c =>
      (c.contrato_placas || []).some(cp => cp.placa_id === placa.id) ||
      c.placa_id === placa.id
    )
    const ativos   = cs.filter(c => calcStatus(c.data_inicio, c.data_fim) === 'ativo').length
    const totalFat = cs.reduce((s, c) => s + (c.valor_total || 0), 0)
    const diasOcup = cs.reduce((s, c) => {
      if (!c.data_inicio || !c.data_fim) return s
      const di = new Date(c.data_inicio + 'T00:00:00')
      const df = new Date(c.data_fim + 'T23:59:59')
      const dini = Math.max(di, minDate)
      const dfim = Math.min(df, maxDate)
      if (dfim < dini) return s
      return s + Math.ceil((dfim - dini) / 86400000)
    }, 0)
    const pctOcup = Math.min(Math.round((diasOcup / totalDays) * 100), 100)
    return { contratos: cs, ativos, totalFat, pctOcup }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, gap: 12, flexDirection: 'column' }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.primarySoft}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const placasFiltradas = placaSel ? placas.filter(p => p.id === placaSel) : placas

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Manrope','Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.3px', color: C.text }}>Ocupação por Placa</h1>
          <p style={{ margin: 0, fontSize: 14, color: C.textLight }}>Histórico de contratos e períodos livres</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={placaSel || ''}
            onChange={e => setPlacaSel(e.target.value || null)}
            style={{ height: 38, padding: '0 12px', borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', color: C.text }}
          >
            <option value="">Todas as placas</option>
            {placas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          {[6, 12, 24].map(m => (
            <button
              key={m}
              onClick={() => setPeriodo(m)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: periodo === m ? 700 : 500,
                background: periodo === m ? C.primary : C.surface,
                color: periodo === m ? '#fff' : C.textMed,
                boxShadow: periodo === m ? 'none' : `0 0 0 1px ${C.border}`,
              }}
            >{m}m</button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
        {[
          { color: '#1565C0', label: 'Ativo' },
          { color: '#7C3AED', label: 'Reservado (futuro)' },
          { color: '#6B7280', label: 'Expirado' },
          { color: '#E5E7EB', label: 'Disponível' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 10, borderRadius: 3, background: l.color }} />
            <span style={{ color: C.textLight, fontWeight: 600 }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Gantt */}
      <div style={{ background: C.surface, borderRadius: 14, boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)', overflow: 'hidden' }}>
        {/* Eixo X — meses */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, position: 'relative', height: 32, marginLeft: 200 }}>
          {marcadoresMeses.map((m, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${m.left}%`,
              fontSize: 11, fontWeight: 600, color: C.textLight,
              paddingTop: 8, paddingLeft: 4, borderLeft: `1px solid ${C.border}`,
              height: '100%', boxSizing: 'border-box',
            }}>
              {m.label}{m.left > 85 ? '' : periodo > 12 && i % 2 !== 0 ? '' : ` ${m.ano}`}
            </div>
          ))}
          {/* linha do hoje */}
          <div style={{ position: 'absolute', left: `${hojeOffset}%`, top: 0, bottom: 0, borderLeft: '2px dashed #EF4444', zIndex: 5 }}>
            <div style={{ position: 'absolute', top: 2, left: 3, fontSize: 10, fontWeight: 700, color: '#EF4444', whiteSpace: 'nowrap' }}>Hoje</div>
          </div>
        </div>

        {/* Linhas por placa */}
        {placasFiltradas.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.textLight, fontSize: 14 }}>Nenhuma placa cadastrada.</div>
        )}
        {placasFiltradas.map((placa, pi) => {
          const stats = statsPlaca(placa)
          const cs = stats.contratos.filter(c => {
            if (!c.data_inicio || !c.data_fim) return false
            const di = new Date(c.data_inicio + 'T00:00:00')
            const df = new Date(c.data_fim + 'T23:59:59')
            return df >= minDate && di <= maxDate
          })

          return (
            <div key={placa.id} style={{
              display: 'flex', alignItems: 'center',
              borderBottom: pi < placasFiltradas.length - 1 ? `1px solid ${C.border}` : 'none',
              background: pi % 2 === 0 ? 'white' : '#FAFBFC',
              minHeight: 54,
            }}>
              {/* Nome da placa */}
              <div style={{
                width: 200, flexShrink: 0, padding: '10px 16px',
                borderRight: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{placa.nome}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${stats.pctOcup}%`, height: '100%', background: C.primary, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, whiteSpace: 'nowrap' }}>{stats.pctOcup}% ocup.</span>
                </div>
              </div>

              {/* Barra Gantt */}
              <div style={{ flex: 1, position: 'relative', height: 54, padding: '13px 8px', boxSizing: 'border-box' }}>
                {/* Fundo disponível */}
                <div style={{ position: 'absolute', inset: '13px 8px', background: '#F0F4FF', borderRadius: 6, opacity: 0.5 }} />
                {/* Linha do hoje */}
                <div style={{ position: 'absolute', left: `${hojeOffset}%`, top: 0, bottom: 0, borderLeft: '2px dashed #EF4444', opacity: 0.5, zIndex: 4 }} />
                {/* Contratos */}
                {cs.map(c => (
                  <GanttBar key={c.id} contrato={c} minDate={minDate} maxDate={maxDate} totalDays={totalDays} />
                ))}
                {cs.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 12, fontSize: 12, color: C.textLight }}>
                    Disponível no período
                  </div>
                )}
              </div>

              {/* Total faturado */}
              <div style={{ width: 110, flexShrink: 0, padding: '10px 16px', borderLeft: `1px solid ${C.border}`, textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: C.textLight }}>Faturado</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{formatBRL(stats.totalFat)}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabela de detalhes */}
      {placaSel && (() => {
        const placa = placas.find(p => p.id === placaSel)
        const stats = statsPlaca(placa)
        return (
          <div style={{ background: C.surface, borderRadius: 14, boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Contratos — {placa?.nome}</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F7F8FB' }}>
                  {['Cliente','Início','Fim','Valor','Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.contratos.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: C.textLight }}>Sem contratos para essa placa.</td></tr>
                )}
                {stats.contratos.sort((a, b) => (b.data_inicio || '') > (a.data_inicio || '') ? 1 : -1).map((c, i) => {
                  const st = calcStatus(c.data_inicio, c.data_fim)
                  const sts = {
                    ativo:     { label: 'Ativo',     bg: '#E7F6EC', color: '#166534' },
                    reservado: { label: 'Reservado', bg: '#EDE9FE', color: '#5B21B6' },
                    expirado:  { label: 'Expirado',  bg: '#F3F4F6', color: '#6B7280' },
                  }
                  const s = sts[st] || sts.ativo
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: C.text }}>{c.clientes?.nome || '-'}</td>
                      <td style={{ padding: '12px 14px', color: C.textMed }}>{formatDate(c.data_inicio)}</td>
                      <td style={{ padding: '12px 14px', color: C.textMed }}>{formatDate(c.data_fim)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: C.text }}>{formatBRL(c.valor_total)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 12, fontWeight: 700 }}>{s.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })()}

    </div>
  )
}
