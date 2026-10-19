import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, COLORS } from '../components/UI'

function gerarBisemanas(ano) {
  const bises = []
  let d = new Date(ano, 0, 1)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  let num = 1
  while (d.getFullYear() === ano) {
    const inicio = new Date(d)
    const fim = new Date(d)
    fim.setDate(fim.getDate() + 13)
    bises.push({
      num,
      label: `Bi-semana ${num} — ${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0],
    })
    d.setDate(d.getDate() + 14)
    num++
  }
  return bises
}

const ANO_ATUAL = new Date().getFullYear()
const BISEMANAS = gerarBisemanas(ANO_ATUAL)

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const STATUS_LABEL = {
  livre:      { emoji: '✅', label: 'Livre',      bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  reservada:  { emoji: '🔵', label: 'Reservada',  bg: '#EDE7F6', text: '#5E35B1', border: '#C5B8EF' },
  ocupada:    { emoji: '🔴', label: 'Ocupada',    bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' },
  manutencao: { emoji: '🔧', label: 'Manutenção', bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
}

function PlacaCard({ p, onCreateContrato }) {
  const st = STATUS_LABEL[p.tipo] || STATUS_LABEL.livre
  const isPreste = p.preste
  const cardBg = isPreste ? '#FFFBEB' : st.bg
  const cardBorder = isPreste ? '#FCD34D' : st.border
  const cardText = isPreste ? '#B45309' : st.text
  return (
    <div style={{ background: cardBg, borderRadius: 14, border: `1.5px solid ${cardBorder}`, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18' }}>{p.nome}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{p.tipo_placa === 'dupla' ? '18×3m dupla' : '9×3m simples'}</div>
          {p.endereco && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{p.endereco}</div>}
        </div>
        <span style={{ fontSize: 22 }}>{isPreste ? '⏳' : st.emoji}</span>
      </div>
      <div style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.6)', color: cardText, border: `1px solid ${cardBorder}`, marginBottom: 10 }}>
        {isPreste ? `${st.label} · libera ${new Date(p.cFim + 'T00:00:00').toLocaleDateString('pt-BR')}` : st.label}
      </div>
      {p.contrato && (
        <div style={{ fontSize: 12, color: cardText, opacity: 0.85, marginBottom: 8 }}>
          {p.contrato.clientes?.nome && <div>👤 {p.contrato.clientes.nome}</div>}
          <div>📅 {new Date(p.contrato.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(p.cFim + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
        </div>
      )}
      {p.tipo === 'livre' && onCreateContrato && (
        <button onClick={onCreateContrato} style={{
          fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none',
          background: '#2E7D32', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>+ Criar contrato</button>
      )}
    </div>
  )
}

export default function Disponibilidade({ setPage }) {
  const [placas, setPlacas] = useState([])
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscado, setBuscado] = useState(false)
  const [modoConsulta, setModoConsulta] = useState('bisemana')
  const [bissemanaSel, setBissemanaSel] = useState(() => {
    const hoje = new Date().toISOString().split('T')[0]
    const idx = BISEMANAS.findIndex(b => b.inicio <= hoje && b.fim >= hoje)
    return idx >= 0 ? idx : 0
  })
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')

  useEffect(() => {
    async function carregar() {
      const [pl, co] = await Promise.all([
        // Busca todas as placas sem filtro (evita bug PostgREST com NULL), filtra inativas no JS
        supabase.from('placas').select('id, nome, tipo, endereco, status'),
        supabase.from('contratos')
          .select('id, placa_id, data_inicio, data_fim, status, clientes(nome), contrato_placas(placa_id, data_inicio, data_fim)')
          .not('data_inicio', 'is', null)
          .not('data_fim', 'is', null)
          .not('status', 'in', '("encerrado","cancelado","renovado")'),
      ])
      const placasAtivas = (pl.data || []).filter(p => p.status !== 'inativa')
      setPlacas(placasAtivas)
      setContratos(co.data || [])
      setLoading(false)
    }
    carregar()
  }, [])

  const periodoAtual = modoConsulta === 'bisemana'
    ? { inicio: BISEMANAS[bissemanaSel]?.inicio || '', fim: BISEMANAS[bissemanaSel]?.fim || '' }
    : { inicio: periodoInicio, fim: periodoFim }

  const canSearch = !!(periodoAtual.inicio && periodoAtual.fim)

  const getContratoConflito = (placa, pIni, pFim) => {
    for (const c of contratos) {
      const cpEntries = (c.contrato_placas || []).filter(cp => cp.placa_id === placa.id)
      if (cpEntries.length > 0) {
        for (const cp of cpEntries) {
          const cIni = cp.data_inicio || c.data_inicio
          const cFim = cp.data_fim || c.data_fim
          if (cIni <= pFim && cFim >= pIni) return { contrato: c, cFim }
        }
      } else if (c.placa_id === placa.id) {
        if (c.data_inicio <= pFim && c.data_fim >= pIni) return { contrato: c, cFim: c.data_fim }
      }
    }
    return null
  }

  const getStatusPlaca = (placa, pIni, pFim) => {
    if (placa.status === 'manutencao') return { tipo: 'manutencao', contrato: null, cFim: null }
    const conflito = getContratoConflito(placa, pIni, pFim)
    if (!conflito) return { tipo: 'livre', contrato: null, cFim: null }
    const hoje = new Date().toISOString().split('T')[0]
    const tipo = conflito.contrato.data_inicio > hoje ? 'reservada' : 'ocupada'
    return { tipo, contrato: conflito.contrato, cFim: conflito.cFim }
  }

  const pIni = buscado ? periodoAtual.inicio : ''
  const pFim = buscado ? periodoAtual.fim : ''

  const placasComStatus = buscado
    ? placas.map(p => ({ ...p, tipo_placa: p.tipo, ...getStatusPlaca(p, pIni, pFim) }))
    : []

  const dataLimite5 = pFim ? addDays(pFim, 5) : ''

  const livres     = placasComStatus.filter(p => p.tipo === 'livre')
  const manutencao = placasComStatus.filter(p => p.tipo === 'manutencao')
  const ocupadas   = placasComStatus.filter(p => p.tipo === 'ocupada' || p.tipo === 'reservada')
  const prestesIds = new Set(
    buscado ? ocupadas.filter(p => p.cFim && p.cFim <= dataLimite5).map(p => p.id) : []
  )
  const prestesALiberar = ocupadas.filter(p => prestesIds.has(p.id)).map(p => ({ ...p, preste: true }))
  const apenasOcupadas  = ocupadas.filter(p => !prestesIds.has(p.id))

  if (loading) return <div style={{ color: '#888', padding: 40 }}>Carregando...</div>

  const BtnBuscar = (
    <button
      onClick={() => canSearch && setBuscado(true)}
      disabled={!canSearch}
      style={{
        padding: '10px 26px', borderRadius: 10, border: 'none',
        cursor: canSearch ? 'pointer' : 'not-allowed',
        background: canSearch ? COLORS.primary : '#ccc',
        color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', height: 42,
      }}
    >🔍 Buscar</button>
  )

  return (
    <div>
      <PageHeader title="Disponibilidade" sub="Consulta rápida de placas disponíveis por período" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['bisemana', '📅 Por Bi-semana'], ['periodo', '🗓 Período livre']].map(([v, l]) => (
          <button key={v} onClick={() => { setModoConsulta(v); setBuscado(false) }} style={{
            padding: '8px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            fontWeight: modoConsulta === v ? 600 : 400,
            background: modoConsulta === v ? COLORS.primary : '#fff',
            color: modoConsulta === v ? '#fff' : '#555',
            border: `1px solid ${modoConsulta === v ? COLORS.primary : '#ddd'}`,
          }}>{l}</button>
        ))}
      </div>

      {modoConsulta === 'bisemana' ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <select
              value={bissemanaSel}
              onChange={e => { setBissemanaSel(Number(e.target.value)); setBuscado(false) }}
              style={{ width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 14, background: '#fff', color: COLORS.text, cursor: 'pointer' }}
            >
              {BISEMANAS.map((b, i) => <option key={i} value={i}>{b.label}</option>)}
            </select>
            {BISEMANAS[bissemanaSel] && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                Período: {new Date(BISEMANAS[bissemanaSel].inicio + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} até {new Date(BISEMANAS[bissemanaSel].fim + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </div>
            )}
          </div>
          {BtnBuscar}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Data início</label>
            <input type="date" value={periodoInicio} onChange={e => { setPeriodoInicio(e.target.value); setBuscado(false) }}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Data fim</label>
            <input type="date" value={periodoFim} onChange={e => { setPeriodoFim(e.target.value); setBuscado(false) }}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
          </div>
          {BtnBuscar}
        </div>
      )}

      {!buscado && (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          {placas.length === 0
            ? <><div style={{ fontSize: 40, marginBottom: 12 }}>🪧</div><div style={{ fontSize: 15 }}>Nenhuma placa cadastrada</div></>
            : <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 15 }}>Selecione um período e clique em Buscar</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>{placas.length} placa{placas.length !== 1 ? 's' : ''} cadastrada{placas.length !== 1 ? 's' : ''}</div>
              </>
          }
        </div>
      )}

      {buscado && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              ['✅', livres.length, 'livres', '#E8F5E9', '#2E7D32'],
              ['⏳', prestesALiberar.length, 'prestes a liberar', '#FFFBEB', '#B45309'],
              ['🔴', apenasOcupadas.length, 'ocupadas/reservadas', '#FFEBEE', '#C62828'],
              ['🔧', manutencao.length, 'em manutenção', '#FFF3E0', '#E65100'],
            ].filter(([, count]) => count > 0).map(([emoji, count, label, bg, color]) => (
              <div key={label} style={{ background: bg, borderRadius: 12, padding: '10px 18px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color }}>{count}</div>
                  <div style={{ fontSize: 11, color, opacity: 0.8 }}>placa{count !== 1 ? 's' : ''} {label}</div>
                </div>
              </div>
            ))}
          </div>

          {livres.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2E7D32', marginBottom: 12 }}>✅ Placas Disponíveis ({livres.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {livres.map(p => <PlacaCard key={p.id} p={p} onCreateContrato={setPage ? () => setPage('contratos') : null} />)}
              </div>
            </section>
          )}

          {prestesALiberar.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#B45309', marginBottom: 6 }}>⏳ Ficam livres em até 5 dias ({prestesALiberar.length})</h3>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                Ocupadas no período, mas o contrato termina até {dataLimite5 ? new Date(dataLimite5 + 'T00:00:00').toLocaleDateString('pt-BR') : ''}.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {prestesALiberar.map(p => <PlacaCard key={p.id} p={p} />)}
              </div>
            </section>
          )}

          {apenasOcupadas.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#C62828', marginBottom: 12 }}>🔴 Placas Ocupadas / Reservadas ({apenasOcupadas.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {apenasOcupadas.map(p => <PlacaCard key={p.id} p={p} />)}
              </div>
            </section>
          )}

          {livres.length === 0 && prestesALiberar.length === 0 && manutencao.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
              <div style={{ fontSize: 15 }}>Nenhuma placa disponível neste período</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
