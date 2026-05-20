import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/lib/store'
import {
  LayoutDashboard, Users, PlusCircle, Clock, FileUp, Wifi, WifiOff
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
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif"
    }}>
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
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>

      {/* Bottom nav */}
      <nav style={{
        display: 'flex', borderTop: '0.5px solid #e5e5e5',
        background: '#fff', position: 'sticky', bottom: 0, zIndex: 50
      }}>
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = pathname === path || (path !== '/' && pathname.startsWith(path) && path !== '/children/add')
          return (
            <button key={path} onClick={() => navigate(path)} style={{
              flex: 1, padding: '8px 4px 6px', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 10, fontFamily: 'inherit',
              color: active ? '#1a6b4a' : '#888', fontWeight: active ? 600 : 400,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3
            }}>
              <Icon size={17} />
              {label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
