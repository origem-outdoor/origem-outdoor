import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, Btn, COLORS } from '../components/UI'

// Gera lista de bi-semanas do ano atual
function gerarBisemanas(ano) {
  const bises = []
  let d = new Date(ano, 0, 1) // 1 jan
  // Alinha para segunda-feira da primeira semana com dia do ano
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  let num = 1
  while (d.getFullYear() === ano) {
    const inicio = new Date(d)
    const fim = new Date(d)
    fim.setDate(fim.getDate() + 13) // 14 dias
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

export default function Disponibilidade({ setPage }) {
  const [placas, setPlacas] = useState([])
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modoConsulta, setModoConsulta] = useState('bisemana') // 'bisemana' | 'periodo'
  const [bisemaanaSel, setBissemanaSel] = useState(() => {
    // Seleciona a bi-semana atual
    const hoje = new Date().toISOString().split('T')[0]
    const idx = BISEMANAS.findIndex(b => b.inicio <= hoje && b.fim >= hoje)
    return idx >= 0 ? idx : 0
  })
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')

  const carregar = async () => {
    const [pl, co] = await Promise.all([
      supabase.from('placas').select('id, nome, tipo, localizacao, status').neq('status', 'inativa'),
      supabase.from('contratos')
        .select('id, placa_id, data_inicio, data_fim, clientes(nome), contrato_placas(placa_id)')
        .in('status', ['ativo', 'reservado'])
        .not('data_inicio', 'is', null)
        .not('data_fim', 'is', null),
    ])
    setPlacas(pl.data || [])
    setContratos(co.data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const periodoAtual = modoConsulta === 'bisemana'
    ? { inicio: BISEMANAS[bisemaanaSel]?.inicio || '', fim: BISEMANAS[bisemaanaSel]?.fim || '' }
    : { inicio: periodoInicio, fim: periodoFim }

  // Para cada placa, descobre contratos que conflitam com o período
  const getStatusPlaca = (placa) => {
    if (placa.status === 'manutencao') return { tipo: 'manutencao', contrato: null }
    if (!periodoAtual.inicio || !periodoAtual.fim) return { tipo: 'livre', contrato: null }

    const pIni = periodoAtual.inicio
    const pFim = periodoAtual.fim

    // Verifica contrato_placas para cada contrato
    const conflito = contratos.find(c => {
      const cIni = c.data_inicio
      const cFim = c.data_fim
      // Verifica overlap: início do contrato <= fim do período E fim do contrato >= início do período
      const overlap = cIni <= pFim && cFim >= pIni
      if (!overlap) return false
      // Verifica se esta placa está no contrato (via contrato_placas ou placa_id legacy)
      const noContrato = (c.contrato_placas || []).some(cp => cp.placa_id === placa.id) || c.placa_id === placa.id
      return noContrato
    })

    if (!conflito) return { tipo: 'livre', contrato: null }

    // Reservado = contrato futuro (início depois de hoje)
    const hoje = new Date().toISOString().split('T')[0]
    if (conflito.data_inicio > hoje) return { tipo: 'reservada', contrato: conflito }
    return { tipo: 'ocupada', contrato: conflito }
  }

  const STATUS_LABEL = {
    livre:      { emoji: '✅', label: 'Livre',      bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
    reservada:  { emoji: '🔵', label: 'Reservada',  bg: '#EDE7F6', text: '#5E35B1', border: '#C5B8EF' },
    ocupada:    { emoji: '🔴', label: 'Ocupada',    bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' },
    manutencao: { emoji: '🔧', label: 'Manutenção', bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
  }

  const placasComStatus = placas.map(p => ({ ...p, ...getStatusPlaca(p) }))
  const livres = placasComStatus.filter(p => p.tipo === 'livre').length
  const ocupadas = placasComStatus.filter(p => p.tipo === 'ocupada').length
  const reservadas = placasComStatus.filter(p => p.tipo === 'reservada').length

  if (loading) return <div style={{ color: '#888' }}>Carregando...</div>

  return (
    <div>
      <PageHeader
        title="Disponibilidade"
        sub="Consulta rápida de placas disponíveis por período"
      />

      {/* Seletor de modo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['bisemana', '📅 Por Bi-semana'], ['periodo', '🗓 Período livre']].map(([v, l]) => (
          <button key={v} onClick={() => setModoConsulta(v)} style={{
            padding: '8px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            fontWeight: modoConsulta === v ? 600 : 400,
            background: modoConsulta === v ? COLORS.primary : '#fff',
            color: modoConsulta === v ? '#fff' : '#555',
            border: `1px solid ${modoConsulta === v ? COLORS.primary : '#ddd'}`,
          }}>{l}</button>
        ))}
      </div>

      {/* Seletor de período */}
      {modoConsulta === 'bisemana' ? (
        <div style={{ marginBottom: 20 }}>
          <select
            value={bisemaanaSel}
            onChange={e => setBissemanaSel(Number(e.target.value))}
            style={{
              width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 10,
              border: `1px solid ${COLORS.border}`, fontSize: 14, background: '#fff',
              color: COLORS.text, cursor: 'pointer',
            }}
          >
            {BISEMANAS.map((b, i) => (
              <option key={i} value={i}>{b.label}</option>
            ))}
          </select>
          {BISEMANAS[bisemaanaSel] && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
              Período: {new Date(BISEMANAS[bisemaanaSel].inicio + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} até {new Date(BISEMANAS[bisemaanaSel].fim + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Data início</label>
            <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Data fim</label>
            <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
          </div>
        </div>
      )}

      {/* Resumo */}
      {periodoAtual.inicio && periodoAtual.fim && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            ['✅', livres, 'livres', '#E8F5E9', '#2E7D32'],
            ['🔴', ocupadas, 'ocupadas', '#FFEBEE', '#C62828'],
            ['🔵', reservadas, 'reservadas', '#EDE7F6', '#5E35B1'],
          ].map(([emoji, count, label, bg, color]) => (
            <div key={label} style={{ background: bg, borderRadius: 12, padding: '10px 18px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{emoji}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>{count}</div>
                <div style={{ fontSize: 11, color, opacity: 0.8 }}>placa{count !== 1 ? 's' : ''} {label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid de placas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {placasComStatus.map(p => {
          const st = STATUS_LABEL[p.tipo] || STATUS_LABEL.livre
          return (
            <div key={p.id} style={{
              background: st.bg, borderRadius: 14,
              border: `1.5px solid ${st.border}`,
              padding: '16px 18px',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18' }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{p.tipo === 'dupla' ? '18×3m dupla' : '9×3m simples'}</div>
                  {p.localizacao && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{p.localizacao}</div>}
                </div>
                <span style={{ fontSize: 22 }}>{st.emoji}</span>
              </div>

              <div style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: 'rgba(255,255,255,0.6)', color: st.text, border: `1px solid ${st.border}`,
                marginBottom: 10,
              }}>
                {st.label}
              </div>

              {p.contrato && (
                <div style={{ fontSize: 12, color: st.text, opacity: 0.85, marginBottom: 10 }}>
                  {p.contrato.clientes?.nome && <div>👤 {p.contrato.clientes.nome}</div>}
                  <div>📅 {new Date(p.contrato.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(p.contrato.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                </div>
              )}

              {p.tipo === 'livre' && setPage && (
                <Btn
                  size="sm"
                  onClick={() => setPage('contratos')}
                  style={{ fontSize: 11 }}
                >
                  + Criar contrato
                </Btn>
              )}
            </div>
          )
        })}
      </div>

      {placas.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🪧</div>
          <div style={{ fontSize: 15 }}>Nenhuma placa cadastrada</div>
        </div>
      )}
    </div>
  )
}
