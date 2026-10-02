import React, { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './lib/supabase'
import { COLORS } from './components/UI'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Placas from './pages/Placas'
import Contratos from './pages/Contratos'
import Clientes from './pages/Clientes'
import Comissoes from './pages/Comissoes'
import Relatorios from './pages/Relatorios'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const PAGES = {
  dashboard: Dashboard,
  placas: Placas,
  contratos: Contratos,
  clientes: Clientes,
  comissoes: Comissoes,
  relatorios: Relatorios,
}

const NAV = [
  { id: 'dashboard', label: 'Painel',     icon: '⊞', emoji: true },
  { id: 'placas',    label: 'Placas',     icon: '🪧', emoji: true },
  { id: 'contratos', label: 'Contratos',  icon: '📄', emoji: true },
  { id: 'clientes',  label: 'Clientes',   icon: '👤', emoji: true },
  { id: 'comissoes', label: 'Comissões',  icon: '🤝', emoji: true },
  { id: 'relatorios',label: 'Relatórios', icon: '📊', emoji: true },
]

function NavItem({ n, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      key={n.id}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 16px',
        margin: '1px 8px',
        width: 'calc(100% - 16px)',
        background: active
          ? COLORS.primarySoft
          : hovered ? '#EEF1F7' : 'transparent',
        border: 'none',
        color: active ? COLORS.primary : hovered ? COLORS.textMedium : COLORS.textLight,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 10,
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
      <span>{n.label}</span>
      {active && (
        <span style={{
          marginLeft: 'auto',
          width: 6, height: 6, borderRadius: '50%',
          background: COLORS.primary, flexShrink: 0
        }} />
      )}
    </button>
  )
}

function Sidebar({ page, setPage, user, onLogout }) {
  return (
    <div style={{
      width: 230,
      background: COLORS.surface,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      zIndex: 100,
      borderRight: `1px solid ${COLORS.border}`,
      boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
    }}>
      {/* Logo */}
      <div style={{
        padding: '22px 20px 18px',
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: COLORS.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 16 }}>🪧</span>
          </div>
          <div>
            <div style={{
              fontSize: 15, fontWeight: 800, color: COLORS.text,
              letterSpacing: '-0.3px', lineHeight: 1.1
            }}>ORIGEM</div>
            <div style={{ fontSize: 10, color: COLORS.textLight, fontWeight: 500, letterSpacing: '0.5px' }}>
              OUTDOOR
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {NAV.map(n => (
          <NavItem
            key={n.id}
            n={n}
            active={page === n.id}
            onClick={() => setPage(n.id)}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '14px 20px',
        borderTop: `1px solid ${COLORS.border}`,
        background: '#FAFBFD',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: COLORS.primarySoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: COLORS.primary, flexShrink: 0
          }}>
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: COLORS.textMedium,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {user?.email?.split('@')[0] || 'Usuário'}
            </div>
            <div style={{ fontSize: 10, color: COLORS.textLight }}>Administrador</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '7px 0',
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            fontSize: 12, fontWeight: 500,
            color: COLORS.textLight,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.target.style.color = COLORS.danger
            e.target.style.borderColor = '#FFCDD2'
            e.target.style.background = COLORS.dangerSoft
          }}
          onMouseLeave={e => {
            e.target.style.color = COLORS.textLight
            e.target.style.borderColor = COLORS.border
            e.target.style.background = 'transparent'
          }}
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: COLORS.bg, flexDirection: 'column', gap: 12
    }}>
      <div style={{
        width: 36, height: 36, border: `3px solid ${COLORS.primarySoft}`,
        borderTopColor: COLORS.primary, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <div style={{ fontSize: 13, color: COLORS.textLight }}>Carregando...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!session) return (
    <AuthContext.Provider value={{ session, user: null }}>
      <Login />
    </AuthContext.Provider>
  )

  const PageComponent = PAGES[page] || Dashboard

  return (
    <AuthContext.Provider value={{ session, user: session.user }}>
      <div style={{ display: 'flex', background: COLORS.bg, minHeight: '100vh' }}>
        <Sidebar
          page={page}
          setPage={setPage}
          user={session.user}
          onLogout={() => supabase.auth.signOut()}
        />
        <main style={{
          marginLeft: 230,
          flex: 1,
          minHeight: '100vh',
          padding: '28px 32px',
          background: COLORS.bg,
          maxWidth: 'calc(100vw - 230px)',
          boxSizing: 'border-box',
        }}>
          <PageComponent setPage={setPage} />
        </main>
      </div>
    </AuthContext.Provider>
  )
}
