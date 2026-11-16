import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatBRL, formatDate } from '../components/UI'
import {
  gerarRecorrentes, preverRecorrentes, criarProximoLancamento, proximoVencimento,
  hojeISO, mesDe, mesAtual, somarMesesAoMes,
} from '../lib/contasRecorrentes'

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

const CATEGORIAS = [
  { value: 'fornecedor_material', label: 'Fornecedor / Material' },
  { value: 'impressao',          label: 'Impressão' },
  { value: 'manutencao',         label: 'Manutenção' },
  { value: 'aluguel_ponto',      label: 'Aluguel de ponto' },
  { value: 'energia',            label: 'Energia' },
  { value: 'outros',             label: 'Outros' },
]

const FORMAS = [
  { value: 'boleto',      label: 'Boleto' },
  { value: 'pix',         label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'dinheiro',    label: 'Dinheiro' },
]

const FREQUENCIAS = [
  { value: 'mensal',    label: 'Mensal',    ajuda: 'Entra sozinha todo mês.' },
  { value: 'bimestral', label: 'Bimestral', ajuda: 'Entra sozinha a cada 2 meses.' },
  { value: 'anual',     label: 'Anual',     ajuda: 'Entra sozinha uma vez por ano.' },
]

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function nomeDoMes(mesISO) {
  const [ano, mes] = mesISO.split('-').map(Number)
  return MESES[mes - 1] + ' de ' + ano
}

function diasParaVencer(dataVenc) {
  if (!dataVenc) return null
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const venc = new Date(dataVenc + 'T00:00:00')
  return Math.round((venc - hoje) / 86400000)
}

