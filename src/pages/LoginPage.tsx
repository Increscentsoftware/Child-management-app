import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

interface LoginForm { email: string; password: string }

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAppStore()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async ({ email, password }: LoginForm) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
  console.error('SUPABASE LOGIN ERROR:', error)
  throw error
}

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
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '32px 24px',
      background: 'linear-gradient(180deg, #f0faf6 0%, #fff 60%)',
      fontFamily: "'DM Sans', system-ui, sans-serif"
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 72, height: 72, background: '#1a6b4a', borderRadius: '50%',
          margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="13" r="6.5" fill="#fff"/>
            <path d="M3 33c0-8.284 6.716-15 15-15s15 6.716 15 15" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111', margin: 0 }}>Shishu Mandir</h1>
        <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Child Management System</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>
            Email address
          </label>
          <input
            type="email"
            {...register('email', { required: 'Email is required' })}
            placeholder="sw@shishumandir.org"
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #ddd',
              borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
          {errors.email && <p style={{ fontSize: 11, color: '#a32d2d', marginTop: 3 }}>{errors.email.message}</p>}
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>
            Password
          </label>
          <input
            type="password"
            {...register('password', { required: 'Password is required' })}
            placeholder="••••••••"
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #ddd',
              borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
          {errors.password && <p style={{ fontSize: 11, color: '#a32d2d', marginTop: 3 }}>{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '12px', background: loading ? '#5dcaa5' : '#1a6b4a',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', marginTop: 4, transition: 'background 0.2s'
          }}
        >
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#999', marginTop: 20 }}>
        Works offline · data syncs automatically when online
      </p>
    </div>
  )
}
