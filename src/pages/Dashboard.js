import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatBRL, formatDate, diasRestantes } from '../components/UI'

const C = {
  primary:      '#1565C0',
  primaryLight: '#1E88E5',
  primarySoft:  '#E8F0FB',
  primaryDark:  '#0D47A1',
  bg:           '#F5F6FA',
  surface:      '#FFFFFF',
  border:       '#E6E9F0',
  borderLight:  '#EEF1F6',
  text:         '#1A2233',
  textMed:      '#4A5468',
  textLight:    '#5B6577',
  success:      '#166534',
  successSoft:  '#E7F6EC',
  warn:         '#9A3412',
  warnSoft:     '#FFF1E0',
  danger:       '#C2410C',
  dangerSoft:   '#FFF7EE',
}

const IcoContract  = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>
const IcoDollar    = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
const IcoTrend     = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>
const IcoBoard     = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="11" rx="1.5"/><path d="M8 15v6M16 15v6M6 21h4M14 21h4"/></svg>
const IcoUsers     = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/></svg>
const IcoAlert     = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
const IcoBars      = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
const IcoPlus      = () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>

function KpiCard({ icon, label, value, sub, blue = false, bar = null }) {
  return (
    <div style={{
      background: blue ? C.primary : C.surface,
      color: blue ? '#fff' : C.text,
      borderRadius: 14, padding: 18,
      boxShadow: blue ? '0 4px 16px rgba(21,101,192,0.25)' : '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: blue ? 'rgba(255,255,255,0.16)' : C.primarySoft,
          color: blue ? '#fff' : C.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: blue ? '#E3EEFB' : C.textLight }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      {bar !== null && (
        <div style={{ height: 6, borderRadius: 3, background: C.primarySoft, overflow: 'hidden' }}>
          <div style={{ width: `${bar}%`, height: '100%', background: C.primary, borderRadius: 3 }} />
        </div>
      )}
      {sub && <div style={{ fontSize: 12, color: blue ? '#E3EEFB' : C.textLight }}>{sub}</div>}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    ativo:     { label: 'Ativo',                  bg: C.successSoft,  color: C.success     },
    vencendo:  { label: 'Vencendo',               bg: C.warnSoft,     color: C.warn        },
    expirado:  { label: 'Expirado',               bg: '#FEE2E2',      color: '#991B1B'     },
    pendente:  { label: 'Aguardando assinatura',  bg: C.primarySoft,  color: C.primaryDark },
    cancelado: { label: 'Cancelado',              bg: '#F3F4F6',      color: '#374151'     },
  }
  const s = map[status] || { label: status || '-', bg: '#F3F4F6', color: '#374151' }
  return (
    <span style={{
      display: 'inline-block', padding: '4px 10px', borderRadius: 999,
      background: s.bg, color: s.color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

function BarChart({ meses }) {
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  if (!meses || meses.length === 0) return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textLight, fontSize: 13 }}>
      Sem dados de faturamento
    </div>
  )
  const max = Math.max(...meses.map(m => m.valor), 1)
  const total = meses.reduce((s, m) => s + m.valor, 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Faturamento mensal</h2>
          <span style={{ fontSize: 13, color: C.textLight }}>{nomes[meses[0].mes - 1]} a {nomes[meses[meses.length-1].mes - 1]} de {meses[0].ano}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{formatBRL(total)}</span>
          <span style={{ fontSize: 12, color: C.textLight }}>total no periodo</span>
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 14, height: 200, padding: '0 4px',
        borderBottom: `1px solid ${C.borderLight}`,
        backgroundImage: `linear-gradient(${C.borderLight} 1px, transparent 1px)`,
        backgroundSize: '100% 50px', backgroundPosition: '0 0',
      }}>
        {meses.map((m, i) => {
          const isLast = i === meses.length - 1
          const h = Math.max(Math.round((m.valor / max) * 180), m.valor > 0 ? 8 : 0)
          const label = formatBRL(m.valor).replace('R$ ','').replace('R$ ','')
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {isLast
                ? <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: C.primary, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap' }}>{label}</span>
                : <span style={{ fontSize: 11, fontWeight: 700, color: C.textMed, whiteSpace: 'nowrap' }}>{m.valor > 0 ? label : '-'}</span>
              }
              <div style={{ width: '100%', maxWidth: 52, height: h || 4, background: isLast ? C.primary : '#BBD3F0', borderRadius: '8px 8px 0 0' }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, padding: '0 4px', marginTop: -8 }}>
        {meses.map((m, i) => {
          const isLast = i === meses.length - 1
          return <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: isLast ? 800 : 600, color: isLast ? C.primary : C.textLight }}>{nomes[m.mes-1]}</span>
        })}
      </div>
    </div>
  )
}

