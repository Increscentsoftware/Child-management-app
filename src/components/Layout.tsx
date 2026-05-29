import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/lib/store'
import {
  LayoutDashboard, Users, PlusCircle, Clock,
  FileUp, Wifi, WifiOff, LogOut, Settings, UserCog,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import ChatbotButton from '@/components/ChatbotButton'

const NAV = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/children',     icon: Users,           label: 'Children'  },
  { path: '/children/add', icon: PlusCircle,      label: 'Add Child' },
  { path: '/changelog',    icon: Clock,           label: 'Change Log'},
  { path: '/import',       icon: FileUp,          label: 'Import'    },
]

function SidebarBtn({ icon: Icon, label, active, onClick }: {
  path: string; icon: React.ElementType; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
      background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
      color: active ? '#fff' : 'rgba(255,255,255,0.7)',
      fontWeight: active ? 600 : 400, fontSize: 13,
      fontFamily: 'inherit', textAlign: 'left', width: '100%',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {active && <div style={{ width: 3, height: 18, background: '#fff', borderRadius: 2, marginRight: -4 }} />}
      <Icon size={16} />
      {label}
    </button>
  )
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const h = (e: MediaQueryListEvent) => setDesktop(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return desktop
}

function isActive(path: string, pathname: string) {
  if (path === '/') return pathname === '/'
  if (path === '/children') return pathname.startsWith('/children') && pathname !== '/children/add'
  return pathname === path
}

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isOnline, pendingSync, user, logout } = useAppStore()
  const desktop = useIsDesktop()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      logout()
      navigate('/login')
      toast.success('Logged out')
    } catch {
      toast.error('Logout failed')
    }
  }

  const SyncBanner = () => (
    <>
      {!isOnline && (
        <div style={{ background: '#faeeda', padding: '6px 14px', fontSize: 11, color: '#854f0b',
          display: 'flex', alignItems: 'center', gap: 6, borderBottom: '0.5px solid #fac775' }}>
          <WifiOff size={12} /> Offline — {pendingSync} record{pendingSync !== 1 ? 's' : ''} pending sync
        </div>
      )}
      {isOnline && pendingSync > 0 && (
        <div style={{ background: '#e1f5ee', padding: '6px 14px', fontSize: 11, color: '#085041',
          display: 'flex', alignItems: 'center', gap: 6, borderBottom: '0.5px solid #9fe1cb' }}>
          <Wifi size={12} /> Syncing {pendingSync} pending record{pendingSync !== 1 ? 's' : ''}…
        </div>
      )}
    </>
  )

  // ─── DESKTOP layout ───────────────────────────────────────────────────────
  if (desktop) {
    return (
      <div style={{ display: 'flex', minHeight: '100dvh', background: '#f0f4f2' }}>

        {/* Sidebar */}
        <aside style={{
          width: 220, flexShrink: 0, background: '#1a6b4a', color: '#fff',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        }}>
          {/* Brand */}
          <div style={{ padding: '20px 16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '6px 10px', display: 'inline-flex' }}>
              <img src="/logo.png" alt="Shishu Mandir" style={{ height: 54, width: 'auto', objectFit: 'contain' }} />
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 800,
              textAlign: 'center',
              letterSpacing: '0.5px',
              background: 'linear-gradient(90deg, #a8edca, #fff 40%, #f9e07a 70%, #a8edca)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 3s linear infinite',
            }}>Shishu Mandir</div>
          </div>
          <style>{`
            @keyframes shimmer {
              0%   { background-position: 200% center; }
              100% { background-position: -200% center; }
            }
          `}</style>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '0 16px' }} />

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            {NAV.map(({ path, icon: Icon, label }) => {
              const active = isActive(path, pathname)
              return (
                <SidebarBtn key={path} path={path} icon={Icon} label={label} active={active} onClick={() => navigate(path)} />
              )
            })}

            {/* Admin section */}
            {user?.role === 'admin' && (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '14px 12px 4px' }}>Admin</div>
                <SidebarBtn path="/admin/users" icon={UserCog} label="User Management"
                  active={pathname === '/admin/users'} onClick={() => navigate('/admin/users')} />
                <SidebarBtn path="/admin/form-fields" icon={Settings} label="Form Fields"
                  active={pathname === '/admin/form-fields'} onClick={() => navigate('/admin/form-fields')} />
              </>
            )}
          </nav>

          {/* Sync status */}
          {!isOnline && (
            <div style={{ padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <WifiOff size={11} /> Offline · {pendingSync} pending
            </div>
          )}
          {isOnline && pendingSync > 0 && (
            <div style={{ padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wifi size={11} /> Syncing {pendingSync}…
            </div>
          )}

          {/* User + logout */}
          <div style={{ padding: '12px 14px 16px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            {user && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 8, fontWeight: 500 }}>
                {user.full_name}
                <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>{user.role === 'field_worker' ? 'Social Worker' : user.role === 'admin' ? 'Admin' : user.role}</div>
              </div>
            )}
            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
              border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
              background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)',
              fontFamily: 'inherit', width: '100%',
            }}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div style={{ marginLeft: 220, flex: 1, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
          <main style={{ flex: 1 }}>
            <Outlet />
          </main>
        </div>

        <ChatbotButton />
      </div>
    )
  }

  // ─── MOBILE layout ────────────────────────────────────────────────────────
  return (
    <div className="app-layout" style={{ paddingBottom: 76 }}>
      <SyncBanner />
      <main className="content-area" style={{ width: '100%' }}>
        <Outlet />
      </main>
      <ChatbotButton />

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: 'calc(8px + env(safe-area-inset-bottom)) 4px 8px',
        zIndex: 200, boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
      }}>
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = isActive(path, pathname)
          return (
            <button key={path} onClick={() => navigate(path)} style={{
              flex: 1, border: 'none', background: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, padding: '6px 4px',
              color: active ? '#1a6b4a' : '#888',
              fontWeight: active ? 600 : 400, fontSize: 10,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? '#e7f6ef' : 'transparent',
              }}>
                <Icon size={17} />
              </div>
              <span>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
