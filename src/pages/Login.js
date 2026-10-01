import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

// ⚠️ SEGURANÇA: apenas esses emails podem criar conta
const EMAILS_AUTORIZADOS = ['gui.barboosa69@gmail.com', 'laiana_longo@outlook.com']

const COLORS = {
  primary:     '#1565C0',
  primaryDark: '#0D47A1',
  primarySoft: '#E3F2FD',
  bg:          '#F5F6FA',
  surface:     '#FFFFFF',
  border:      '#E8ECF0',
  text:        '#1A2332',
  textMedium:  '#4A5568',
  textLight:   '#8A96A8',
  success:     '#2E7D32',
  successSoft: '#E8F5E9',
  danger:      '#C62828',
  dangerSoft:  '#FFEBEE',
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [modo, setModo] = useState('login')
  const [focusEmail, setFocusEmail] = useState(false)
  const [focusSenha, setFocusSenha] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('Email ou senha incorretos. Verifique seus dados.')
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
    else setErro('Email de recuperação enviado! Verifique sua caixa de entrada.')
    setLoading(false)
  }

  const isSuccess = erro.includes('enviado') || erro.includes('Verifique seu email')

  const inputStyle = (focused) => ({
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1.5px solid ${focused ? COLORS.primary : COLORS.border}`,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    color: COLORS.text,
    background: COLORS.surface,
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
    boxShadow: focused ? `0 0 0 3px ${COLORS.primarySoft}` : 'none',
    fontFamily: 'inherit',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: COLORS.primarySoft, opacity: 0.6
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 240, height: 240, borderRadius: '50%',
          background: COLORS.primarySoft, opacity: 0.4
        }} />
      </div>

      <div style={{
        background: COLORS.surface,
        borderRadius: 20,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 24px 64px rgba(21,101,192,0.12)',
        border: `1px solid ${COLORS.border}`,
        position: 'relative', zIndex: 1,
      }}>
        {/* Logo / Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: COLORS.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 24
          }}>
            🪧
          </div>
          <div style={{
            fontSize: 20, fontWeight: 800, color: COLORS.text,
            letterSpacing: '-0.3px'
          }}>
            Origem Outdoor
          </div>
          <div style={{ fontSize: 13, color: COLORS.textLight, marginTop: 4 }}>
            {modo === 'login' ? 'Entre na sua conta para continuar' :
             modo === 'cadastro' ? 'Criar nova conta de acesso' :
             'Recuperar acesso à sua conta'}
          </div>
        </div>

        <form onSubmit={
          modo === 'login' ? handleLogin :
          modo === 'cadastro' ? handleCadastro :
          handleRecuperar
        }>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 12, fontWeight: 600,
              color: focusEmail ? COLORS.primary : COLORS.textMedium,
              display: 'block', marginBottom: 6,
              transition: 'color 0.18s ease'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              onFocus={() => setFocusEmail(true)}
              onBlur={() => setFocusEmail(false)}
              style={inputStyle(focusEmail)}
            />
          </div>

          {/* Senha */}
          {modo !== 'recuperar' && (
            <div style={{ marginBottom: 22 }}>
              <label style={{
                fontSize: 12, fontWeight: 600,
                color: focusSenha ? COLORS.primary : COLORS.textMedium,
                display: 'block', marginBottom: 6,
                transition: 'color 0.18s ease'
              }}>
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                placeholder="••••••••"
                onFocus={() => setFocusSenha(true)}
                onBlur={() => setFocusSenha(false)}
                style={inputStyle(focusSenha)}
              />
            </div>
          )}

          {/* Feedback */}
          {erro && (
            <div style={{
              fontSize: 13,
              padding: '10px 14px',
              borderRadius: 10,
              marginBottom: 18,
              background: isSuccess ? COLORS.successSoft : COLORS.dangerSoft,
              color: isSuccess ? COLORS.success : COLORS.danger,
              border: `1px solid ${isSuccess ? '#A5D6A7' : '#FFCDD2'}`,
              display: 'flex', alignItems: 'flex-start', gap: 8
            }}>
              <span style={{ flexShrink: 0 }}>{isSuccess ? '✅' : '⚠️'}</span>
              {erro}
            </div>
          )}

          {/* Botão principal */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              background: loading ? COLORS.primarySoft : COLORS.primary,
              color: loading ? COLORS.primary : '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s ease',
              letterSpacing: '0.2px',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(21,101,192,0.3)',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Aguarde...' :
             modo === 'login' ? 'Entrar na conta' :
             modo === 'cadastro' ? 'Criar conta' :
             'Enviar link de recuperação'}
          </button>
        </form>

        {/* Links */}
        <div style={{
          marginTop: 20, textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          {modo === 'login' && (
            <>
              <button
                onClick={() => { setModo('recuperar'); setErro('') }}
                style={{
                  fontSize: 12, color: COLORS.textLight,
                  background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Esqueci minha senha
              </button>
              <button
                onClick={() => { setModo('cadastro'); setErro('') }}
                style={{
                  fontSize: 12, color: COLORS.primary, fontWeight: 600,
                  background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Não tenho conta ainda
              </button>
            </>
          )}

          {modo === 'cadastro' && (
            <button
              onClick={() => { setModo('login'); setErro('') }}
              style={{
                fontSize: 12, color: COLORS.primary, fontWeight: 600,
                background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Voltar ao login
            </button>
          )}

          {modo === 'recuperar' && (
            <button
              onClick={() => { setModo('login'); setErro('') }}
              style={{
                fontSize: 12, color: COLORS.primary, fontWeight: 600,
                background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Voltar ao login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
