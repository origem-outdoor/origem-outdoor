import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { KPI, Badge, formatBRL, formatDate, diasRestantes } from '../components/UI'

export default function Dashboard() {
  const [dados, setDados] = useState({ placas: [], contratos: [], clientes: [], comissoes: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const [p, c, cl, co] = await Promise.all([
        supabase.from('placas').select('*'),
        supabase.from('contratos').select('*, placas(nome), clientes(nome, data_nascimento)'),
        supabase.from('clientes').select('*'),
        supabase.from('comissoes').select('*'),
      ])
      setDados({ placas: p.data || [], contratos: c.data || [], clientes: cl.data || [], comissoes: co.data || [] })
      setLoading(false)
    }
    carregar()
  }, [])

  const hoje = new Date()
  const contratosAtivos = dados.contratos.filter(c => c.status === 'ativo')
  const faturamentoMes = contratosAtivos.reduce((s, c) => s + (c.valor_total || 0), 0)
  const placasLivres = dados.placas.filter(p => {
    const temContrato = contratosAtivos.some(c => c.placa_id === p.id && c.status === 'ativo')
    return !temContrato
  })
  const vencendo30 = contratosAtivos.filter(c => {
    const d = diasRestantes(c.data_fim)
    return d !== null && d >= 0 && d <= 30
  })
  const aniversarios30 = dados.clientes.filter(c => {
    if (!c.data_nascimento) return false
    const nasc = new Date(c.data_nascimento)
    const proxAniv = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())
    if (proxAniv < hoje) proxAniv.setFullYear(hoje.getFullYear() + 1)
    const diff = Math.ceil((proxAniv - hoje) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 30
  })

  const faturamento6m = dados.contratos
    .filter(c => {
      const ini = new Date(c.data_inicio)
      const seis = new Date(); seis.setMonth(seis.getMonth() - 6)
      return ini >= seis
    })
    .reduce((s, c) => s + (c.valor_total || 0), 0)

  if (loading) return <div style={{ color: '#888', fontSize: 14 }}>Carregando...</div>

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a18' }}>Painel Origem Outdoor</h1>
        <p style={{ fontSize: 13, color: '#888', marginTop: 3 }}>
          {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPI label="Contratos ativos" valor={contratosAtivos.length} sub={`de ${dados.placas.length} placas`} />
        <KPI label="Faturamento contratos ativos" valor={formatBRL(faturamentoMes)} cor="#0A5C42" />
        <KPI label="Faturamento últimos 6m" valor={formatBRL(faturamento6m)} cor="#0C447C" />
        <KPI label="Placas disponíveis" valor={placasLivres.length} sub="prontas para vender" cor="#1D9E75" />
        <KPI label="Clientes cadastrados" valor={dados.clientes.length} />
        <KPI label="Comissões registradas" valor={dados.comissoes.length} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Alertas de vencimento */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', marginBottom: 14 }}>
            ⚠️ Contratos vencendo em 30 dias
          </h2>
          {vencendo30.length === 0 ? (
            <p style={{ fontSize: 13, color: '#aaa' }}>Nenhum contrato vencendo em breve.</p>
          ) : vencendo30.map(c => {
            const d = diasRestantes(c.data_fim)
            return (
              <div key={c.id} style={{
                padding: '10px 0', borderBottom: '1px solid #f0f0f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{c.placas?.nome}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{c.clientes?.nome} · vence {formatDate(c.data_fim)}</div>
                </div>
                <Badge
                  texto={d <= 7 ? `${d}d ⚡` : `${d} dias`}
                  cor={d <= 7 ? 'vermelho' : d <= 15 ? 'amarelo' : 'azul'}
                />
              </div>
            )
          })}
        </div>

        {/* Aniversários */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', marginBottom: 14 }}>
            🎂 Aniversários em 30 dias
          </h2>
          {aniversarios30.length === 0 ? (
            <p style={{ fontSize: 13, color: '#aaa' }}>Nenhum aniversário próximo.</p>
          ) : aniversarios30.map(c => {
            const nasc = new Date(c.data_nascimento)
            const proxAniv = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())
            if (proxAniv < hoje) proxAniv.setFullYear(hoje.getFullYear() + 1)
            const diff = Math.ceil((proxAniv - hoje) / (1000 * 60 * 60 * 24))
            return (
              <div key={c.id} style={{
                padding: '10px 0', borderBottom: '1px solid #f0f0f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{c.empresa || 'Sem empresa'}</div>
                </div>
                <Badge texto={diff === 0 ? '🎉 Hoje!' : `em ${diff}d`} cor={diff <= 3 ? 'verde' : 'azul'} />
              </div>
            )
          })}
        </div>

        {/* Placas livres */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', marginBottom: 14 }}>
            🟢 Placas disponíveis para vender
          </h2>
          {placasLivres.length === 0 ? (
            <p style={{ fontSize: 13, color: '#aaa' }}>Todas as placas estão locadas.</p>
          ) : placasLivres.map(p => (
            <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{p.nome}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{p.endereco} · {p.tipo === 'dupla' ? '18x3m (dupla)' : '9x3m (simples)'}</div>
            </div>
          ))}
        </div>

        {/* Últimos contratos */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', marginBottom: 14 }}>
            📄 Contratos recentes
          </h2>
          {dados.contratos.slice(0, 5).map(c => (
            <div key={c.id} style={{
              padding: '10px 0', borderBottom: '1px solid #f0f0f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{c.clientes?.nome || 'Sem cliente'}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{c.placas?.nome} · {formatDate(c.data_inicio)} – {formatDate(c.data_fim)}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0A5C42' }}>{formatBRL(c.valor_total)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
