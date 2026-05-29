import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

interface LoginForm { email: string; password: string }

function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong password') || m.includes('email not confirmed'))
    return 'Incorrect email or password. Please try again.'
  if (m.includes('too many requests') || m.includes('rate limit'))
    return 'Too many login attempts. Please wait a few minutes and try again.'
  if (m.includes('network') || m.includes('fetch'))
    return 'Network error. Please check your connection.'
  return msg
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()
  const emailReg = register('email', { required: 'Email is required' })
  const passwordReg = register('password', { required: 'Password is required' })

  const onSubmit = async ({ email, password }: LoginForm) => {
    setLoading(true)
    setLoginError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.user) {
        const { data: sw, error: swErr } = await supabase
          .from('social_workers')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()
        if (swErr) throw new Error(swErr.message || 'Social worker profile not found. Contact admin.')
        if (!sw) throw new Error('Social worker profile not found. Contact admin.')
        setUser(sw)
        toast.success(`Welcome, ${sw.full_name}!`)
        navigate('/')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setLoginError(friendlyAuthError(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(145deg, #0f5a3f 0%, #1a6b4a 50%, #1e7d56 100%)',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Login card */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        padding: '36px 32px 28px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Logo + branding */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 80, height: 80,
            background: '#fff',
            borderRadius: 16,
            margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(26,107,74,0.15)',
            border: '1.5px solid #e8f5ee',
          }}>
            <img src="/logo.png" alt="Shishu Mandir" style={{ width: 60, height: 60, objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0, letterSpacing: '-0.3px' }}>
            Shishu Mandir
          </h1>
          <p style={{ fontSize: 12, color: '#888', marginTop: 4, fontWeight: 500 }}>
            Child Management System
          </p>
          <div style={{ width: 36, height: 3, background: '#1a6b4a', borderRadius: 2, margin: '12px auto 0' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email Address
            </label>
            <input
              type="email"
              {...emailReg}
              onChange={e => { emailReg.onChange(e); setLoginError(null) }}
              placeholder="sw@shishumandir.org"
              style={{
                width: '100%', padding: '11px 13px',
                border: errors.email ? '1.5px solid #e24b4a' : '1.5px solid #e0e0e0',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box', background: '#fafafa',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#1a6b4a'}
              onBlur={e => e.currentTarget.style.borderColor = errors.email ? '#e24b4a' : '#e0e0e0'}
            />
            {errors.email && <p style={{ fontSize: 11, color: '#a32d2d', marginTop: 4 }}>{errors.email.message}</p>}
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <input
              type="password"
              {...passwordReg}
              onChange={e => { passwordReg.onChange(e); setLoginError(null) }}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '11px 13px',
                border: errors.password ? '1.5px solid #e24b4a' : '1.5px solid #e0e0e0',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box', background: '#fafafa',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#1a6b4a'}
              onBlur={e => e.currentTarget.style.borderColor = errors.password ? '#e24b4a' : '#e0e0e0'}
            />
            {errors.password && <p style={{ fontSize: 11, color: '#a32d2d', marginTop: 4 }}>{errors.password.message}</p>}
          </div>

          {loginError && (
            <div style={{
              background: '#fcebeb', border: '1px solid #f5c0c0', borderRadius: 10,
              padding: '10px 13px', fontSize: 13, color: '#a32d2d',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ flexShrink: 0 }}>⚠</span>
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading ? '#5dcaa5' : '#1a6b4a',
              color: '#fff', border: 'none', borderRadius: 11, fontSize: 15,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', marginTop: 4,
              transition: 'background 0.2s, transform 0.1s',
              letterSpacing: '-0.2px',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#155c3e' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1a6b4a' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 20, lineHeight: 1.5 }}>
          Works offline · syncs automatically when online
        </p>
      </div>
    </div>
  )
}
