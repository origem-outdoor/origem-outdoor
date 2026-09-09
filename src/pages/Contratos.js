import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, Badge, Btn, Input, Select, Modal, formatBRL, formatDate, diasRestantes, STATUS_CONTRATO, STATUS_PAGAMENTO } from '../components/UI'

const FORM_VAZIO = {
  placa_id: '', face: 'A', cliente_id: '',
  data_inicio: '', data_fim: '', duracao_tipo: '3m',
  modalidade: 'veiculacao',
  valor_veiculacao: 0, valor_arte: 0, valor_impressao: 0,
  custo_colador: 0, custo_impressao: 0, custo_terreno_proporcional: 0,
  custo_extra: 0, descricao_custo_extra: '',
  percentual_imposto: 0, valor_imposto: 0,
  emite_nota: false,
  forma_pagamento: 'pix', condicao_pagamento: 'antecipado',
  status_pagamento: 'aguardando', data_pagamento: '', observacoes_pagamento: '',
  historico: false, status: 'ativo', observacoes: ''
}

const DURACOES = [
  { value: '14d', label: '14 dias (bi-semana)' },
  { value: '28d', label: '28 dias (2 bi-semanas)' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '1a', label: '1 ano' },
  { value: 'custom', label: 'Personalizado' },
]

function calcDataFim(inicio, duracao) {
  if (!inicio || duracao === 'custom') return ''
  const d = new Date(inicio)
  if (duracao === '14d') d.setDate(d.getDate() + 14)
  else if (duracao === '28d') d.setDate(d.getDate() + 28)
  else if (duracao === '3m') d.setMonth(d.getMonth() + 3)
  else if (duracao === '6m') d.setMonth(d.getMonth() + 6)
  else if (duracao === '1a') d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

export default function Contratos() {
  const [contratos, setContratos] = useState([])
  const [placas, setPlacas] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [filtro, setFiltro] = useState('ativo')

  const carregar = async () => {
    const [co, pl, cl] = await Promise.all([
      supabase.from('contratos').select('*, placas(nome, tipo), clientes(nome)').order('created_at', { ascending: false }),
      supabase.from('placas').select('id, nome, tipo').eq('status', 'ativa'),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])
    setContratos(co.data || [])
    setPlacas(pl.data || [])
    setClientes(cl.data || [])
    setLoading(false)
  }
  useEffect(() => { carregar() }, [])

  const set = (k, v) => setForm(f => {
    const novo = { ...f, [k]: v }
    if (k === 'data_inicio' || k === 'duracao_tipo') {
      novo.data_fim = calcDataFim(k === 'data_inicio' ? v : novo.data_inicio, k === 'duracao_tipo' ? v : novo.duracao_tipo)
    }
    return novo
  })

  const abrir = (c = null) => {
    setForm(c ? { ...c } : FORM_VAZIO)
    setModal(c ? 'editar' : 'novo')
  }

  const salvar = async () => {
    setSalvando(true)
    const payload = { ...form }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    delete payload.placas; delete payload.clientes; delete payload.valor_total

    if (modal === 'novo') await supabase.from('contratos').insert(payload)
    else await supabase.from('contratos').update(payload).eq('id', form.id)
    setSalvando(false)
    setModal(null)
    carregar()
  }

  const excluir = async (id) => {
    if (!window.confirm('Remover este contrato?')) return
    await supabase.from('contratos').delete().eq('id', id)
    carregar()
  }

  const contFiltrados = filtro === 'todos' ? contratos : contratos.filter(c => c.status === filtro)
  const valorTotal = form.valor_veiculacao + form.valor_arte + form.valor_impressao
  const custoTotal = Number(form.custo_colador) + Number(form.custo_impressao) + Number(form.custo_terreno_proporcional) + Number(form.custo_extra) + Number(form.valor_imposto)
  const lucro = valorTotal - custoTotal

  if (loading) return <div style={{ color: '#888' }}>Carregando...</div>

  return (
    <div>
      <PageHeader
        title="Contratos"
        sub={`${contratos.filter(c => c.status === 'ativo').length} ativos`}
        action={<Btn onClick={() => abrir()}>+ Novo contrato</Btn>}
      />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['todos', 'Todos'], ['ativo', 'Ativos'], ['encerrado', 'Encerrados'], ['renovado', 'Renovados']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            fontWeight: filtro === v ? 600 : 400,
            background: filtro === v ? '#1a1a18' : '#fff',
            color: filtro === v ? '#fff' : '#555',
            border: `1px solid ${filtro === v ? '#1a1a18' : '#ddd'}`,
          }}>{l}</button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contFiltrados.map(c => {
          const dias = diasRestantes(c.data_fim)
          const urgente = c.status === 'ativo' && dias !== null && dias >= 0 && dias <= 15
          return (
            <div key={c.id} style={{
              background: '#fff', borderRadius: 12,
              border: `1px solid ${urgente ? '#D4A01744' : '#eee'}`,
              padding: '16px 20px',
              boxShadow: urgente ? '0 0 0 2px #D4A01722' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18' }}>
                    {c.clientes?.nome || 'Sem cliente'}
                    {c.historico && <span style={{ fontSize: 10, background: '#EEEDFE', color: '#3C3489', borderRadius: 10, padding: '2px 7px', marginLeft: 8, fontWeight: 600 }}>HISTÓRICO</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {c.placas?.nome} {c.face !== 'AB' ? `· Face ${c.face}` : '· Face dupla'}
                    &nbsp;·&nbsp;{formatDate(c.data_inicio)} → {formatDate(c.data_fim)}
                    {dias !== null && c.status === 'ativo' && <span style={{ marginLeft: 6, color: urgente ? '#B45309' : '#888' }}>({dias < 0 ? 'vencido' : `${dias}d restantes`})</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge texto={STATUS_PAGAMENTO[c.status_pagamento]?.label} cor={STATUS_PAGAMENTO[c.status_pagamento]?.cor} />
                  <Badge texto={STATUS_CONTRATO[c.status]?.label} cor={STATUS_CONTRATO[c.status]?.cor} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0A5C42' }}>{formatBRL(c.valor_total)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                <Btn onClick={() => abrir(c)} variant="secondary" size="sm">Editar</Btn>
                <Btn onClick={() => excluir(c.id)} variant="danger" size="sm">Remover</Btn>
              </div>
            </div>
          )
        })}
        {contFiltrados.length === 0 && <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: 40 }}>Nenhum contrato encontrado.</div>}
      </div>

      {modal && (
        <Modal title={modal === 'novo' ? 'Novo Contrato' : 'Editar Contrato'} onClose={() => setModal(null)} width={600}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Select label="Placa" value={form.placa_id} onChange={v => set('placa_id', v)} required
              options={placas.map(p => ({ value: p.id, label: `${p.nome} (${p.tipo})` }))} />
            <Select label="Face" value={form.face} onChange={v => set('face', v)}
              options={[{ value: 'A', label: 'Face A' }, { value: 'B', label: 'Face B' }, { value: 'AB', label: 'Dupla completa (AB)' }]} />
            <Select label="Cliente" value={form.cliente_id} onChange={v => set('cliente_id', v)}
              options={clientes.map(c => ({ value: c.id, label: c.nome }))} style={{ gridColumn: '1/-1' }} />
            <Select label="Duração" value={form.duracao_tipo} onChange={v => set('duracao_tipo', v)} options={DURACOES} />
            <Input label="Data início" value={form.data_inicio} onChange={v => set('data_inicio', v)} type="date" required />
            <Input label="Data fim" value={form.data_fim} onChange={v => set('data_fim', v)} type="date" required />
            <Select label="Modalidade" value={form.modalidade} onChange={v => set('modalidade', v)} options={[
              { value: 'veiculacao', label: 'Só veiculação' },
              { value: 'completo', label: 'Atendimento completo (arte + impressão)' },
            ]} style={{ gridColumn: '1/-1' }} />
          </div>

          <div style={{ background: '#F7F6F2', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>RECEITAS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' }}>
              <Input label="Veiculação (R$)" value={form.valor_veiculacao} onChange={v => set('valor_veiculacao', Number(v))} type="number" />
              {form.modalidade === 'completo' && <>
                <Input label="Arte (R$)" value={form.valor_arte} onChange={v => set('valor_arte', Number(v))} type="number" />
                <Input label="Impressão recebida (R$)" value={form.valor_impressao} onChange={v => set('valor_impressao', Number(v))} type="number" />
              </>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A5C42' }}>Total: {formatBRL(valorTotal)}</div>
          </div>

          <div style={{ background: '#FFF5F5', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>CUSTOS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Input label="Custo colador (R$)" value={form.custo_colador} onChange={v => set('custo_colador', Number(v))} type="number" />
              <Input label="Custo impressão (R$)" value={form.custo_impressao} onChange={v => set('custo_impressao', Number(v))} type="number" />
              <Input label="Aluguel terreno proporcional (R$)" value={form.custo_terreno_proporcional} onChange={v => set('custo_terreno_proporcional', Number(v))} type="number" />
              <Input label="Imposto (R$)" value={form.valor_imposto} onChange={v => set('valor_imposto', Number(v))} type="number" />
              <Input label="Custo extra (R$)" value={form.custo_extra} onChange={v => set('custo_extra', Number(v))} type="number" />
              <Input label="Descrição custo extra" value={form.descricao_custo_extra} onChange={v => set('descricao_custo_extra', v)} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#c0392b' }}>Total custos: {formatBRL(custoTotal)}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: lucro >= 0 ? '#0A5C42' : '#c0392b', marginTop: 4 }}>
              Lucro líquido: {formatBRL(lucro)}
            </div>
          </div>

          <div style={{ background: '#F0F5FF', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>PAGAMENTO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Select label="Forma de pagamento" value={form.forma_pagamento} onChange={v => set('forma_pagamento', v)} options={[
                { value: 'pix', label: 'Pix' },
                { value: 'dinheiro', label: 'Dinheiro' },
                { value: 'transferencia', label: 'Transferência' },
                { value: 'boleto', label: 'Boleto' },
              ]} />
              <Select label="Condição" value={form.condicao_pagamento} onChange={v => set('condicao_pagamento', v)} options={[
                { value: 'antecipado', label: 'Antecipado (início)' },
                { value: 'pos_veiculacao', label: 'Pós-veiculação (fim)' },
                { value: 'parcelado', label: 'Parcelado' },
              ]} />
              <Select label="Status pagamento" value={form.status_pagamento} onChange={v => set('status_pagamento', v)} options={[
                { value: 'aguardando', label: 'Aguardando' },
                { value: 'pago', label: 'Pago' },
                { value: 'parcial', label: 'Pago parcialmente' },
                { value: 'atrasado', label: 'Em atraso' },
              ]} />
              <Input label="Data de pagamento" value={form.data_pagamento || ''} onChange={v => set('data_pagamento', v)} type="date" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.emite_nota} onChange={e => set('emite_nota', e.target.checked)} />
                Emite nota fiscal
              </label>
            </div>
            <div style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 4 }}>Obs. pagamento</label>
              <input value={form.observacoes_pagamento || ''} onChange={e => set('observacoes_pagamento', e.target.value)}
                style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.historico} onChange={e => set('historico', e.target.checked)} />
              Contrato histórico (lançamento retroativo)
            </label>
          </div>

          <Select label="Status do contrato" value={form.status} onChange={v => set('status', v)} options={[
            { value: 'ativo', label: 'Ativo' },
            { value: 'encerrado', label: 'Encerrado' },
            { value: 'renovado', label: 'Renovado' },
            { value: 'cancelado', label: 'Cancelado' },
          ]} />

          <div style={{ marginBottom: 16 }}>
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
