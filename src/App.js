import React, { useState, useEffect, createContext, useContext, useRef } from 'react'
import { supabase } from './lib/supabase'
import { COLORS } from './components/UI'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Placas from './pages/Placas'
import Contratos from './pages/Contratos'
import Clientes from './pages/Clientes'
import Comissoes from './pages/Comissoes'
import Relatorios from './pages/Relatorios'
import ContasPagar from './pages/ContasPagar'
import Vendedores from './pages/Vendedores'
import Disponibilidade from './pages/Disponibilidade'
import Parcelas from './pages/Parcelas'
import OcupacaoPlacas from './pages/OcupacaoPlacas'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const PAGES = {
  dashboard:    Dashboard,
  placas:       Placas,
  contratos:    Contratos,
  clientes:     Clientes,
  comissoes:    Comissoes,
  relatorios:   Relatorios,
  contaspagar:     ContasPagar,
  vendedores:      Vendedores,
  disponibilidade: Disponibilidade,
  parcelas:        Parcelas,
  ocupacao:        OcupacaoPlacas,
}

const NAV = [
  { id: 'dashboard',   label: 'Painel',         icon: '⊞' },
  { id: 'placas',      label: 'Placas',          icon: '🪧' },
  { id: 'contratos',   label: 'Contratos',       icon: '📄' },
  { id: 'clientes',    label: 'Clientes',        icon: '👤' },
  { id: 'comissoes',   label: 'Comissões',       icon: '🤝' },
  { id: 'contaspagar', label: 'Contas a Pagar',  icon: '💸' },
  { id: 'vendedores',      label: 'Vendedores',       icon: '👔' },
  { id: 'disponibilidade', label: 'Disponibilidade',  icon: '🗓' },
  { id: 'relatorios',      label: 'Relatórios',       icon: '📊' },
]

