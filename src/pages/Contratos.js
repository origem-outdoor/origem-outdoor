import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, Badge, Btn, Input, Select, Modal, formatBRL, formatDate, diasRestantes, STATUS_PAGAMENTO, COLORS } from '../components/UI'

const FORM_VAZIO = {
  placa_ids: [],
  placa_datas: {},
  cliente_id: '',
  vendedor_id: '',
  data_inicio: '', data_fim: '', duracao_tipo: '3m',
  modalidade: 'veiculacao',
  valor_veiculacao: 0, valor_arte: 0, valor_impressao: 0,
  custo_colador: 0, custo_impressao: 0, custo_terreno_proporcional: 0,
  custo_extra: 0, descricao_custo_extra: '',
  percentual_imposto: 0, valor_imposto: 0,
  emite_nota: false,
  forma_pagamento: 'pix',
  forma_parcelamento: 'avista',
  num_parcelas: 2,
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

const FORMAS_PARCELAMENTO = [
  { value: 'avista',    label: 'À vista' },
  { value: 'parcelado', label: 'Parcelado' },
]

const STATUS_DINAMICO = {
  reservado: { label: 'Reservado', bg: '#EDE7F6', text: '#5E35B1', border: '#C5B8EF' },
  ativo:     { label: 'Ativo',     bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  vencendo:  { label: 'Vencendo',  bg: '#FFFDE7', text: '#F57F17', border: '#FFE082' },
  expirado:  { label: 'Expirado',  bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' },
  encerrado: { label: 'Encerrado', bg: '#F5F5F5', text: '#757575', border: '#E0E0E0' },
  renovado:  { label: 'Renovado',  bg: '#E1F5FE', text: '#0277BD', border: '#81D4FA' },
  cancelado: { label: 'Cancelado', bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' },
}

function calcDataFim(inicio, duracao) {
  if (!inicio || duracao === 'custom') return ''
  const d = new Date(inicio + 'T00:00:00')
  if (duracao === '14d') d.setDate(d.getDate() + 14)
  else if (duracao === '28d') d.setDate(d.getDate() + 28)
  else if (duracao === '3m') d.setMonth(d.getMonth() + 3)
  else if (duracao === '6m') d.setMonth(d.getMonth() + 6)
  else if (duracao === '1a') d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

// Status calculado dinamicamente pelas datas
function calcStatus(dataInicio, dataFim, statusManual) {
  if (['encerrado', 'renovado', 'cancelado'].includes(statusManual)) return statusManual
  if (!dataInicio || !dataFim) return statusManual || 'ativo'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const inicio = new Date(dataInicio + 'T00:00:00')
  const fim = new Date(dataFim + 'T23:59:59')
  if (inicio > hoje) return 'reservado'
  if (fim < hoje) return 'expirado'
  const diasRestam = Math.round((fim - hoje) / 86400000)
  if (diasRestam <= 7) return 'vencendo'
  return 'ativo'
}

// Gera lista de parcelas mensais com base na quantidade informada
function gerarParcelasContrato(valorTotal, numParcelas, dataInicio) {
  const n = Math.max(1, parseInt(numParcelas) || 1)
  const vt = Number(valorTotal) || 0
  if (!vt || !dataInicio) {
    return Array.from({ length: n }, (_, i) => ({
      numero: i + 1, valor: i === n - 1 ? vt : parseFloat((vt / n).toFixed(2)),
      data_vencimento: dataInicio || '', status: 'pendente'
    }))
  }
  const valorParcela = parseFloat((vt / n).toFixed(2))
  const diferenca = parseFloat((vt - valorParcela * n).toFixed(2))
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(dataInicio + 'T00:00:00')
    d.setMonth(d.getMonth() + i)
    return {
      numero: i + 1,
      valor: i === n - 1 ? parseFloat((valorParcela + diferenca).toFixed(2)) : valorParcela,
      data_vencimento: d.toISOString().split('T')[0],
      status: 'pendente'
    }
  })
}

export default function Contratos() {
  const [contratos, setContratos] = useState([])
  const [placas, setPlacas] = useState([])
  const [clientes, setClientes] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [parcelas, setParcelas] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [filtro, setFiltro] = useState('ativo')
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '' })
  const [criandoCliente, setCriandoCliente] = useState(false)
  const [salvandoCliente, setSalvandoCliente] = useState(false)

  const carregar = async () => {
    const [co, pl, cl, ve] = await Promise.all([
      supabase.from('contratos')
        .select('*, clientes(nome), vendedores(nome), contrato_placas(placa_id, face, valor_por_placa, placas(nome))')
        .order('created_at', { ascending: false }),
      supabase.from('placas').select('id, nome, tipo, aluguel_terreno_mensal').eq('status', 'ativa'),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('vendedores').select('id, nome').eq('ativo', true).order('nome'),
    ])
    setContratos(co.data || [])
    setPlacas(pl.data || [])
    setClientes(cl.data || [])
    setVendedores(ve.data || [])
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

  // Recalcula parcelas apenas ao abrir modal novo ou mudar nº de parcelas
  // NÃO recalcula se parcelas já foram editadas manualmente (vieram do banco ou foram ajustadas)
  const parcelasInicializadasRef = React.useRef(false)
  useEffect(() => {
    if (!modal) { parcelasInicializadasRef.current = false; return }
    if (form.forma_parcelamento !== 'parcelado') return
    if (parcelasInicializadasRef.current) return  // já inicializado — não sobrescreve edições manuais
    parcelasInicializadasRef.current = true
    const vt = Number(form.valor_veiculacao) + Number(form.valor_arte) + Number(form.valor_impressao)
    setParcelas(gerarParcelasContrato(vt, form.num_parcelas, form.data_inicio))
  }, [modal, form.forma_parcelamento])

  // Regenera parcelas quando muda num_parcelas ou valor total (reset intencional)
  const prevNumParcelas = React.useRef(form.num_parcelas)
  useEffect(() => {
    if (!modal) return
    if (form.forma_parcelamento !== 'parcelado') return
    if (!parcelasInicializadasRef.current) return
    const vt = Number(form.valor_veiculacao) + Number(form.valor_arte) + Number(form.valor_impressao)
    if (prevNumParcelas.current !== form.num_parcelas) {
      prevNumParcelas.current = form.num_parcelas
      setParcelas(gerarParcelasContrato(vt, form.num_parcelas, form.data_inicio))
    }
  }, [form.num_parcelas, form.valor_veiculacao, form.valor_arte, form.valor_impressao])

  const atualizarParcela = (idx, campo, valor) => {
    setParcelas(prev => {
      const novas = [...prev]
      novas[idx] = { ...novas[idx], [campo]: campo === 'valor' ? parseFloat(valor) || 0 : valor }
      return novas
    })
  }

  const [placaDatas, setPlacaDatas] = useState({})

  const updatePlacaData = (placa_id, campo, valor) => {
    setPlacaDatas(prev => {
      const atual = prev[placa_id] || { data_inicio: '', data_fim: '' }
      const atualizado = { ...atual, [campo]: valor }
      if (campo === 'data_inicio' && valor && form.duracao_tipo !== 'custom') {
        atualizado.data_fim = calcDataFim(valor, form.duracao_tipo)
      }
      return { ...prev, [placa_id]: atualizado }
    })
  }

  const togglePlaca = (id) => {
    setForm(f => {
      const ids = f.placa_ids.includes(id) ? f.placa_ids.filter(i => i !== id) : [...f.placa_ids, id]
      return { ...f, placa_ids: ids }
    })
  }

  const abrir = async (c = null) => {
    if (c) {
      const placa_ids = (c.contrato_placas || []).map(cp => cp.placa_id)
      const formaParc = c.forma_parcelamento === 'parcelado' ? 'parcelado' : 'avista'
      setForm({ ...FORM_VAZIO, ...c, placa_ids, forma_parcelamento: formaParc, num_parcelas: c.num_parcelas || 2 })
      // Carregar parcelas existentes (só relevante para parcelado)
      if (formaParc === 'parcelado') {
        const { data: parcsExist } = await supabase.from('parcelas').select('*').eq('contrato_id', c.id).order('numero')
        if (parcsExist && parcsExist.length > 0) {
          setParcelas(parcsExist)
          parcelasInicializadasRef.current = true
        } else {
          const vt = c.valor_total || 0
          setParcelas(gerarParcelasContrato(vt, c.num_parcelas || 2, c.data_inicio))
        }
      } else {
        setParcelas([])
      }
    } else {
      setForm(FORM_VAZIO)
      setParcelas([{ numero: 1, valor: 0, data_vencimento: '', status: 'pendente' }])
    }
    setPlacaDatas(c
      ? Object.fromEntries((c.contrato_placas || []).map(cp => [
          cp.placa_id, {
            data_inicio: cp.data_inicio || c.data_inicio || '',
            data_fim: cp.data_fim || c.data_fim || ''
          }
        ]))
      : {}
    )
    setNovoCliente({ nome: '', telefone: '' })
    setCriandoCliente(false)
    setModal(c ? 'editar' : 'novo')
  }

  const salvarClienteRapido = async () => {
    if (!novoCliente.nome.trim()) { alert('Informe o nome do cliente.'); return }
    setSalvandoCliente(true)
    const { data, error } = await supabase.from('clientes').insert({
      nome: novoCliente.nome.trim(),
      telefone: novoCliente.telefone.trim() || null,
    }).select('id, nome').single()
    if (error || !data) { alert('Erro ao cadastrar cliente.'); setSalvandoCliente(false); return }
    setClientes(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    set('cliente_id', data.id)
    setNovoCliente({ nome: '', telefone: '' })
    setCriandoCliente(false)
    setSalvandoCliente(false)
  }

  const salvar = async () => {
    if (form.placa_ids.length === 0) { alert('Selecione ao menos uma placa.'); return }
    setSalvando(true)

    const qtd = form.placa_ids.length
    const valorTotal = Number(form.valor_veiculacao) + Number(form.valor_arte) + Number(form.valor_impressao)
    const valorPorPlaca = qtd > 0 ? valorTotal / qtd : 0
    const todasDatas = form.placa_ids.map(id => placaDatas[id] || {})
    const dataInicioContrato = todasDatas.map(d => d.data_inicio).filter(Boolean).sort()[0] || form.data_inicio
    const dataFimContrato = todasDatas.map(d => d.data_fim).filter(Boolean).sort().reverse()[0] || form.data_fim
    const statusCalc = calcStatus(dataInicioContrato, dataFimContrato, form.status)

    const payload = {
      cliente_id: form.cliente_id || null,
      vendedor_id: form.vendedor_id || null,
      data_inicio: dataInicioContrato,
      data_fim: dataFimContrato,
      duracao_tipo: form.duracao_tipo,
      modalidade: form.modalidade,
      valor_veiculacao: Number(form.valor_veiculacao),
      valor_arte: Number(form.valor_arte),
      valor_impressao: Number(form.valor_impressao),
      custo_colador: Number(form.custo_colador),
      custo_impressao: Number(form.custo_impressao),
      custo_terreno_proporcional: Number(form.custo_terreno_proporcional),
      custo_extra: Number(form.custo_extra),
      descricao_custo_extra: form.descricao_custo_extra,
      percentual_imposto: Number(form.percentual_imposto),
      valor_imposto: Number(form.valor_imposto),
      emite_nota: form.emite_nota,
      forma_pagamento: form.forma_pagamento,
      forma_parcelamento: form.forma_parcelamento,
      num_parcelas: form.forma_parcelamento === 'parcelado' ? (form.num_parcelas || 2) : null,
      status_pagamento: form.status_pagamento,
      data_pagamento: form.forma_parcelamento === 'avista' ? (form.data_pagamento || null) : null,
      observacoes_pagamento: form.observacoes_pagamento,
      historico: form.historico,
      status: statusCalc,
      observacoes: form.observacoes,
      qtd_placas: qtd,
      valor_por_placa: valorPorPlaca,
      placa_id: form.placa_ids[0],
      face: 'AB',
    }

    let contrato_id
    if (modal === 'novo') {
      const { data, error: insertError } = await supabase.from('contratos').insert(payload).select('id').single()
      if (insertError) { alert('Erro ao salvar: ' + insertError.message); setSalvando(false); return }
      contrato_id = data?.id
    } else {
      const { error: updError } = await supabase.from('contratos').update(payload).eq('id', form.id)
      if (updError) { alert('Erro ao atualizar: ' + updError.message); setSalvando(false); return }
      contrato_id = form.id
      await supabase.from('contrato_placas').delete().eq('contrato_id', contrato_id)
      await supabase.from('parcelas').delete().eq('contrato_id', contrato_id)
    }

    if (contrato_id) {
      // Placas
      const placasRel = form.placa_ids.map(placa_id => {
        const datas = placaDatas[placa_id] || {}
        return {
          contrato_id, placa_id, face: 'AB', valor_por_placa: valorPorPlaca,
          data_inicio: datas.data_inicio || dataInicioContrato || null,
          data_fim: datas.data_fim || dataFimContrato || null,
        }
      })
      await supabase.from('contrato_placas').insert(placasRel)

      // Parcelas — parcelado: N parcelas geradas; à vista pago: 1 parcela paga automática
      const parcelasValidas = form.forma_parcelamento === 'parcelado'
        ? parcelas.filter(p => p.data_vencimento)
        : (form.status_pagamento === 'pago'
            ? [{ numero: 1, valor: valorTotal, data_vencimento: form.data_pagamento || dataInicioContrato, status: 'paga', data_pagamento: form.data_pagamento || null }]
            : [])
      if (parcelasValidas.length > 0) {
        const parcelasPayload = parcelasValidas.map(p => ({
          contrato_id,
          numero: p.numero,
          valor: p.valor,
          data_vencimento: p.data_vencimento,
          status: p.status || 'pendente',
          observacoes: p.observacoes || null,
          data_pagamento: p.data_pagamento || null,
        }))
        const { error: parcErr } = await supabase.from('parcelas').insert(parcelasPayload)
        if (parcErr) console.warn('Erro ao salvar parcelas:', parcErr.message)
      }
    }

    setSalvando(false)
    setModal(null)
    carregar()
  }

  const excluir = async (id) => {
    if (!window.confirm('Remover este contrato?')) return
    await supabase.from('contratos').delete().eq('id', id)
    carregar()
  }

  // Enriquece com status dinâmico calculado pelas datas
  const contratosEnriquecidos = useMemo(() => contratos.map(c => ({
    ...c,
    status_calc: calcStatus(c.data_inicio, c.data_fim, c.status)
  })), [contratos])

  const FILTROS = [
    ['todos', 'Todos'],
    ['reservado', 'Reservados'],
    ['ativo', 'Ativos'],
    ['vencendo', 'Vencendo'],
    ['encerrado', 'Encerrados'],
    ['renovado', 'Renovados'],
    ['cancelado', 'Cancelados'],
  ]

  const contFiltrados = filtro === 'todos'
    ? contratosEnriquecidos
    : filtro === 'encerrado'
      ? contratosEnriquecidos.filter(c => c.status_calc === 'encerrado' || c.status_calc === 'expirado')
      : contratosEnriquecidos.filter(c => c.status_calc === filtro)

  const valorTotal = Number(form.valor_veiculacao) + Number(form.valor_arte) + Number(form.valor_impressao)
  const custoTotal = Number(form.custo_colador) + Number(form.custo_impressao) + Number(form.custo_terreno_proporcional) + Number(form.custo_extra) + Number(form.valor_imposto)
  const lucro = valorTotal - custoTotal
  const qtdSelecionadas = form.placa_ids.length
  const valorPorPlacaCalc = qtdSelecionadas > 0 ? valorTotal / qtdSelecionadas : 0
  const statusDinamicoForm = calcStatus(form.data_inicio, form.data_fim, form.status)
  const stInfo = STATUS_DINAMICO[statusDinamicoForm] || STATUS_DINAMICO.ativo

  if (loading) return <div style={{ color: '#888' }}>Carregando...</div>

  return (
    <div>
      <PageHeader
        title="Contratos"
        sub={`${contratosEnriquecidos.filter(c => c.status_calc === 'ativo').length} ativos · ${contratosEnriquecidos.filter(c => c.status_calc === 'reservado').length} reservados`}
        action={<Btn onClick={() => abrir()}>+ Novo contrato</Btn>}
      />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTROS.map(([v, l]) => {
          const count = v === 'todos' ? contratosEnriquecidos.length : contratosEnriquecidos.filter(c => c.status_calc === v).length
          return (
            <button key={v} onClick={() => setFiltro(v)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              fontWeight: filtro === v ? 600 : 400,
              background: filtro === v ? '#1a1a18' : '#fff',
              color: filtro === v ? '#fff' : '#555',
              border: `1px solid ${filtro === v ? '#1a1a18' : '#ddd'}`,
            }}>
              {l}{count > 0 && <span style={{ opacity: 0.65, fontSize: 11, marginLeft: 4 }}>({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contFiltrados.map(c => {
          const st = c.status_calc
          const stCor = STATUS_DINAMICO[st] || STATUS_DINAMICO.ativo
          const dias = diasRestantes(c.data_fim)
          const placasNomes = (c.contrato_placas || []).map(cp => cp.placas?.nome).filter(Boolean)
          return (
            <div key={c.id} style={{
              background: '#fff', borderRadius: 12,
              border: `1px solid ${st === 'vencendo' ? '#D4A01744' : '#eee'}`,
              padding: '16px 20px',
              boxShadow: st === 'vencendo' ? '0 0 0 2px #D4A01722' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {c.clientes?.nome || 'Sem cliente'}
                    {c.historico && <span style={{ fontSize: 10, background: '#EEEDFE', color: '#3C3489', borderRadius: 10, padding: '2px 7px', fontWeight: 600 }}>HISTÓRICO</span>}
                    {c.vendedores?.nome && <span style={{ fontSize: 11, background: '#E3F2FD', color: '#1565C0', borderRadius: 10, padding: '2px 7px', fontWeight: 600 }}>👤 {c.vendedores.nome}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {placasNomes.length > 0 ? placasNomes.join(', ') : 'Sem placas'}
                    {c.qtd_placas > 1 && <span style={{ marginLeft: 6, background: '#EEEDFE', color: '#3C3489', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{c.qtd_placas} placas</span>}
                    &nbsp;·&nbsp;{formatDate(c.data_inicio)} → {formatDate(c.data_fim)}
                    {dias !== null && (st === 'ativo' || st === 'vencendo') && (
                      <span style={{ marginLeft: 6, color: st === 'vencendo' ? '#B45309' : '#888' }}>
                        ({dias < 0 ? 'vencido' : `${dias}d restantes`})
                      </span>
                    )}
                    {st === 'reservado' && c.data_inicio && (
                      <span style={{ marginLeft: 6, color: '#5E35B1' }}>
                        (inicia em {Math.max(0, Math.round((new Date(c.data_inicio + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000))}d)
                      </span>
                    )}
                  </div>
                  {c.forma_parcelamento && c.forma_parcelamento !== 'avista' && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      💳 Pgto {FORMAS_PARCELAMENTO.find(f => f.value === c.forma_parcelamento)?.label || c.forma_parcelamento}
                    </div>
                  )}
                  {c.qtd_placas > 1 && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{formatBRL(c.valor_por_placa)} por placa</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge texto={STATUS_PAGAMENTO[c.status_pagamento]?.label || c.status_pagamento} cor={STATUS_PAGAMENTO[c.status_pagamento]?.cor} />
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                    borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                    background: stCor.bg, color: stCor.text, border: `1px solid ${stCor.border}`
                  }}>
                    {stCor.label}
                  </span>
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

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'novo' ? 'Novo Contrato' : 'Editar Contrato'} onClose={() => setModal(null)} width={680}>

          {/* Preview de status dinâmico */}
          {form.data_inicio && form.data_fim && (
            <div style={{
              padding: '8px 14px', borderRadius: 8, marginBottom: 14, fontSize: 12, fontWeight: 600,
              background: stInfo.bg, color: stInfo.text, border: `1px solid ${stInfo.border}`
            }}>
              Status automático pelas datas: {stInfo.label}
            </div>
          )}

          {/* Placas */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
              PLACAS DO CONTRATO * <span style={{ color: '#888', fontWeight: 400 }}>({qtdSelecionadas} selecionada{qtdSelecionadas !== 1 ? 's' : ''})</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {placas.map(p => (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${form.placa_ids.includes(p.id) ? '#1a1a18' : '#ddd'}`,
                  background: form.placa_ids.includes(p.id) ? '#F0F0EE' : '#fff',
                  fontSize: 13, fontWeight: form.placa_ids.includes(p.id) ? 600 : 400
                }}>
                  <input type="checkbox" checked={form.placa_ids.includes(p.id)} onChange={() => togglePlaca(p.id)} />
                  <div>
                    <div>{p.nome}</div>
                    <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{p.tipo === 'dupla' ? '18x3m' : '9x3m'}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {/* Datas individuais por placa */}
            {form.placa_ids.length > 0 && (
              <div style={{ background: '#EFF6FF', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid #BFDBFE', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', marginBottom: 10 }}>
                  📅 CHECK-IN / CHECK-OUT POR PLACA
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#3B82F6', marginLeft: 8 }}>
                    — cada placa com data independente
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.placa_ids.map(pid => {
                    const placa = placas.find(p => p.id === pid)
                    const datas = placaDatas[pid] || { data_inicio: '', data_fim: '' }
                    return (
                      <div key={pid} style={{
                        display: 'grid', gridTemplateColumns: '1fr 150px 150px', gap: 10, alignItems: 'center',
                        background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #DBEAFE'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>
                          🪧 {placa?.nome || pid}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#3B82F6', fontWeight: 600, marginBottom: 3 }}>Check-in</div>
                          <input type="date" value={datas.data_inicio || ''} onChange={e => updatePlacaData(pid, 'data_inicio', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1.5px solid #93C5FD', fontSize: 12, boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, marginBottom: 3 }}>Check-out</div>
                          <input type="date" value={datas.data_fim || ''} onChange={e => updatePlacaData(pid, 'data_fim', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 12, boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 8 }}>
                  💡 Selecione a duração abaixo para calcular o check-out automaticamente ao preencher o check-in.
                </div>
              </div>
            )}
            {/* Cliente */}
            <div style={{ gridColumn: '1/-1', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>CLIENTE</label>
                {!criandoCliente && (
                  <button type="button" onClick={() => setCriandoCliente(true)} style={{
                    fontSize: 11, color: '#1a1a18', background: 'none', border: 'none',
                    cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: 0
                  }}>+ Cadastrar novo</button>
                )}
              </div>
              {criandoCliente ? (
                <div style={{ background: '#F7F6F2', borderRadius: 10, padding: 12, border: '1.5px solid #ddd' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>NOVO CLIENTE RÁPIDO</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                    <Input label="Nome *" value={novoCliente.nome} onChange={v => setNovoCliente(prev => ({ ...prev, nome: v }))} />
                    <Input label="Telefone" value={novoCliente.telefone} onChange={v => setNovoCliente(prev => ({ ...prev, telefone: v }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <Btn onClick={salvarClienteRapido} disabled={salvandoCliente} size="sm">{salvandoCliente ? 'Salvando...' : 'Salvar cliente'}</Btn>
                    <Btn onClick={() => { setCriandoCliente(false); setNovoCliente({ nome: '', telefone: '' }) }} variant="secondary" size="sm">Cancelar</Btn>
                  </div>
                </div>
              ) : (
                <Select label="" value={form.cliente_id || ''} onChange={v => set('cliente_id', v)} options={[
                  { value: '', label: 'Sem cliente (preencher depois)' },
                  ...clientes.map(c => ({ value: c.id, label: c.nome }))
                ]} />
              )}
            </div>

            {/* Vendedor */}
            <div style={{ gridColumn: '1/-1', marginBottom: 4 }}>
              <Select label="Vendedor" value={form.vendedor_id || ''} onChange={v => set('vendedor_id', v)} options={[
                { value: '', label: 'Sem vendedor' },
                ...vendedores.map(v => ({ value: v.id, label: v.nome }))
              ]} />
            </div>

            <Select label="Duração" value={form.duracao_tipo} onChange={v => set('duracao_tipo', v)} options={DURACOES} />
            <Input label="Data início" value={form.data_inicio} onChange={v => set('data_inicio', v)} type="date" required />
            <Input label="Data fim" value={form.data_fim} onChange={v => set('data_fim', v)} type="date" required />
            <Select label="Modalidade" value={form.modalidade} onChange={v => set('modalidade', v)} options={[
              { value: 'veiculacao', label: 'Só veiculação' },
              { value: 'veiculacao_impressao', label: 'Veiculação + Impressão' },
              { value: 'completo', label: 'Atendimento completo (arte + impressão)' },
            ]} style={{ gridColumn: '1/-1' }} />
          </div>

          {/* Receitas */}
          <div style={{ background: '#F7F6F2', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>RECEITAS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' }}>
              <Input label="Veiculação total (R$)" value={form.valor_veiculacao} onChange={v => set('valor_veiculacao', Number(v))} type="number" />
              {(form.modalidade === 'completo' || form.modalidade === 'veiculacao_impressao') && <>
                <Input label="Arte (R$)" value={form.valor_arte} onChange={v => set('valor_arte', Number(v))} type="number" />
                <Input label="Impressão recebida (R$)" value={form.valor_impressao} onChange={v => set('valor_impressao', Number(v))} type="number" />
              </>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A5C42' }}>Total: {formatBRL(valorTotal)}</div>
            {qtdSelecionadas > 1 && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{formatBRL(valorPorPlacaCalc)} por placa ({qtdSelecionadas} placas)</div>}
          </div>

          {/* Custos */}
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
            <div style={{ fontSize: 14, fontWeight: 700, color: lucro >= 0 ? '#0A5C42' : '#c0392b', marginTop: 4 }}>Lucro líquido: {formatBRL(lucro)}</div>
          </div>

          {/* Pagamento */}
          <div style={{ background: '#F0F5FF', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>PAGAMENTO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Select label="Forma de pagamento" value={form.forma_pagamento} onChange={v => set('forma_pagamento', v)} options={[
                { value: 'pix', label: 'Pix' },
                { value: 'dinheiro', label: 'Dinheiro' },
                { value: 'transferencia', label: 'Transferência' },
                { value: 'boleto', label: 'Boleto' },
              ]} />
              <Select label="Condição / Parcelamento" value={form.forma_parcelamento} onChange={v => { set('forma_parcelamento', v); if (v !== 'parcelado') setParcelas([]) }} options={FORMAS_PARCELAMENTO} />
              {form.forma_parcelamento === 'parcelado' && (
                <Input label="Nº de parcelas" value={form.num_parcelas || 2} onChange={v => set('num_parcelas', Math.max(2, parseInt(v) || 2))} type="number" />
              )}
              <Select label="Status pagamento geral" value={form.status_pagamento} onChange={v => set('status_pagamento', v)} options={[
                { value: 'aguardando', label: 'Aguardando' },
                { value: 'pago', label: 'Pago' },
                { value: 'parcial', label: 'Pago parcialmente' },
                { value: 'atrasado', label: 'Em atraso' },
              ]} />
              {form.forma_parcelamento === 'avista' && (
                <Input label="Data de pagamento (à vista)" value={form.data_pagamento || ''} onChange={v => set('data_pagamento', v)} type="date" />
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.emite_nota} onChange={e => set('emite_nota', e.target.checked)} />
                Emite nota fiscal
              </label>
            </div>

            {/* Parcelas — só exibe quando modo parcelado */}
            {form.forma_parcelamento === 'parcelado' && parcelas.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                  PARCELAS — {parcelas.length}x · total {formatBRL(parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {parcelas.map((p, idx) => (
                    <div key={idx} style={{
                      display: 'grid', gridTemplateColumns: '28px 1fr 1fr 110px', gap: 8, alignItems: 'center',
                      background: p.status === 'pago' ? '#F0FFF4' : p.status === 'atrasado' ? '#FFF5F5' : '#fff',
                      borderRadius: 8, padding: '8px 10px',
                      border: `1px solid ${p.status === 'pago' ? '#A5D6A7' : p.status === 'atrasado' ? '#EF9A9A' : '#E0E0E0'}`
                    }}>
                      <div style={{ fontSize: 11, color: '#999', fontWeight: 700, textAlign: 'center' }}>#{p.numero}</div>
                      <div>
                        <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Valor (R$)</div>
                        <input type="number" value={p.valor} onChange={e => atualizarParcela(idx, 'valor', e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Vencimento</div>
                        <input type="date" value={p.data_vencimento || ''} onChange={e => atualizarParcela(idx, 'data_vencimento', e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Status</div>
                        <select value={p.status || 'pendente'} onChange={e => atualizarParcela(idx, 'status', e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, background: '#fff', boxSizing: 'border-box' }}>
                          <option value="pendente">Pendente</option>
                          <option value="pago">Pago</option>
                          <option value="atrasado">Atrasado</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.historico} onChange={e => set('historico', e.target.checked)} />
              Contrato histórico (lançamento retroativo)
            </label>
          </div>

          <Select label="Status manual (só para encerrar / renovar / cancelar)" value={form.status} onChange={v => set('status', v)} options={[
            { value: 'ativo', label: 'Automático (calculado pelas datas)' },
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
