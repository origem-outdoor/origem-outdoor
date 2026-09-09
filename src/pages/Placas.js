import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, Card, Badge, Btn, Input, Select, Modal, formatBRL, STATUS_PLACA } from '../components/UI'

const FORM_VAZIO = {
  nome: '', endereco: '', cidade: 'Teixeira de Freitas', tipo: 'simples',
  custo_montagem: 0, aluguel_terreno_mensal: 0,
  proprietario_terreno: '', contato_proprietario: '',
  em_sociedade: false, percentual_sociedade: 100, socio_nome: '',
  status: 'ativa', observacoes: ''
}

export default function Placas() {
  const [placas, setPlacas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [fotoFile, setFotoFile] = useState(null)

  const carregar = async () => {
    const { data } = await supabase.from('placas').select('*').order('nome')
    setPlacas(data || [])
    setLoading(false)
  }
  useEffect(() => { carregar() }, [])

  const abrir = (placa = null) => {
    setForm(placa ? { ...placa } : FORM_VAZIO)
    setFotoFile(null)
    setModal(placa ? 'editar' : 'nova')
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const salvar = async () => {
    setSalvando(true)
    let foto_url = form.foto_url || null

    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data: up } = await supabase.storage.from('placas-fotos').upload(path, fotoFile)
      if (up) {
        const { data: url } = supabase.storage.from('placas-fotos').getPublicUrl(path)
        foto_url = url.publicUrl
      }
    }

    const payload = { ...form, foto_url }
    delete payload.id; delete payload.created_at; delete payload.updated_at

    if (modal === 'nova') {
      await supabase.from('placas').insert(payload)
    } else {
      await supabase.from('placas').update(payload).eq('id', form.id)
    }
    setSalvando(false)
    setModal(null)
    carregar()
  }

  const excluir = async (id) => {
    if (!window.confirm('Remover esta placa?')) return
    await supabase.from('placas').delete().eq('id', id)
    carregar()
  }

  if (loading) return <div style={{ color: '#888' }}>Carregando...</div>

  return (
    <div>
      <PageHeader
        title="Placas"
        sub={`${placas.length} placas cadastradas`}
        action={<Btn onClick={() => abrir()}>+ Nova placa</Btn>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {placas.map(p => (
          <Card key={p.id}>
            {p.foto_url && (
              <img src={p.foto_url} alt={p.nome}
                style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18' }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>📍 {p.endereco}</div>
              </div>
              <Badge texto={STATUS_PLACA[p.status]?.label} cor={STATUS_PLACA[p.status]?.cor} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 12 }}>
                <div style={{ color: '#888', marginBottom: 2 }}>TIPO</div>
                <div style={{ fontWeight: 600 }}>{p.tipo === 'dupla' ? '🔲 Dupla (18x3m)' : '▪️ Simples (9x3m)'}</div>
              </div>
              <div style={{ fontSize: 12 }}>
                <div style={{ color: '#888', marginBottom: 2 }}>ALUGUEL TERRENO</div>
                <div style={{ fontWeight: 600 }}>{formatBRL(p.aluguel_terreno_mensal)}/mês</div>
              </div>
              {p.em_sociedade && (
                <div style={{ fontSize: 12 }}>
                  <div style={{ color: '#888', marginBottom: 2 }}>SOCIEDADE</div>
                  <div style={{ fontWeight: 600 }}>{p.percentual_sociedade}% seu · {p.socio_nome}</div>
                </div>
              )}
              <div style={{ fontSize: 12 }}>
                <div style={{ color: '#888', marginBottom: 2 }}>CUSTO MONTAGEM</div>
                <div style={{ fontWeight: 600 }}>{formatBRL(p.custo_montagem)}</div>
              </div>
            </div>

            {p.observacoes && <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic', marginBottom: 10 }}>{p.observacoes}</div>}

            <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
              <Btn onClick={() => abrir(p)} variant="secondary" size="sm" style={{ flex: 1 }}>Editar</Btn>
              <Btn onClick={() => excluir(p.id)} variant="danger" size="sm">Remover</Btn>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title={modal === 'nova' ? 'Nova Placa' : 'Editar Placa'} onClose={() => setModal(null)} width={540}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Input label="Nome da placa" value={form.nome} onChange={v => set('nome', v)} required style={{ gridColumn: '1/-1' }} />
            <Input label="Endereço / Localização" value={form.endereco} onChange={v => set('endereco', v)} required style={{ gridColumn: '1/-1' }} />
            <Input label="Cidade" value={form.cidade} onChange={v => set('cidade', v)} />
            <Select label="Tipo" value={form.tipo} onChange={v => set('tipo', v)} options={[
              { value: 'simples', label: 'Simples (9x3m — 1 face)' },
              { value: 'dupla', label: 'Dupla (18x3m — 2 faces)' },
            ]} />
            <Input label="Custo de montagem (R$)" value={form.custo_montagem} onChange={v => set('custo_montagem', v)} type="number" />
            <Input label="Aluguel terreno/mês (R$)" value={form.aluguel_terreno_mensal} onChange={v => set('aluguel_terreno_mensal', v)} type="number" />
            <Input label="Proprietário do terreno" value={form.proprietario_terreno} onChange={v => set('proprietario_terreno', v)} />
            <Input label="Contato do proprietário" value={form.contato_proprietario} onChange={v => set('contato_proprietario', v)} />
            <Select label="Status" value={form.status} onChange={v => set('status', v)} options={[
              { value: 'ativa', label: 'Ativa' },
              { value: 'manutencao', label: 'Em manutenção' },
              { value: 'inativa', label: 'Inativa' },
            ]} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.em_sociedade} onChange={e => set('em_sociedade', e.target.checked)} />
              Placa em sociedade
            </label>
          </div>

          {form.em_sociedade && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', background: '#F7F6F2', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <Input label="Sócio (nome)" value={form.socio_nome} onChange={v => set('socio_nome', v)} />
              <Input label="Sua % na placa" value={form.percentual_sociedade} onChange={v => set('percentual_sociedade', v)} type="number" />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 4 }}>Foto da placa</label>
            <input type="file" accept="image/*" onChange={e => setFotoFile(e.target.files[0])}
              style={{ fontSize: 13 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 4 }}>Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2}
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
