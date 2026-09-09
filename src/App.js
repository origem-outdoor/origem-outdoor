import React, { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './lib/supabase'
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
  { id: 'dashboard', label: 'Painel', icon: '▦' },
  { id: 'placas', label: 'Placas', icon: '🪧' },
  { id: 'contratos', label: 'Contratos', icon: '📄' },
  { id: 'clientes', label: 'Clientes', icon: '👤' },
  { id: 'comissoes', label: 'Comissões', icon: '🤝' },
  { id: 'relatorios', label: 'Relatórios', icon: '📊' },
]

function Sidebar({ page, setPage, user, onLogout }) {
  return (
    <div style={{
      width: 220, background: '#1a1a18', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', padding: '0',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100
    }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #333' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Origem Outdoor</div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Sistema de gestão</div>
      </div>
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 20px', background: page === n.id ? '#2a2a28' : 'transparent',
            border: 'none', color: page === n.id ? '#fff' : '#aaa',
            fontSize: 13, cursor: 'pointer', textAlign: 'left',
            borderLeft: page === n.id ? '3px solid #4ade80' : '3px solid transparent',
            transition: 'all .15s'
          }}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid #333' }}>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>{user?.email}</div>
        <button onClick={onLogout} style={{
          fontSize: 12, color: '#888', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0
        }}>Sair →</button>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F6F2' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Carregando...</div>
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
      <div style={{ display: 'flex' }}>
        <Sidebar
          page={page}
          setPage={setPage}
          user={session.user}
          onLogout={() => supabase.auth.signOut()}
        />
        <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', padding: 28, background: '#F7F6F2' }}>
          <PageComponent />
        </main>
      </div>
    </AuthContext.Provider>
  )
}
