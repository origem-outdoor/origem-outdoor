import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { formatBRL, formatDate } from '../components/UI'

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

function diasParaVencer(dataVenc) {
  if (!dataVenc) return null
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const venc = new Date(dataVenc + 'T00:00:00')
  return Math.round((venc - hoje) / 86400000)
}

function StatusBadge({ conta }) {
  const dias = diasParaVencer(conta.data_vencimento)
  let label, bg, color

  if (conta.status === 'pago') {
    label = 'Pago'; bg = C.successSoft; color = C.success
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

const EMPTY = {
  descricao: '', valor: '', data_vencimento: '', status: 'pendente',
  categoria: 'outros', beneficiario: '', forma_pagamento: 'pix',
  numero_documento: '', observacoes: '', recorrente: false, frequencia: 'mensal',
}

function Modal({ conta, onClose, onSave }) {
  const [form, setForm] = useState(conta || EMPTY)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.descricao || !form.valor || !form.data_vencimento) return
    setSaving(true)
    const payload = {
      ...form,
      valor: parseFloat(String(form.valor).replace(',', '.')),
      frequencia: form.recorrente ? form.frequencia : null,
    }
    if (conta?.id) {
      await supabase.from('contas_pagar').update(payload).eq('id', conta.id)
    } else {
      await supabase.from('contas_pagar').insert(payload)
    }
    setSaving(false)
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
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="checkbox" id="recorrente" checked={!!form.recorrente} onChange={e => set('recorrente', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
            <label htmlFor="recorrente" style={{ fontSize: 14, fontWeight: 600, color: C.text, cursor: 'pointer' }}>Conta recorrente</label>
            {form.recorrente && (
              <select value={form.frequencia || 'mensal'} onChange={e => set('frequencia', e.target.value)}
                style={{ height: 36, padding: '0 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', color: C.text, background: C.surface }}>
                <option value="mensal">Mensal</option>
                <option value="bimestral">Bimestral</option>
                <option value="anual">Anual</option>
              </select>
            )}
          </div>
        </div>

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

export default function ContasPagar() {
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | {} | conta
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('contas_pagar').select('*').order('data_vencimento', { ascending: true })
    setContas(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function marcarPago(id) {
    await supabase.from('contas_pagar').update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id)
    carregar()
  }

  async function excluir(id) {
    await supabase.from('contas_pagar').delete().eq('id', id)
    setConfirmDelete(null)
    carregar()
  }

  const hoje = new Date(); hoje.setHours(0,0,0,0)

  const filtradas = contas.filter(c => {
    const dias = diasParaVencer(c.data_vencimento)
    const statusReal = c.status === 'pago' ? 'pago' : (dias !== null && dias < 0) ? 'vencido' : 'pendente'
    if (filtroStatus === 'pendente' && statusReal !== 'pendente') return false
    if (filtroStatus === 'vencido'  && statusReal !== 'vencido')  return false
    if (filtroStatus === 'pago'     && statusReal !== 'pago')     return false
    if (filtroStatus === 'urgente'  && !(statusReal === 'pendente' && dias !== null && dias <= 3)) return false
    if (busca && !c.descricao?.toLowerCase().includes(busca.toLowerCase()) && !c.beneficiario?.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const totalPendente = contas.filter(c => c.status !== 'pago').reduce((s, c) => s + (c.valor || 0), 0)
  const totalVencido  = contas.filter(c => { const d = diasParaVencer(c.data_vencimento); return c.status !== 'pago' && d !== null && d < 0 }).reduce((s, c) => s + (c.valor || 0), 0)
  const urgente       = contas.filter(c => { const d = diasParaVencer(c.data_vencimento); return c.status !== 'pago' && d !== null && d >= 0 && d <= 3 }).length

  const btnFiltro = (id, label, cor) => (
    <button key={id} onClick={() => setFiltroStatus(id)} style={{
      height: 36, padding: '0 16px', borderRadius: 8, border: `1px solid ${filtroStatus === id ? (cor || C.primary) : C.border}`,
      background: filtroStatus === id ? (cor ? cor + '20' : C.primarySoft) : 'transparent',
      color: filtroStatus === id ? (cor || C.primary) : C.textMed,
      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.primarySoft}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Manrope','Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.3px', color: C.text }}>Contas a Pagar</h1>
          <p style={{ margin: 0, fontSize: 14, color: C.textLight }}>Controle de vencimentos e pagamentos</p>
        </div>
        <button onClick={() => setModal({})} style={{
          height: 44, padding: '0 18px', borderRadius: 10, border: 'none',
          background: C.primary, color: '#fff', fontFamily: 'inherit',
          fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}>
          + Nova conta
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total pendente', value: formatBRL(totalPendente), color: C.primary, soft: C.primarySoft },
          { label: 'Total vencido',  value: formatBRL(totalVencido),  color: '#991B1B', soft: '#FEE2E2' },
          { label: 'Urgente (≤3d)',  value: urgente + ' conta' + (urgente !== 1 ? 's' : ''), color: C.warn, soft: C.warnSoft },
          { label: 'Total contas',   value: contas.length, color: C.text, soft: '#F7F8FB' },
        ].map(k => (
          <div key={k.label} style={{ background: C.surface, borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {btnFiltro('todos',   'Todos')}
        {btnFiltro('pendente','Pendentes')}
        {btnFiltro('urgente', '🔴 Urgente', '#991B1B')}
        {btnFiltro('vencido', 'Vencidos', '#991B1B')}
        {btnFiltro('pago',    'Pagos', C.success)}
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar descrição ou fornecedor..."
          style={{ marginLeft: 'auto', height: 36, padding: '0 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', color: C.text, outline: 'none', minWidth: 220 }}
        />
      </div>

      {/* Tabela */}
      <div style={{ background: C.surface, borderRadius: 14, boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 680 }}>
            <thead>
              <tr style={{ background: '#F7F8FB', textAlign: 'left' }}>
                {['Descrição', 'Vencimento', 'Valor', 'Categoria', 'Fornecedor', 'Status', 'Ações'].map((h, i, arr) => (
                  <th key={h} style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.borderLight}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: C.textLight, fontSize: 13 }}>Nenhuma conta encontrada.</td></tr>
              )}
              {filtradas.map((c, i) => {
                const dias = diasParaVencer(c.data_vencimento)
                const urgente = c.status !== 'pago' && dias !== null && dias <= 1
                return (
                  <tr key={c.id} style={{ borderBottom: i < filtradas.length - 1 ? `1px solid ${C.borderLight}` : 'none', background: urgente ? '#FFF9F9' : 'transparent' }}>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ fontWeight: 700, color: C.text }}>{c.descricao}</div>
                      {c.numero_documento && <div style={{ fontSize: 11, color: C.textLight }}>NF {c.numero_documento}</div>}
                      {c.recorrente && <span style={{ fontSize: 11, background: C.primarySoft, color: C.primary, padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>🔁 {c.frequencia}</span>}
                    </td>
                    <td style={{ padding: '13px 14px', color: C.textMed, whiteSpace: 'nowrap' }}>{formatDate(c.data_vencimento)}</td>
                    <td style={{ padding: '13px 14px', fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{formatBRL(c.valor)}</td>
                    <td style={{ padding: '13px 14px' }}><CategoriaLabel value={c.categoria} /></td>
                    <td style={{ padding: '13px 14px', color: C.textMed }}>{c.beneficiario || '-'}</td>
                    <td style={{ padding: '13px 14px' }}><StatusBadge conta={c} /></td>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.status !== 'pago' && (
                          <button onClick={() => marcarPago(c.id)} title="Marcar como pago" style={{ height: 32, padding: '0 12px', borderRadius: 7, border: 'none', background: C.successSoft, color: C.success, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Pago</button>
                        )}
                        <button onClick={() => setModal(c)} title="Editar" style={{ height: 32, width: 32, borderRadius: 7, border: `1px solid ${C.border}`, background: 'none', fontSize: 15, cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => setConfirmDelete(c)} title="Excluir" style={{ height: 32, width: 32, borderRadius: 7, border: `1px solid ${C.border}`, background: 'none', fontSize: 15, cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal cadastro/edição */}
      {modal !== null && (
        <Modal conta={modal?.id ? modal : null} onClose={() => setModal(null)} onSave={() => { setModal(null); carregar() }} />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.surface, borderRadius: 14, padding: 28, maxWidth: 380, width: '90%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Excluir conta?</h3>
            <p style={{ margin: 0, fontSize: 14, color: C.textMed }}><strong>{confirmDelete.descricao}</strong> — {formatBRL(confirmDelete.valor)}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ height: 40, padding: '0 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={() => excluir(confirmDelete.id)} style={{ height: 40, padding: '0 18px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