function DonutChart({ ativas, disponiveis, manutencao }) {
  const total = ativas + disponiveis + manutencao || 1
  const circ = 2 * Math.PI * 70
  const pctA = ativas / total, pctD = disponiveis / total, pctM = manutencao / total
  const dashA = circ * pctA, dashD = circ * pctD, dashM = circ * pctM
  const offD = -(circ - dashA), offM = -(circ - dashA - dashD)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Ocupacao de placas</h2>
        <span style={{ fontSize: 13, color: C.textLight }}>{total} placas no inventario</span>
      </div>
      <div style={{ position: 'relative', width: 190, height: 190, alignSelf: 'center' }}>
        <svg width="190" height="190" viewBox="0 0 180 180" aria-hidden="true">
          <circle cx="90" cy="90" r="70" fill="none" stroke="#F0F2F6" strokeWidth="22" />
          <circle cx="90" cy="90" r="70" fill="none" stroke={C.primary} strokeWidth="22" strokeDasharray={`${dashA} ${circ}`} strokeDashoffset="0" transform="rotate(-90 90 90)" />
          <circle cx="90" cy="90" r="70" fill="none" stroke="#90CAF9" strokeWidth="22" strokeDasharray={`${dashD} ${circ}`} strokeDashoffset={offD} transform="rotate(-90 90 90)" />
          <circle cx="90" cy="90" r="70" fill="none" stroke="#F59E0B" strokeWidth="22" strokeDasharray={`${dashM} ${circ}`} strokeDashoffset={offM} transform="rotate(-90 90 90)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', color: C.text }}>{Math.round(pctA * 100)}%</span>
          <span style={{ fontSize: 12, color: C.textLight }}>ocupacao</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { color: C.primary, label: 'Ativas',         count: ativas,      pct: Math.round(pctA*100) },
          { color: '#90CAF9', label: 'Disponiveis',     count: disponiveis,  pct: Math.round(pctD*100) },
          { color: '#F59E0B', label: 'Em manutencao',   count: manutencao,   pct: Math.round(pctM*100) },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: row.color, flexShrink: 0 }} />
            <span style={{ flexGrow: 1, color: C.textMed }}>{row.label}</span>
            <span style={{ fontWeight: 700, color: C.text }}>{row.count}</span>
            <span style={{ width: 40, textAlign: 'right', fontSize: 12, color: C.textLight }}>{row.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [dados, setDados] = useState({ placas: [], contratos: [], clientes: [] })
  const [loading, setLoading] = useState(true)
  const hoje = new Date()

  useEffect(() => {
    async function carregar() {
      const [p, c, cl] = await Promise.all([
        supabase.from('placas').select('*'),
        supabase.from('contratos').select('*, placas(nome, status), clientes(nome)').order('data_inicio', { ascending: false }),
        supabase.from('clientes').select('*'),
      ])
      setDados({ placas: p.data || [], contratos: c.data || [], clientes: cl.data || [] })
      setLoading(false)
    }
    carregar()
  }, [])

  const contratosAtivos  = dados.contratos.filter(c => c.status === 'ativo')
  const faturamentoAtivo = contratosAtivos.reduce((s, c) => s + (c.valor_total || 0), 0)
  const totalPlacas      = dados.placas.length
  const placasAtivas     = dados.placas.filter(p => p.status === 'ativo').length
  const placasDisp       = dados.placas.filter(p => p.status === 'disponivel' || p.status === 'livre').length
  const placasManut      = dados.placas.filter(p => p.status === 'manutencao').length
  const pctDisp          = totalPlacas ? Math.round((placasDisp / totalPlacas) * 100) : 0

  const meses6m = (() => {
    const mapa = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const k = `${d.getFullYear()}-${d.getMonth()+1}`
      mapa[k] = { mes: d.getMonth()+1, ano: d.getFullYear(), valor: 0 }
    }
    dados.contratos.forEach(c => {
      if (!c.data_inicio) return
      const d = new Date(c.data_inicio)
      const k = `${d.getFullYear()}-${d.getMonth()+1}`
      if (mapa[k]) mapa[k].valor += c.valor_total || 0
    })
    return Object.values(mapa)
  })()
  const fat6m = meses6m.reduce((s, m) => s + m.valor, 0)

  const vencendo30 = contratosAtivos
    .filter(c => { const d = diasRestantes(c.data_fim); return d !== null && d >= 0 && d <= 30 })
    .sort((a, b) => diasRestantes(a.data_fim) - diasRestantes(b.data_fim))

  const recentes = dados.contratos.slice(0, 7)

  const statusExibicao = (c) => {
    const d = diasRestantes(c.data_fim)
    if (c.status === 'ativo' && d !== null && d <= 30) return 'vencendo'
    return c.status
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.primarySoft}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13, color: C.textLight }}>Carregando...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Manrope','Inter',system-ui,sans-serif" }}>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.3px', color: C.text }}>Dashboard</h1>
          <p style={{ margin: 0, fontSize: 14, color: C.textLight }}>Visao geral da operacao · atualizado em {hoje.toLocaleDateString('pt-BR')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ height: 44, padding: '0 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: 'inherit', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <IcoBars /> Ultimos 6 meses
          </button>
          <button style={{ height: 44, padding: '0 18px', borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <IcoPlus /> Novo contrato
          </button>
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
        <KpiCard icon={<IcoContract />} label="Contratos Ativos" value={contratosAtivos.length} sub={<><span style={{ color: '#1B7A3E', fontWeight: 700 }}>+0</span> em relacao ao mes passado</>} />
        <KpiCard icon={<IcoDollar />}   label="Faturamento Ativo" value={formatBRL(faturamentoAtivo)} sub="receita mensal recorrente" />
        <KpiCard icon={<IcoTrend />}    label="Faturamento 6 meses" value={formatBRL(fat6m)} sub={<><span style={{ fontWeight: 700 }}>acumulado</span> ultimos 6 meses</>} blue />
        <KpiCard icon={<IcoBoard />}    label="Placas Disponiveis" value={<>{placasDisp} <span style={{ fontSize: 15, fontWeight: 600, color: C.textLight }}>de {totalPlacas}</span></>} bar={pctDisp} />
        <KpiCard icon={<IcoUsers />}    label="Clientes Cadastrados" value={dados.clientes.length} sub={<><span style={{ color: '#1B7A3E', fontWeight: 700 }}>+0</span> novos este mes</>} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 20 }}>
        <section style={{ background: C.surface, borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)' }}>
          <BarChart meses={meses6m} />
        </section>
        <section style={{ background: C.surface, borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)' }}>
          <DonutChart ativas={placasAtivas} disponiveis={placasDisp} manutencao={placasManut} />
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 20 }}>
        <section style={{ background: C.surface, borderRadius: 14, padding: '22px 24px 12px', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Contratos recentes</h2>
            <a href="#" style={{ fontSize: 13, fontWeight: 700, color: C.primary, textDecoration: 'none' }}>Ver todos</a>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: C.textLight, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {['Cliente','Placa','Valor/mes','Status','Vencimento'].map((h,i,arr) => (
                    <th key={h} style={{ padding: '10px 8px', fontWeight: 700, background: '#F7F8FB', borderRadius: i===0?'8px 0 0 8px':i===arr.length-1?'0 8px 8px 0':0 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentes.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '24px 8px', textAlign: 'center', color: C.textLight, fontSize: 13 }}>Nenhum contrato cadastrado ainda.</td></tr>
                )}
                {recentes.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < recentes.length-1 ? `1px solid ${C.borderLight}` : 'none' }}>
                    <td style={{ padding: '13px 8px', fontWeight: 600, color: C.text }}>{c.clientes?.nome || '-'}</td>
                    <td style={{ padding: '13px 8px', color: C.textMed }}>{c.placas?.nome || '-'}</td>
                    <td style={{ padding: '13px 8px', textAlign: 'right', fontWeight: 600, color: C.text }}>{formatBRL(c.valor_total)}</td>
                    <td style={{ padding: '13px 8px' }}><StatusBadge status={statusExibicao(c)} /></td>
                    <td style={{ padding: '13px 8px', color: C.textMed }}>{formatDate(c.data_fim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ background: C.surface, borderRadius: 14, padding: '22px 24px', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: C.warnSoft, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoAlert /></span>
            <div style={{ flexGrow: 1 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Vencendo em 30 dias</h2>
              <span style={{ fontSize: 12, color: C.textLight }}>{formatBRL(vencendo30.reduce((s,c) => s+(c.valor_total||0),0))}/mes em renovacao</span>
            </div>
            <span style={{ minWidth: 28, height: 28, padding: '0 8px', boxSizing: 'border-box', borderRadius: 999, background: C.danger, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{vencendo30.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vencendo30.length === 0 && (
              <div style={{ fontSize: 13, color: C.textLight, textAlign: 'center', padding: '20px 0' }}>Nenhum contrato vencendo em 30 dias</div>
            )}
            {vencendo30.slice(0, 4).map(c => {
              const d = diasRestantes(c.data_fim)
              const urgent = d <= 7
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: urgent ? C.dangerSoft : '#F7F8FB' }}>
                  <div style={{ width: 46, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: urgent ? C.warn : C.text }}>{d}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: urgent ? C.warn : C.textLight }}>dias</span>
                  </div>
                  <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.clientes?.nome || '-'}</span>
                    <span style={{ fontSize: 12, color: C.textLight }}>{c.placas?.nome} - vence {formatDate(c.data_fim)} - {formatBRL(c.valor_total)}</span>
                  </div>
                  <a href="#" style={{ fontSize: 13, fontWeight: 700, color: C.primary, textDecoration: 'none', padding: '8px 4px', flexShrink: 0 }}>Renovar</a>
                </div>
              )
            })}
          </div>
          {vencendo30.length > 0 && (
            <a href="#" style={{ marginTop: 'auto', height: 44, borderRadius: 10, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Ver todos os vencimentos</a>
          )}
        </section>
      </div>

    </div>
  )
}
