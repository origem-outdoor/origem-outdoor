// CLIENTES
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, Card, Btn, Input, Select, Modal, Badge, formatBRL, formatDate } from '../components/UI'

const FORM_CLI = { nome: '', empresa: '', cpf_cnpj: '', telefone: '', email: '', data_nascimento: '', pede_nota: false, observacoes: '' }

export function Clientes() {
  const [clientes, setClientes] = useState([])
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(FORM_CLI)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')

  const carregar = async () => {
    const [cl, co] = await Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('contratos').select('cliente_id, valor_total'),
    ])
    setClientes(cl.data || [])
    setContratos(co.data || [])
    setLoading(false)
  }
  useEffect(() => { carregar() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const abrir = (c = null) => {
    setForm(c ? { ...c } : FORM_CLI)
    setModal(c ? 'editar' : 'novo')
  }

  const salvar = async () => {
    setSalvando(true)
    const payload = { ...form }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    if (!payload.data_nascimento) payload.data_nascimento = null
    if (modal === 'novo') await supabase.from('clientes').insert(payload)
    else await supabase.from('clientes').update(payload).eq('id', form.id)
    setSalvando(false); setModal(null); carregar()
  }

  const excluir = async (id) => {
    if (!window.confirm('Remover cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    carregar()
  }

  const cliFiltrados = clientes.filter(c =>
    !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.empresa || '').toLowerCase().includes(busca.toLowerCase())
  )

  const hoje = new Date()
  const anivProximo = (nasc) => {
    if (!nasc) return null
    const d = new Date(nasc)
    const prox = new Date(hoje.getFullYear(), d.getMonth(), d.getDate())
    if (prox < hoje) prox.setFullYear(hoje.getFullYear() + 1)
    return Math.ceil((prox - hoje) / (1000 * 60 * 60 * 24))
  }

  if (loading) return <div style={{ color: '#888' }}>Carregando...</div>

  return (
    <div>
      <PageHeader title="Clientes" sub={`${clientes.length} cadastrados`} action={<Btn onClick={() => abrir()}>+ Novo cliente</Btn>} />

      <input placeholder="Buscar por nome ou empresa..." value={busca} onChange={e => setBusca(e.target.value)}
        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, width: 280, marginBottom: 16, outline: 'none' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {cliFiltrados.map(c => {
          const totalGasto = contratos.filter(co => co.cliente_id === c.id).reduce((s, co) => s + (co.valor_total || 0), 0)
          const qtdContratos = contratos.filter(co => co.cliente_id === c.id).length
          const dias = anivProximo(c.data_nascimento)
          return (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18' }}>{c.nome}</div>
                  {c.empresa && <div style={{ fontSize: 12, color: '#888' }}>{c.empresa}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  {c.pede_nota && <Badge texto="Emite NF" cor="azul" />}
                  {dias !== null && dias <= 30 && <Badge texto={dias === 0 ? '🎂 Hoje!' : `🎂 ${dias}d`} cor="verde" />}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#555', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                {c.telefone && <span>📞 {c.telefone}</span>}
                {c.email && <span>✉️ {c.email}</span>}
                {c.data_nascimento && <span>🎂 {formatDate(c.data_nascimento)}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginBottom: 12 }}>
                <div style={{ fontSize: 12 }}><div style={{ color: '#888', marginBottom: 2 }}>TOTAL GASTO</div><div style={{ fontWeight: 700, color: '#0A5C42' }}>{formatBRL(totalGasto)}</div></div>
                <div style={{ fontSize: 12 }}><div style={{ color: '#888', marginBottom: 2 }}>CONTRATOS</div><div style={{ fontWeight: 700 }}>{qtdContratos}x</div></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => abrir(c)} variant="secondary" size="sm" style={{ flex: 1 }}>Editar</Btn>
                <Btn onClick={() => excluir(c.id)} variant="danger" size="sm">Remover</Btn>
              </div>
            </Card>
          )
        })}
      </div>

      {modal && (
        <Modal title={modal === 'novo' ? 'Novo Cliente' : 'Editar Cliente'} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Input label="Nome" value={form.nome} onChange={v => set('nome', v)} required style={{ gridColumn: '1/-1' }} />
            <Input label="Empresa" value={form.empresa || ''} onChange={v => set('empresa', v)} />
            <Input label="CPF / CNPJ" value={form.cpf_cnpj || ''} onChange={v => set('cpf_cnpj', v)} />
            <Input label="Telefone / WhatsApp" value={form.telefone || ''} onChange={v => set('telefone', v)} />
            <Input label="Email" value={form.email || ''} onChange={v => set('email', v)} type="email" />
            <Input label="Data de nascimento" value={form.data_nascimento || ''} onChange={v => set('data_nascimento', v)} type="date" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.pede_nota} onChange={e => set('pede_nota', e.target.checked)} />
              Cliente solicita nota fiscal
            </label>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 4 }}>Observações</label>
            <textarea value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={() => setModal(null)} variant="secondary">Cancelar</Btn>
            <Btn onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// COMISSÕES
const FORM_COM = { tipo: 'comissao', descricao: '', cliente_id: '', valor_negociado: 0, percentual_comissao: 20, proprietario_placa: '', valor_recebido_troca: 0, custo_colagem: 0, custo_impressao_troca: 0, data_inicio: '', data_fim: '', status_pagamento: 'aguardando', data_pagamento: '', observacoes: '' }

export function Comissoes() {
  const [comissoes, setComissoes] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(FORM_COM)
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    const [co, cl] = await Promise.all([
      supabase.from('comissoes').select('*, clientes(nome)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])
    setComissoes(co.data || [])
    setClientes(cl.data || [])
    setLoading(false)
  }
  useEffect(() => { carregar() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const abrir = (c = null) => {
    setForm(c ? { ...c } : FORM_COM)
    setModal(c ? 'editar' : 'novo')
  }

  const salvar = async () => {
    setSalvando(true)
    const payload = { ...form }
    delete payload.id; delete payload.created_at; delete payload.clientes; delete payload.valor_comissao
    if (!payload.cliente_id) payload.cliente_id = null
    if (!payload.data_inicio) payload.data_inicio = null
    if (!payload.data_fim) payload.data_fim = null
    if (!payload.data_pagamento) payload.data_pagamento = null
    if (modal === 'novo') await supabase.from('comissoes').insert(payload)
    else await supabase.from('comissoes').update(payload).eq('id', form.id)
    setSalvando(false); setModal(null); carregar()
  }

  const totalComissoes = comissoes.filter(c => c.status_pagamento === 'pago' && c.tipo !== 'troca_placa').reduce((s, c) => s + (c.valor_comissao || 0), 0)
  const totalTrocas = comissoes.filter(c => c.tipo === 'troca_placa').length
  const totalRecebidoTrocas = comissoes.filter(c => c.tipo === 'troca_placa').reduce((s, c) => s + (Number(c.valor_recebido_troca) || 0), 0)
  const custoTrocas = comissoes.filter(c => c.tipo === 'troca_placa').reduce((s, c) => s + (Number(c.custo_colagem) || 0) + (Number(c.custo_impressao_troca) || 0), 0)
  const totalRecebido = totalComissoes + totalRecebidoTrocas

  if (loading) return <div style={{ color: '#888' }}>Carregando...</div>

  return (
    <div>
      <PageHeader title="Comissões e Sublocações" sub="Placas de terceiros negociadas" action={<Btn onClick={() => abrir()}>+ Nova comissão</Btn>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Total recebido</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0A5C42' }}>{formatBRL(totalRecebido)}</div>
          {totalRecebidoTrocas > 0 && <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 4 }}>incl. {formatBRL(totalRecebidoTrocas)} trocas</div>}
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Registros</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>{comissoes.length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Custo trocas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#c0392b' }}>{formatBRL(custoTrocas)}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{totalTrocas} troca{totalTrocas !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comissoes.map(c => (
          <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.descricao}
                  {c.tipo === 'troca_placa' ? <Badge texto="🔄 Troca de Placa" cor="#7C3AED" /> : <Badge texto="💼 Comissão" cor="#0A5C42" />}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {c.tipo === 'troca_placa' ? (
                    <>Proprietário: {c.proprietario_placa || '-'} · Custo colagem: {formatBRL(c.custo_colagem)} · Impressão: {formatBRL(c.custo_impressao_troca)}{Number(c.valor_recebido_troca) > 0 && <> · Recebido: {formatBRL(c.valor_recebido_troca)}</>}{c.data_inicio && <span> · {formatDate(c.data_inicio)} → {formatDate(c.data_fim)}</span>}</>
                  ) : (
                    <>{c.clientes?.nome && <span>{c.clientes.nome} · </span>}Negociado: {formatBRL(c.valor_negociado)} · {c.percentual_comissao}% = {formatBRL(c.valor_comissao)}{c.data_inicio && <span> · {formatDate(c.data_inicio)} → {formatDate(c.data_fim)}</span>}</>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {c.tipo !== 'troca_placa' && <Badge texto={c.status_pagamento === 'pago' ? 'Pago' : c.status_pagamento === 'atrasado' ? 'Atrasado' : 'Aguardando'}
                  cor={c.status_pagamento === 'pago' ? 'verde' : c.status_pagamento === 'atrasado' ? 'vermelho' : 'amarelo'} />}
                {c.tipo === 'troca_placa'
                  ? <div style={{ fontSize: 16, fontWeight: 700, color: Number(c.valor_recebido_troca) > 0 ? '#15803d' : '#c0392b' }}>{Number(c.valor_recebido_troca) > 0 ? `+ ${formatBRL(Number(c.valor_recebido_troca) - (Number(c.custo_colagem)||0) - (Number(c.custo_impressao_troca)||0))}` : `- ${formatBRL((Number(c.custo_colagem)||0)+(Number(c.custo_impressao_troca)||0))}`}</div>
                  : <div style={{ fontSize: 16, fontWeight: 700, color: '#0A5C42' }}>{formatBRL(c.valor_comissao)}</div>
                }
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0f0f0' }}>
              <Btn onClick={() => abrir(c)} variant="secondary" size="sm">Editar</Btn>
            </div>
          </div>
        ))}
        {comissoes.length === 0 && <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: 40 }}>Nenhuma comissão registrada.</div>}
      </div>

      {modal && (
        <Modal title={modal === 'novo' ? 'Nova Comissão / Troca' : 'Editar Comissão / Troca'} onClose={() => setModal(null)}>
          <Select label="Tipo" value={form.tipo || 'comissao'} onChange={v => set('tipo', v)} options={[
            { value: 'comissao', label: '💼 Comissão (placa de terceiro)' },
            { value: 'troca_placa', label: '🔄 Troca de Placa' },
          ]} />
          <Input label="Descrição" value={form.descricao} onChange={v => set('descricao', v)} required />
          {form.tipo === 'troca_placa' ? (
            <>
              <Input label="Proprietário da placa (ex: Cícero)" value={form.proprietario_placa || ''} onChange={v => set('proprietario_placa', v)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Input label="Custo de colagem (R$)" value={form.custo_colagem || 0} onChange={v => set('custo_colagem', Number(v))} type="number" />
                <Input label="Custo de impressão (R$)" value={form.custo_impressao_troca || 0} onChange={v => set('custo_impressao_troca', Number(v))} type="number" />
                <Input label="Período início" value={form.data_inicio || ''} onChange={v => set('data_inicio', v)} type="date" />
                <Input label="Período fim" value={form.data_fim || ''} onChange={v => set('data_fim', v)} type="date" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Input label="Valor recebido do cliente (R$)" value={form.valor_recebido_troca || 0} onChange={v => set('valor_recebido_troca', Number(v))} type="number" />
                <Select label="Forma de pagamento" value={form.status_pagamento || 'aguardando'} onChange={v => set('status_pagamento', v)} options={[
                  { value: 'aguardando', label: 'Aguardando' },
                  { value: 'pago', label: 'Pago' },
                  { value: 'atrasado', label: 'Atrasado' },
                ]} />
              </div>
              {form.status_pagamento === 'pago' && <Input label="Data do recebimento" value={form.data_pagamento || ''} onChange={v => set('data_pagamento', v)} type="date" />}
              <div style={{ background: '#FFF1F0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontWeight: 600, color: '#9A0000' }}>
                Custo total da troca: {formatBRL((Number(form.custo_colagem)||0) + (Number(form.custo_impressao_troca)||0))}
                {Number(form.valor_recebido_troca) > 0 && <span style={{ color: '#15803d', marginLeft: 16 }}>· Lucro: {formatBRL(Number(form.valor_recebido_troca) - (Number(form.custo_colagem)||0) - (Number(form.custo_impressao_troca)||0))}</span>}
              </div>
            </>
          ) : (
            <>
              <Select label="Cliente" value={form.cliente_id || ''} onChange={v => set('cliente_id', v)}
                options={clientes.map(c => ({ value: c.id, label: c.nome }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Input label="Valor total negociado (R$)" value={form.valor_negociado} onChange={v => set('valor_negociado', Number(v))} type="number" />
                <Input label="Comissão (%)" value={form.percentual_comissao} onChange={v => set('percentual_comissao', Number(v))} type="number" />
                <Input label="Período início" value={form.data_inicio || ''} onChange={v => set('data_inicio', v)} type="date" />
                <Input label="Período fim" value={form.data_fim || ''} onChange={v => set('data_fim', v)} type="date" />
                <Select label="Status pagamento" value={form.status_pagamento} onChange={v => set('status_pagamento', v)} options={[
                  { value: 'aguardando', label: 'Aguardando' },
                  { value: 'pago', label: 'Pago' },
                  { value: 'atrasado', label: 'Atrasado' },
                ]} />
                <Input label="Data pagamento" value={form.data_pagamento || ''} onChange={v => set('data_pagamento', v)} type="date" />
              </div>
              <div style={{ background: '#EAF3DE', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontWeight: 600, color: '#27500A' }}>
                Sua comissão: {formatBRL(form.valor_negociado * form.percentual_comissao / 100)}
              </div>
            </>
          )}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 4 }}>Observações</label>
            <textarea value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={() => setModal(null)} variant="secondary">Cancelar</Btn>
            <Btn onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// RELATÓRIOS
export function Relatorios() {
  const [contratos, setContratos] = useState([])
  const [parcelas, setParcelas] = useState([])
  const [todasParcelas, setTodasParcelas] = useState([])
  const [comissoes, setComissoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('6m')
  const hoje = new Date()

  useEffect(() => {
    async function carregar() {
      const [co, pa, todas, cm] = await Promise.all([
        supabase.from('contratos').select('*, placas(nome), clientes(nome), contrato_placas(placa_id, valor_por_placa, placas(nome))').order('data_inicio', { ascending: false }),
        supabase.from('parcelas').select('*').in('status', ['paga','pago']),
        supabase.from('parcelas').select('contrato_id'),
        supabase.from('comissoes').select('*'),
      ])
      setContratos(co.data || [])
      setParcelas(pa.data || [])
      setTodasParcelas(todas.data || [])
      setComissoes(cm.data || [])
      setLoading(false)
    }
    carregar()
  }, [])

  // Corte = início do 1o mês do período (calendário, não janela deslizante)
  // "1m" = começo deste mês; "3m" = começo de 2 meses atrás; etc.
  const mesesNum = periodo === '1m' ? 1 : periodo === '3m' ? 3 : periodo === '6m' ? 6 : 12
  const corte = new Date(hoje.getFullYear(), hoje.getMonth() - (mesesNum - 1), 1)

  // Parcelas pagas cujo pagamento caiu dentro do período selecionado
  const parcelasDoPeriodo = parcelas.filter(p => {
    const dataRef = p.data_pagamento || p.data_vencimento
    if (!dataRef) return false
    return new Date(dataRef + 'T00:00:00') >= corte
  })

  // Contratos que tiveram pelo menos uma parcela paga no período
  const contratoIdsNoPeriodo = new Set(parcelasDoPeriodo.map(p => p.contrato_id))
  const contratosNoPeriodo = contratos.filter(c => contratoIdsNoPeriodo.has(c.id))

  // Comissões: filtrar por data_pagamento ou data_inicio (não created_at)
  const comsFiltradas = comissoes.filter(c => {
    const dataRef = c.data_pagamento || c.data_inicio
    if (!dataRef) return false
    return new Date(dataRef + 'T00:00:00') >= corte
  })
  const comissoesPagas = comsFiltradas.filter(c => c.tipo !== 'troca_placa' && c.status_pagamento === 'pago')
  const trocasNoPeriodo = comsFiltradas.filter(c => c.tipo === 'troca_placa')

  // Faturamento = soma das parcelas pagas no período + comissões recebidas
  const faturamentoParcelas = parcelasDoPeriodo.reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const faturamentoComissoes = comissoesPagas.reduce((s, c) => s + (c.valor_comissao || 0), 0)
  const trocasPagasNoPeriodo = trocasNoPeriodo.filter(c => c.status_pagamento === 'pago')
  const faturamentoTrocas = trocasPagasNoPeriodo.reduce((s, c) => s + (Number(c.valor_recebido_troca) || 0), 0)
  const faturamento = faturamentoParcelas + faturamentoComissoes + faturamentoTrocas

  // Total de parcelas por contrato (para calcular custo proporcional)
  const totalParcelasPorContrato = todasParcelas.reduce((acc, p) => {
    acc[p.contrato_id] = (acc[p.contrato_id] || 0) + 1
    return acc
  }, {})

  // Parcelas pagas no período por contrato
  const parcelasPagasPorContrato = parcelasDoPeriodo.reduce((acc, p) => {
    acc[p.contrato_id] = (acc[p.contrato_id] || 0) + 1
    return acc
  }, {})

  // Custos proporcionais: custo_total_contrato × (parcelas_pagas_no_período / total_parcelas_contrato)
  const custosPropContratos = contratosNoPeriodo.reduce((s, c) => {
    const totalParcelas = totalParcelasPorContrato[c.id] || 1
    const parcelasPagas = parcelasPagasPorContrato[c.id] || 0
    const proporcao = parcelasPagas / totalParcelas
    const custoTotal = (c.custo_colador || 0) + (c.custo_impressao || 0) + (c.custo_terreno_proporcional || 0) + (c.custo_extra || 0) + (c.valor_imposto || 0)
    return s + custoTotal * proporcao
  }, 0)
  const custoTrocasPeriodo = trocasNoPeriodo.reduce((s, c) => s + (Number(c.custo_colagem)||0) + (Number(c.custo_impressao_troca)||0), 0)
  const custos = custosPropContratos + custoTrocasPeriodo
  const lucro = faturamento - custos
  const comissaoTotal = faturamentoComissoes

  // Mapa contrato_id → contrato (para lookup rápido)
  const contratoMap = Object.fromEntries(contratos.map(c => [c.id, c]))

  // Ranking por placa — distribui valor da parcela proporcionalmente entre placas do contrato
  const porPlaca = {}
  parcelasDoPeriodo.forEach(p => {
    const cont = contratoMap[p.contrato_id]
    const placasContrato = cont?.contrato_placas || []
    if (placasContrato.length === 0) {
      const nome = cont?.placas?.nome || 'Sem placa'
      if (!porPlaca[nome]) porPlaca[nome] = 0
      porPlaca[nome] += Number(p.valor) || 0
    } else if (placasContrato.length === 1) {
      const nome = placasContrato[0]?.placas?.nome || 'Sem placa'
      if (!porPlaca[nome]) porPlaca[nome] = 0
      porPlaca[nome] += Number(p.valor) || 0
    } else {
      // Distribui proporcionalmente ao valor_por_placa de cada placa
      const totalContrato = placasContrato.reduce((s, cp) => s + (Number(cp.valor_por_placa) || 0), 0)
      placasContrato.forEach(cp => {
        const nome = cp?.placas?.nome || 'Sem placa'
        const proporcao = totalContrato > 0 ? (Number(cp.valor_por_placa) || 0) / totalContrato : 1 / placasContrato.length
        if (!porPlaca[nome]) porPlaca[nome] = 0
        porPlaca[nome] += (Number(p.valor) || 0) * proporcao
      })
    }
  })
  const rankingPlacas = Object.entries(porPlaca).sort((a, b) => b[1] - a[1])

  // Ranking por cliente — somando parcelas pagas no período
  const porCliente = {}
  parcelasDoPeriodo.forEach(p => {
    const cont = contratoMap[p.contrato_id]
    const nome = cont?.clientes?.nome || 'Sem cliente'
    if (!porCliente[nome]) porCliente[nome] = { total: 0, qtd: 0 }
    porCliente[nome].total += Number(p.valor) || 0
    porCliente[nome].qtd++
  })
  const rankingClientes = Object.entries(porCliente).sort((a, b) => b[1].total - a[1].total)

  if (loading) return <div style={{ color: '#888' }}>Carregando...</div>

  return (
    <div>
      <PageHeader title="Relatórios" sub="Visão financeira da Origem Outdoor" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['1m', '1 mês'], ['3m', '3 meses'], ['6m', '6 meses'], ['12m', '1 ano']].map(([v, l]) => (
          <button key={v} onClick={() => setPeriodo(v)} style={{
            padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            fontWeight: periodo === v ? 600 : 400,
            background: periodo === v ? '#1a1a18' : '#fff',
            color: periodo === v ? '#fff' : '#555',
            border: `1px solid ${periodo === v ? '#1a1a18' : '#ddd'}`,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Faturamento</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0C447C' }}>{formatBRL(faturamento)}</div>
          {faturamentoComissoes > 0 && <div style={{ fontSize: 11, color: '#0A5C42', marginTop: 4 }}>inclui {formatBRL(faturamentoComissoes)} comissões</div>}
          {faturamentoTrocas > 0 && <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 4 }}>inclui {formatBRL(faturamentoTrocas)} em trocas</div>}
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Custos</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#c0392b' }}>{formatBRL(custos)}</div>
          {custoTrocasPeriodo > 0 && <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 4 }}>{formatBRL(custoTrocasPeriodo)} em trocas</div>}
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Lucro líquido</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: lucro >= 0 ? '#0A5C42' : '#c0392b' }}>{formatBRL(lucro)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Comissões recebidas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1D9E75' }}>{formatBRL(comissaoTotal)}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{comissoesPagas.length} comissão(ões) no período</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Total geral</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>{formatBRL(lucro + comissaoTotal)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Contratos no período</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>{contratosNoPeriodo.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', marginBottom: 14 }}>🏆 Ranking por placa</h2>
          {rankingPlacas.map(([nome, total], i) => (
            <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: 13, color: '#333' }}>{i + 1}. {nome}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0A5C42' }}>{formatBRL(total)}</span>
            </div>
          ))}
          {rankingPlacas.length === 0 && <p style={{ fontSize: 13, color: '#aaa' }}>Sem dados no período.</p>}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', marginBottom: 14 }}>👤 Ranking por cliente</h2>
          {rankingClientes.map(([nome, { total, qtd }], i) => (
            <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: 13, color: '#333' }}>{i + 1}. {nome} <span style={{ color: '#aaa', fontSize: 11 }}>({qtd}x)</span></span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0A5C42' }}>{formatBRL(total)}</span>
            </div>
          ))}
          {rankingClientes.length === 0 && <p style={{ fontSize: 13, color: '#aaa' }}>Sem dados no período.</p>}
        </div>
      </div>
    </div>
  )
}

export default Clientes
