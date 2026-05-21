import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/lib/store'
import {
  Home, LayoutDashboard, Users, PlusCircle, Clock, FileUp, Wifi, WifiOff
} from 'lucide-react'

const NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/children', icon: Users, label: 'Children' },
  { path: '/children/add', icon: PlusCircle, label: 'Add Child' },
  { path: '/changelog', icon: Clock, label: 'Change Log' },
  { path: '/import', icon: FileUp, label: 'Import' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isOnline, pendingSync } = useAppStore()

  return (
    <div className="app-layout" style={{ minHeight: '100dvh' }}>
      {/* Sync banner */}
      {!isOnline && (
        <div style={{
          background: '#faeeda', padding: '6px 14px', fontSize: 11,
          color: '#854f0b', display: 'flex', alignItems: 'center', gap: 6,
          borderBottom: '0.5px solid #fac775'
        }}>
          <WifiOff size={12} />
          Offline mode — {pendingSync} record{pendingSync !== 1 ? 's' : ''} pending sync
        </div>
      )}
      {isOnline && pendingSync > 0 && (
        <div style={{
          background: '#e1f5ee', padding: '6px 14px', fontSize: 11,
          color: '#085041', display: 'flex', alignItems: 'center', gap: 6,
          borderBottom: '0.5px solid #9fe1cb'
        }}>
          <Wifi size={12} />
          Syncing {pendingSync} pending record{pendingSync !== 1 ? 's' : ''}...
        </div>
      )}

      {/* Page content */}
      <div className="top-bar">
        <button
          onClick={() => navigate('/')}
          className="home-button"
        >
          <Home size={18} />
          Home
        </button>
      </div>

      <div className="content-area">
        <Outlet />
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = pathname === path || (path !== '/' && pathname.startsWith(path) && path !== '/children/add')
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`nav-button ${active ? 'nav-active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
