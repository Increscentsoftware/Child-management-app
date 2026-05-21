import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/lib/store'
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Clock,
  FileUp,
  Wifi,
  WifiOff,
} from 'lucide-react'

const NAV = [
  {
    path: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    path: '/children',
    icon: Users,
    label: 'Children',
  },
  {
    path: '/children/add',
    icon: PlusCircle,
    label: 'Add Child',
  },
  {
    path: '/changelog',
    icon: Clock,
    label: 'Change Log',
  },
  {
    path: '/import',
    icon: FileUp,
    label: 'Import',
  },
]

export default function Layout() {
  const navigate = useNavigate()

  const { pathname } = useLocation()

  const {
    isOnline,
    pendingSync,
  } = useAppStore()

  return (
    <div
      className="app-layout"
      style={{
        minHeight: '100dvh',
        background: '#f5f5f5',
        paddingBottom: 76,
      }}
    >
      {/* ===================================================== */}
      {/* SYNC STATUS BANNERS */}
      {/* ===================================================== */}

      {!isOnline && (
        <div
          style={{
            background: '#faeeda',
            padding: '6px 14px',
            fontSize: 11,
            color: '#854f0b',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderBottom:
              '0.5px solid #fac775',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <WifiOff size={12} />

          Offline mode — {pendingSync}{' '}
          record
          {pendingSync !== 1 ? 's' : ''}{' '}
          pending sync
        </div>
      )}

      {isOnline && pendingSync > 0 && (
        <div
          style={{
            background: '#e1f5ee',
            padding: '6px 14px',
            fontSize: 11,
            color: '#085041',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderBottom:
              '0.5px solid #9fe1cb',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Wifi size={12} />

          Syncing {pendingSync} pending
          record
          {pendingSync !== 1 ? 's' : ''}...
        </div>
      )}

      {/* ===================================================== */}
      {/* PAGE CONTENT */}
      {/* ===================================================== */}

      <main
        className="content-area"
        style={{
          width: '100%',
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        <Outlet />
      </main>

      {/* ===================================================== */}
      {/* BOTTOM NAVIGATION */}
      {/* ===================================================== */}

      <nav
        className="bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop:
            '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 4px calc(8px + env(safe-area-inset-bottom))',
          zIndex: 200,
          boxShadow:
            '0 -4px 20px rgba(0,0,0,0.05)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {NAV.map(
          ({
            path,
            icon: Icon,
            label,
          }) => {

            let active = false

if (path === '/') {
  active = pathname === '/'
} else if (path === '/children') {
  active =
    pathname.startsWith('/children') &&
    pathname !== '/children/add'
} else if (path === '/children/add') {
  active = pathname === '/children/add'
} else {
  active =
    pathname === path ||
    pathname.startsWith(path)
}

            return (
              <button
                key={path}
                onClick={() =>
                  navigate(path)
                }
                className={`nav-button ${
                  active
                    ? 'nav-active'
                    : ''
                }`}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                  gap: 4,
                  padding:
                    '8px 4px',
                  color: active
                    ? '#1a6b4a'
                    : '#666',
                  fontWeight: active
                    ? 600
                    : 500,
                  fontSize: 11,
                  cursor: 'pointer',
                  transition:
                    'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    background: active
                      ? '#e7f6ef'
                      : 'transparent',
                    transition:
                      'all 0.2s ease',
                  }}
                >
                  <Icon size={18} />
                </div>

                <span>{label}</span>
              </button>
            )
          }
        )}
      </nav>
    </div>
  )
}