function diasParaVencer(dataVenc) {
  if (!dataVenc) return null
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const venc = new Date(dataVenc + 'T00:00:00')
  return Math.round((venc - hoje) / 86400000)
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function NavItem({ n, active, onClick, badge }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 'calc(100% - 16px)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '13px 16px',
        margin: '1px 8px',
        background: active ? COLORS.primarySoft : hovered ? '#EEF1F7' : 'transparent',
        border: 'none',
        color: active ? COLORS.primary : hovered ? COLORS.textMedium : COLORS.textLight,
        fontSize: 14,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 10,
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
      <span style={{ flexGrow: 1 }}>{n.label}</span>
      {badge > 0 && (
        <span style={{
          minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, boxSizing: 'border-box',
          background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{badge}</span>
      )}
      {active && !badge && (
        <span style={{
          marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
          background: COLORS.primary, flexShrink: 0,
        }} />
      )}
    </button>
  )
}

function SidebarContent({ page, setPage, user, onLogout, alertasContas, alertasParcelas, onNavClick }) {
  return (
    <>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: COLORS.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 16 }}>🪧</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.3px', lineHeight: 1.1 }}>ORIGEM</div>
            <div style={{ fontSize: 10, color: COLORS.textLight, fontWeight: 500, letterSpacing: '0.5px' }}>OUTDOOR</div>
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
            onClick={() => { setPage(n.id); onNavClick && onNavClick() }}
            badge={n.id === 'contaspagar' ? alertasContas : n.id === 'parcelas' ? alertasParcelas : 0}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${COLORS.border}`, background: '#FAFBFD' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: COLORS.primarySoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: COLORS.primary, flexShrink: 0,
          }}>
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMedium, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email?.split('@')[0] || 'Usuário'}
            </div>
            <div style={{ fontSize: 10, color: COLORS.textLight }}>Administrador</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '7px 0', background: 'transparent',
            border: `1px solid ${COLORS.border}`, borderRadius: 8,
            fontSize: 12, fontWeight: 500, color: COLORS.textLight,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.target.style.color = COLORS.danger; e.target.style.borderColor = '#FFCDD2'; e.target.style.background = COLORS.dangerSoft }}
          onMouseLeave={e => { e.target.style.color = COLORS.textLight; e.target.style.borderColor = COLORS.border; e.target.style.background = 'transparent' }}
        >
          Sair da conta
        </button>
      </div>
    </>
  )
}

// Sidebar desktop: fixa na lateral
function Sidebar(props) {
  return (
    <div style={{
      width: 230, background: COLORS.surface, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0,
      zIndex: 100, borderRight: `1px solid ${COLORS.border}`,
      boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
    }}>
      <SidebarContent {...props} />
    </div>
  )
}

// Gaveta mobile: desliza da esquerda
function Drawer({ open, onClose, ...props }) {
  return (
    <>
      {/* Overlay escuro */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.45)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />
      {/* Painel */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 260, zIndex: 201,
        background: COLORS.surface,
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
      }}>
        <SidebarContent {...props} onNavClick={onClose} />
      </div>
    </>
  )
}

// Topbar mobile
function Topbar({ onMenuClick, pageLabel, alertasContas }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 150,
      height: 56, background: COLORS.surface,
      borderBottom: `1px solid ${COLORS.border}`,
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <button
        onClick={onMenuClick}
        style={{
          width: 40, height: 40, borderRadius: 10, border: 'none',
          background: COLORS.primarySoft, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
          position: 'relative', flexShrink: 0,
        }}
      >
        <span style={{ display: 'block', width: 18, height: 2, background: COLORS.primary, borderRadius: 2 }} />
        <span style={{ display: 'block', width: 18, height: 2, background: COLORS.primary, borderRadius: 2 }} />
        <span style={{ display: 'block', width: 18, height: 2, background: COLORS.primary, borderRadius: 2 }} />
        {alertasContas > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 8, height: 8, borderRadius: '50%', background: '#DC2626',
          }} />
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: COLORS.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 13 }}>🪧</span>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>ORIGEM</div>
          <div style={{ fontSize: 9, color: COLORS.textLight, letterSpacing: '0.5px' }}>OUTDOOR</div>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMedium }}>{pageLabel}</div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [alertasContas, setAlertasContas] = useState(0)
  const [alertasParcelas, setAlertasParcelas] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMobile = useIsMobile()

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

  useEffect(() => {
    async function checarAlertas() {
      const { data } = await supabase
        .from('contas_pagar')
        .select('data_vencimento, status')
        .neq('status', 'pago')
      if (!data) return
      const count = data.filter(c => {
        const d = diasParaVencer(c.data_vencimento)
        return d !== null && d <= 1
      }).length
      setAlertasContas(count)

      // Parcelas atrasadas
      const { data: pData } = await supabase
        .from('parcelas')
        .select('data_vencimento, status')
        .neq('status', 'paga')
        .neq('status', 'cancelada')
      if (pData) {
        const hoje = new Date(); hoje.setHours(0,0,0,0)
        const atrasadas = pData.filter(p => {
          const v = p.data_vencimento ? new Date(p.data_vencimento + 'T00:00:00') : null
          return v && v < hoje
        }).length
        setAlertasParcelas(atrasadas)
      }
    }
    if (session) {
      checarAlertas()
      const interval = setInterval(checarAlertas, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [session])

  // Fecha gaveta ao mudar de página no mobile
  const handleSetPage = (p) => {
    setPage(p)
    setDrawerOpen(false)
  }

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
  const pageLabel = NAV.find(n => n.id === page)?.label || 'Painel'

  const sidebarProps = {
    page, setPage: handleSetPage,
    user: session.user,
    onLogout: () => supabase.auth.signOut(),
    alertasContas,
    alertasParcelas,
  }

  return (
    <AuthContext.Provider value={{ session, user: session.user }}>
      <div style={{ display: 'flex', background: COLORS.bg, minHeight: '100vh' }}>

        {isMobile ? (
          <>
            <Topbar
              onMenuClick={() => setDrawerOpen(true)}
              pageLabel={pageLabel}
              alertasContas={alertasContas}
            />
            <Drawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              {...sidebarProps}
            />
            <main style={{
              flex: 1, minHeight: '100vh',
              padding: '72px 16px 24px',
              background: COLORS.bg,
              width: '100vw', boxSizing: 'border-box',
            }}>
              <PageComponent setPage={handleSetPage} />
            </main>
          </>
        ) : (
          <>
            <Sidebar {...sidebarProps} />
            <main style={{
              marginLeft: 230, flex: 1, minHeight: '100vh',
              padding: '28px 32px', background: COLORS.bg,
              maxWidth: 'calc(100vw - 230px)', boxSizing: 'border-box',
            }}>
              <PageComponent setPage={handleSetPage} />
            </main>
          </>
        )}

      </div>
    </AuthContext.Provider>
  )
}