function StatusBadge({ conta }) {
  const dias = diasParaVencer(conta.data_vencimento)
  let label, bg, color

  if (conta.prevista) {
    label = 'Prevista'; bg = '#F1F3F7'; color = C.textMed
  } else if (conta.status === 'pago') {
    label = conta.data_pagamento ? 'Pago em ' + formatDate(conta.data_pagamento).slice(0, 5) : 'Pago'
    bg = C.successSoft; color = C.success
  } else if (conta.status === 'vencido' || (dias !== null && dias < 0)) {
    label = `Venceu há ${Math.abs(dias)}d`; bg = '#FEE2E2'; color = '#991B1B'
  } else if (dias === 0) {
    label = 'Vence hoje'; bg = C.dangerSoft; color = C.danger
  } else if (dias === 1) {
    label = 'Vence amanhã'; bg = C.warnSoft; color = C.warn
  } else if (dias !== null && dias <= 7) {
    label = `Vence em ${dias}d`; bg = C.warnSoft; color = C.warn
  } else {
    label = 'Pendente'; bg = C.primarySoft; color = C.primaryDark
  }

  return (
    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: bg, color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function CategoriaLabel({ value }) {
  const cat = CATEGORIAS.find(c => c.value === value)
  return <span style={{ fontSize: 13, color: C.textMed }}>{cat?.label || value}</span>
}

function SeloRecorrente({ conta }) {
  if (!conta.frequencia) return null
  return (
    <span style={{ fontSize: 11, background: C.primarySoft, color: C.primary, padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
      🔁 {conta.frequencia}
    </span>
  )
}

const EMPTY = {
  descricao: '', valor: '', data_vencimento: '', status: 'pendente',
  categoria: 'outros', beneficiario: '', forma_pagamento: 'pix',
  numero_documento: '', observacoes: '', recorrente: false, frequencia: 'mensal',
}

function Modal({ conta, onClose, onSave }) {
  const [form, setForm] = useState(conta || EMPTY)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  // Lançamento antigo de uma conta recorrente: a recorrência já segue pelo
  // lançamento mais recente, então aqui só se edita este lançamento.
  const lancamentoAntigo = !!(conta?.id && !conta.recorrente && conta.frequencia)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.descricao || !form.valor || !form.data_vencimento) {
      setErro('Preencha descrição, valor e vencimento.')
      return
    }
    setSaving(true)
    setErro('')
    const recorrente = lancamentoAntigo ? false : !!form.recorrente
    const payload = {
      descricao: form.descricao,
      valor: parseFloat(String(form.valor).replace(',', '.')),
      data_vencimento: form.data_vencimento,
      status: form.status,
      categoria: form.categoria,
      beneficiario: form.beneficiario,
      forma_pagamento: form.forma_pagamento,
      numero_documento: form.numero_documento,
      observacoes: form.observacoes,
      recorrente,
      frequencia: recorrente ? (form.frequencia || 'mensal') : (lancamentoAntigo ? conta.frequencia : null),
      data_pagamento: form.status === 'pago' ? (form.data_pagamento || hojeISO()) : null,
    }
    const { error } = conta?.id
      ? await supabase.from('contas_pagar').update(payload).eq('id', conta.id)
      : await supabase.from('contas_pagar').insert(payload)
    setSaving(false)
    if (error) {
      setErro('Não foi possível salvar. Tente de novo.')
      return
    }
    onSave()
  }

  const inp = (label, key, type = 'text', props = {}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: C.textMed, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</label>
      <input
        type={type}
        value={form[key] ?? ''}
        onChange={e => set(key, e.target.value)}
        style={{ height: 42, padding: '0 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', color: C.text, outline: 'none' }}
        {...props}
      />
    </div>
  )

  const sel = (label, key, options) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: C.textMed, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</label>
      <select
        value={form[key] ?? ''}
        onChange={e => set(key, e.target.value)}
        style={{ height: 42, padding: '0 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  const freqAtual = FREQUENCIAS.find(f => f.value === (form.frequencia || 'mensal'))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>{conta?.id ? 'Editar conta' : 'Nova conta a pagar'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.textLight, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>{inp('Descrição', 'descricao', 'text', { placeholder: 'Ex: Nota fiscal gráfica João' })}</div>
          {inp('Valor (R$)', 'valor', 'number', { placeholder: '0,00', min: 0, step: '0.01' })}
          {inp('Vencimento', 'data_vencimento', 'date')}
          {sel('Categoria', 'categoria', CATEGORIAS)}
          {sel('Forma de pagamento', 'forma_pagamento', FORMAS)}
          {inp('Beneficiário / Fornecedor', 'beneficiario', 'text', { placeholder: 'Nome de quem vai receber' })}
          {inp('Nº documento / NF', 'numero_documento', 'text', { placeholder: 'Opcional' })}
          {sel('Status', 'status', [
            { value: 'pendente', label: 'Pendente' },
            { value: 'pago',     label: 'Pago' },
            { value: 'vencido',  label: 'Vencido' },
          ])}
          {form.status === 'pago' && inp('Data do pagamento', 'data_pagamento', 'date')}
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.textMed, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Observações</label>
            <textarea
              value={form.observacoes ?? ''}
              onChange={e => set('observacoes', e.target.value)}
              rows={2}
              placeholder="Opcional"
              style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', color: C.text, resize: 'vertical', outline: 'none' }}
            />
          </div>

          {lancamentoAntigo ? (
            <div style={{ gridColumn: '1 / -1', fontSize: 13, color: C.textMed, background: C.primarySoft, borderRadius: 8, padding: '10px 12px' }}>
              🔁 Este é um lançamento de conta recorrente ({conta.frequencia}). Para mudar o valor dos próximos meses ou encerrar, use a aba Recorrentes.
            </div>
          ) : (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="checkbox" id="recorrente" checked={!!form.recorrente} onChange={e => set('recorrente', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                <label htmlFor="recorrente" style={{ fontSize: 14, fontWeight: 600, color: C.text, cursor: 'pointer' }}>Conta recorrente</label>
                {form.recorrente && (
                  <select value={form.frequencia || 'mensal'} onChange={e => set('frequencia', e.target.value)}
                    style={{ height: 36, padding: '0 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', color: C.text, background: C.surface }}>
                    {FREQUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                )}
              </div>
              {form.recorrente && (
                <div style={{ fontSize: 12, color: C.textLight }}>
                  {freqAtual?.ajuda} O valor e os dados deste lançamento são copiados para os próximos.
                </div>
              )}
            </div>
          )}
        </div>

        {erro && <div style={{ fontSize: 13, color: '#991B1B', background: '#FEE2E2', borderRadius: 8, padding: '8px 12px' }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} style={{ height: 42, padding: '0 20px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'none', fontSize: 14, fontWeight: 600, color: C.textMed, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ height: 42, padding: '0 24px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const th = { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.borderLight}` }
const td = { padding: '13px 14px' }
const btnIcone = { height: 32, width: 32, borderRadius: 7, border: `1px solid ${C.border}`, background: 'none', fontSize: 15, cursor: 'pointer' }
const btnTexto = { height: 32, padding: '0 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'none', color: C.textMed, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }

export default function ContasPagar() {
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | {} | conta
  const [aba, setAba] = useState('abertas') // abertas | pagas | recorrentes
  const [mes, setMes] = useState(mesAtual())
  const [busca, setBusca] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmEncerrar, setConfirmEncerrar] = useState(null)

  async function carregar() {
    // Antes de listar, lança no mês as recorrentes que ainda não entraram
    await gerarRecorrentes()
    const { data } = await supabase.from('contas_pagar').select('*').order('data_vencimento', { ascending: true })
    setContas(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function marcarPago(id) {
    await supabase.from('contas_pagar').update({ status: 'pago', data_pagamento: hojeISO() }).eq('id', id)
    carregar()
  }

  async function reabrir(id) {
    await supabase.from('contas_pagar').update({ status: 'pendente', data_pagamento: null }).eq('id', id)
    carregar()
  }

  async function excluir(conta, manterRecorrencia) {
    if (manterRecorrencia) {
      // Passa a recorrência para o próximo lançamento antes de apagar este
      const r = await criarProximoLancamento(conta)
      if (r.error) { setConfirmDelete(null); return }
    }
    await supabase.from('contas_pagar').delete().eq('id', conta.id)
    setConfirmDelete(null)
    carregar()
  }

  async function encerrarRecorrencia(conta) {
    await supabase.from('contas_pagar').update({ recorrente: false, frequencia: null }).eq('id', conta.id)
    setConfirmEncerrar(null)
    carregar()
  }

  const hoje = hojeISO()
  const mesHoje = mesAtual()
  const soma = lista => lista.reduce((s, c) => s + (Number(c.valor) || 0), 0)
  const casaBusca = c => {
    if (!busca) return true
    const b = busca.toLowerCase()
    return (c.descricao || '').toLowerCase().includes(b) || (c.beneficiario || '').toLowerCase().includes(b)
  }

  // Contas do mês selecionado (pelo vencimento)
  const doMes      = contas.filter(c => mesDe(c.data_vencimento) === mes)
  const abertasMes = doMes.filter(c => c.status !== 'pago')
  const pagasMes   = doMes.filter(c => c.status === 'pago')
  // Recorrentes que ainda vão entrar (só aparecem em meses futuros)
  const previstas  = mes >= mesHoje ? preverRecorrentes(contas, mes) : []
  // No mês atual, o que ficou sem pagar em meses anteriores continua à vista
  const atrasadasAnteriores = mes === mesHoje
    ? contas.filter(c => c.status !== 'pago' && mesDe(c.data_vencimento) < mes)
    : []
  const todasAtrasadas = contas.filter(c => c.status !== 'pago' && c.data_vencimento && c.data_vencimento < hoje)
  const recorrentes = contas.filter(c => c.recorrente)

  const listaAbertas = [...atrasadasAnteriores, ...abertasMes, ...previstas].filter(casaBusca)
  const listaPagas = pagasMes.filter(casaBusca)
  const listaRecorrentes = recorrentes.filter(casaBusca)
  const qtdAbertas = atrasadasAnteriores.length + abertasMes.length + previstas.length

  const btnAba = (id, label, qtd) => (
    <button key={id} onClick={() => setAba(id)} style={{
      height: 38, padding: '0 16px', borderRadius: 8, border: `1px solid ${aba === id ? C.primary : C.border}`,
      background: aba === id ? C.primarySoft : 'transparent',
      color: aba === id ? C.primary : C.textMed,
      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
    }}>{label} ({qtd})</button>
  )

  const btnMes = { height: 38, width: 38, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 18, fontWeight: 700, color: C.textMed, cursor: 'pointer', fontFamily: 'inherit' }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.primarySoft}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const linhaConta = (c, i, lista) => {
    const dias = diasParaVencer(c.data_vencimento)
    const urgente = !c.prevista && c.status !== 'pago' && dias !== null && dias <= 1
    return (
      <tr key={c.id} style={{ borderBottom: i < lista.length - 1 ? `1px solid ${C.borderLight}` : 'none', background: urgente ? '#FFF9F9' : 'transparent', opacity: c.prevista ? 0.7 : 1 }}>
        <td style={td}>
          <div style={{ fontWeight: 700, color: C.text }}>{c.descricao}</div>
          {c.numero_documento && <div style={{ fontSize: 11, color: C.textLight }}>NF {c.numero_documento}</div>}
          <SeloRecorrente conta={c} />
        </td>
        <td style={{ ...td, color: C.textMed, whiteSpace: 'nowrap' }}>{formatDate(c.data_vencimento)}</td>
        <td style={{ ...td, fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{formatBRL(c.valor)}</td>
        <td style={td}><CategoriaLabel value={c.categoria} /></td>
        <td style={{ ...td, color: C.textMed }}>{c.beneficiario || '-'}</td>
        <td style={td}><StatusBadge conta={c} /></td>
        <td style={td}>
          {c.prevista ? (
            <span style={{ fontSize: 12, color: C.textLight }}>Entra sozinha no mês</span>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              {c.status !== 'pago' && (
                <button onClick={() => marcarPago(c.id)} title="Marcar como pago" style={{ height: 32, padding: '0 12px', borderRadius: 7, border: 'none', background: C.successSoft, color: C.success, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>✓ Pago</button>
              )}
              {c.status === 'pago' && (
                <button onClick={() => reabrir(c.id)} title="Voltar para a pagar" style={btnTexto}>↩ Reabrir</button>
              )}
              <button onClick={() => setModal(c)} title="Editar" style={btnIcone}>✏️</button>
              <button onClick={() => setConfirmDelete(c)} title="Excluir" style={btnIcone}>🗑️</button>
            </div>
          )}
        </td>
      </tr>
    )
  }

  const tabelaContas = (lista, vazio) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 680 }}>
      <thead>
        <tr style={{ background: '#F7F8FB', textAlign: 'left' }}>
          {['Descrição', 'Vencimento', 'Valor', 'Categoria', 'Fornecedor', 'Status', 'Ações'].map(h => (
            <th key={h} style={th}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lista.length === 0 && (
          <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: C.textLight, fontSize: 13 }}>{vazio}</td></tr>
        )}
        {lista.map(linhaConta)}
      </tbody>
    </table>
  )

  const tabelaRecorrentes = (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 680 }}>
      <thead>
        <tr style={{ background: '#F7F8FB', textAlign: 'left' }}>
          {['Descrição', 'Frequência', 'Valor', 'Último lançamento', 'Próximo lançamento', 'Ações'].map(h => (
            <th key={h} style={th}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {listaRecorrentes.length === 0 && (
          <tr><td colSpan={6} style={{ padding: '32px 14px', textAlign: 'center', color: C.textLight, fontSize: 13 }}>
            Nenhuma conta recorrente. Marque "Conta recorrente" ao cadastrar uma conta para ela entrar sozinha todo mês.
          </td></tr>
        )}
        {listaRecorrentes.map((c, i) => (
          <tr key={c.id} style={{ borderBottom: i < listaRecorrentes.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
            <td style={td}>
              <div style={{ fontWeight: 700, color: C.text }}>{c.descricao}</div>
              <div style={{ fontSize: 12, color: C.textLight }}>{c.beneficiario || '-'}</div>
            </td>
            <td style={td}><SeloRecorrente conta={c} /></td>
            <td style={{ ...td, fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{formatBRL(c.valor)}</td>
            <td style={{ ...td, whiteSpace: 'nowrap' }}>
              <span style={{ color: C.textMed, marginRight: 8 }}>{formatDate(c.data_vencimento)}</span>
              <StatusBadge conta={c} />
            </td>
            <td style={{ ...td, color: C.textMed, whiteSpace: 'nowrap' }}>{formatDate(proximoVencimento(c))}</td>
            <td style={td}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setModal(c)} title="Editar" style={btnIcone}>✏️</button>
                <button onClick={() => setConfirmEncerrar(c)} title="Parar de lançar esta conta" style={btnTexto}>Encerrar</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Manrope','Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.3px', color: C.text }}>Contas a Pagar</h1>
          <p style={{ margin: 0, fontSize: 14, color: C.textLight }}>Contas do mês, pagas à parte e recorrentes automáticas</p>
        </div>
        <button onClick={() => setModal({})} style={{
          height: 44, padding: '0 18px', borderRadius: 10, border: 'none',
          background: C.primary, color: '#fff', fontFamily: 'inherit',
          fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}>
          + Nova conta
        </button>
      </div>

      {/* Mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setMes(somarMesesAoMes(mes, -1))} title="Mês anterior" style={btnMes}>‹</button>
        <div style={{ minWidth: 190, textAlign: 'center', fontSize: 17, fontWeight: 800, color: C.text }}>{nomeDoMes(mes)}</div>
        <button onClick={() => setMes(somarMesesAoMes(mes, 1))} title="Próximo mês" style={btnMes}>›</button>
        {mes !== mesHoje && (
          <button onClick={() => setMes(mesHoje)} style={{ ...btnTexto, height: 38 }}>Voltar para o mês atual</button>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        {[
          { label: 'A pagar no mês', value: formatBRL(soma(abertasMes) + soma(previstas)), color: C.primary },
          { label: 'Pago no mês',    value: formatBRL(soma(pagasMes)), color: C.success },
          { label: 'Em atraso',      value: formatBRL(soma(todasAtrasadas)), color: '#991B1B' },
          { label: 'Total do mês',   value: formatBRL(soma(doMes) + soma(previstas)), color: C.text },
        ].map(k => (
          <div key={k.label} style={{ background: C.surface, borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {btnAba('abertas', 'A pagar', qtdAbertas)}
        {btnAba('pagas', 'Pagas', pagasMes.length)}
        {btnAba('recorrentes', '🔁 Recorrentes', recorrentes.length)}
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar descrição ou fornecedor..."
          style={{ marginLeft: 'auto', height: 38, padding: '0 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', color: C.text, outline: 'none', minWidth: 220 }}
        />
      </div>

      {aba === 'abertas' && atrasadasAnteriores.length > 0 && (
        <div style={{ fontSize: 13, color: '#991B1B', background: '#FEE2E2', borderRadius: 10, padding: '10px 14px', fontWeight: 600 }}>
          {atrasadasAnteriores.length === 1
            ? '1 conta de meses anteriores ainda não foi paga. Ela aparece no topo da lista.'
            : atrasadasAnteriores.length + ' contas de meses anteriores ainda não foram pagas. Elas aparecem no topo da lista.'}
        </div>
      )}

      {/* Tabela */}
      <div style={{ background: C.surface, borderRadius: 14, boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {aba === 'abertas' && tabelaContas(listaAbertas, busca ? 'Nenhuma conta encontrada.' : 'Nenhuma conta a pagar em ' + nomeDoMes(mes) + '.')}
          {aba === 'pagas' && tabelaContas(listaPagas, busca ? 'Nenhuma conta encontrada.' : 'Nenhuma conta paga em ' + nomeDoMes(mes) + '.')}
          {aba === 'recorrentes' && tabelaRecorrentes}
        </div>
      </div>

      {/* Modal cadastro/edição */}
      {modal !== null && (
        <Modal conta={modal?.id ? modal : null} onClose={() => setModal(null)} onSave={() => { setModal(null); carregar() }} />
      )}

      {/* Confirmar exclusão */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.surface, borderRadius: 14, padding: 28, maxWidth: 440, width: '90%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Excluir conta?</h3>
            <p style={{ margin: 0, fontSize: 14, color: C.textMed }}><strong>{confirmDelete.descricao}</strong> · {formatDate(confirmDelete.data_vencimento)} · {formatBRL(confirmDelete.valor)}</p>
            {confirmDelete.recorrente && (
              <p style={{ margin: 0, fontSize: 13, color: C.textMed }}>Esta conta é recorrente ({confirmDelete.frequencia}). Escolha se ela continua entrando nos próximos meses.</p>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ height: 40, padding: '0 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              {confirmDelete.recorrente && (
                <button onClick={() => excluir(confirmDelete, true)} style={{ height: 40, padding: '0 18px', borderRadius: 8, border: '1px solid #DC2626', background: 'none', color: '#DC2626', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Excluir só este lançamento</button>
              )}
              <button onClick={() => excluir(confirmDelete, false)} style={{ height: 40, padding: '0 18px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {confirmDelete.recorrente ? 'Excluir e encerrar a recorrência' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar encerramento da recorrência */}
      {confirmEncerrar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.surface, borderRadius: 14, padding: 28, maxWidth: 420, width: '90%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Encerrar recorrência?</h3>
            <p style={{ margin: 0, fontSize: 14, color: C.textMed }}><strong>{confirmEncerrar.descricao}</strong> deixa de entrar sozinha nos próximos meses. Os lançamentos que já existem continuam como estão.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmEncerrar(null)} style={{ height: 40, padding: '0 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={() => encerrarRecorrencia(confirmEncerrar)} style={{ height: 40, padding: '0 18px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Encerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
