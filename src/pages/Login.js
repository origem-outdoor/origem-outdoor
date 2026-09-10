import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

const EMAILS_AUTORIZADOS = ['gui.barboosa69@gmail.com']

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [modo, setModo] = useState('login')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('Email ou senha incorretos.')
    setLoading(false)
  }

  const handleCadastro = async (e) => {
    e.preventDefault()
    setLoading(true); setErro('')
    const emailNorm = email.toLowerCase().trim()
    if (!EMAILS_AUTORIZADOS.includes(emailNorm)) {
      setErro('Este email não tem permissão de acesso. Entre em contato com o administrador.')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signUp({ email, password: senha })
    if (error) setErro(error.message)
    else setErro('Verifique seu email para confirmar o cadastro.')
    setLoading(false)
  }

  const handleRecuperar = async (e) => {
    e.preventDefault()
    setLoading(true); setErro('')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setErro(error.message)
    else setErro('Email de recuperação enviado!')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#1a1a18',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '36px 32px',
        width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>Origem Outdoor</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {modo === 'login' ? 'Entre na sua conta' : modo === 'cadastro' ? 'Criar nova conta' : 'Recuperar senha'}
          </div>
        </div>

        <form onSubmit={modo === 'login' ? handleLogin : modo === 'cadastro' ? handleCadastro : handleRecuperar}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 5 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {modo !== 'recuperar' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 5 }}>Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          {erro && (
            <div style={{
              fontSize: 12, padding: '10px 12px', borderRadius: 8, marginBottom: 14,
              background: erro.includes('enviado') || erro.includes('confirme') ? '#EAF3DE' : '#FCEBEB',
              color: erro.includes('enviado') || erro.includes('confirme') ? '#27500A' : '#791F1F'
            }}>{erro}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', borderRadius: 8, border: 'none',
            background: '#1a1a18', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
          }}>
            {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : modo === 'cadastro' ? 'Criar conta' : 'Enviar email'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {modo !== 'recuperar' && (
            <button onClick={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setErro('') }} style={{
              fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer'
            }}>
              {modo === 'login' ? 'Criar nova conta' : 'Já tenho conta'}
            </button>
          )}
          {modo === 'login' && (
            <button onClick={() => { setModo('recuperar'); setErro('') }} style={{
              fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer'
            }}>Esqueci minha senha</button>
          )}
          {modo !== 'login' && (
            <button onClick={() => { setModo('login'); setErro('') }} style={{
              fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer'
            }}>← Voltar ao login</button>
          )}
        </div>
      </div>
    </div>
  )
}
