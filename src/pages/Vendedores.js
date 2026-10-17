import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, Btn, Input, Modal, COLORS } from '../components/UI'

const FORM_VAZIO = { nome: '', telefone: '', email: '', ativo: true }

export default function Vendedores() {
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'novo' | 'editar'
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [stats, setStats] = useState({}) // vendedor_id -> { total, receita }

  const carregar = async () => {
    setLoading(true)
    const [{ data: vends }, { data: conts }] = await Promise.all([
      supabase.from('vendedores').select('*').order('nome'),
      supabase.from('contratos').select('vendedor_id, valor_total').not('vendedor_id', 'is', null),
    ])
    setVendedores(vends || [])

    // Calcular estatísticas por vendedor
    const s = {}
    ;(conts || []).forEach(c => {
      if (!c.vendedor_id) return
      if (!s[c.vendedor_id]) s[c.vendedor_id] = { total: 0, receita: 0 }
      s[c.vendedor_id].total += 1
      s[c.vendedor_id].receita += Number(c.valor_total) || 0
    })
    setStats(s)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const abrir = (v = null) => {
    setForm(v ? { nome: v.nome, telefone: v.telefone || '', email: v.email || '', ativo: v.ativo } : FORM_VAZIO)
    setModal(v ? { tipo: 'editar', id: v.id } : { tipo: 'novo' })
  }

  const salvar = async () => {
    if (!form.nome.trim()) { alert('Informe o nome.'); return }
    setSalvando(true)
    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      ativo: form.ativo,
    }
    if (modal.tipo === 'novo') {
      const { error } = await supabase.from('vendedores').insert(payload)
      if (error) { alert('Erro ao salvar: ' + error.message); setSalvando(false); return }
    } else {
      const { error } = await supabase.from('vendedores').update(payload).eq('id', modal.id)
      if (error) { alert('Erro ao salvar: ' + error.message); setSalvando(false); return }
    }
    setSalvando(false)
    setModal(null)
    carregar()
  }

  const excluir = async (id) => {
    if (!window.confirm('Remover este vendedor?')) return
    await supabase.from('vendedores').delete().eq('id', id)
    carregar()
  }

  const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) return <div style={{ color: '#888' }}>Carregando...</div>

  return (
    <div>
      <PageHeader
        title="Vendedores"
        sub={`${vendedores.filter(v => v.ativo).length} ativos`}
        action={<Btn onClick={() => abrir()}>+ Novo vendedor</Btn>}
      />

      {vendedores.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhum vendedor cadastrado</div>
          <div style={{ fontSize: 13 }}>Cadastre vendedores para associar aos contratos</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {vendedores.map(v => {
          const st = stats[v.id] || { total: 0, receita: 0 }
          return (
            <div key={v.id} style={{
              background: '#fff', borderRadius: 14, border: '1px solid #eee',
              padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              opacity: v.ativo ? 1 : 0.6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: COLORS.primarySoft, color: COLORS.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, flexShrink: 0,
                  }}>
                    {v.nome[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18' }}>{v.nome}</div>
                    {v.telefone && <div style={{ fontSize: 12, color: '#888' }}>{v.telefone}</div>}
                    {v.email && <div style={{ fontSize: 12, color: '#888' }}>{v.email}</div>}
                  </div>
                </div>
                {!v.ativo && (
                  <span style={{ fontSize: 11, background: '#F5F5F5', color: '#999', borderRadius: 10, padding: '3px 8px', fontWeight: 600 }}>
                    Inativo
                  </span>
                )}
              </div>

              {/* Estatísticas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                <div style={{ background: COLORS.primarySoft, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary }}>{st.total}</div>
                  <div style={{ fontSize: 11, color: COLORS.primary, opacity: 0.8 }}>contratos</div>
                </div>
                <div style={{ background: '#E8F5E9', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#2E7D32' }}>{formatBRL(st.receita)}</div>
                  <div style={{ fontSize: 11, color: '#2E7D32', opacity: 0.8 }}>total vendido</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => abrir(v)} variant="secondary" size="sm">Editar</Btn>
                <Btn onClick={() => excluir(v.id)} variant="danger" size="sm">Remover</Btn>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal title={modal.tipo === 'novo' ? 'Novo Vendedor' : 'Editar Vendedor'} onClose={() => setModal(null)} width={440}>
          <Input label="Nome *" value={form.nome} onChange={v => set('nome', v)} />
          <Input label="Telefone" value={form.telefone} onChange={v => set('telefone', v)} />
          <Input label="E-mail" value={form.email} onChange={v => set('email', v)} />
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
              Vendedor ativo
            </label>
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
