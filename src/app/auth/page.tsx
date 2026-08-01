'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { trackOnce } from '@/lib/analytics'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

function readAttribution(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('faq_attribution')
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect_to') || '/'

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        trackOnce('registration', 'registration')
        router.push(redirectTo)
      }
    })
  }, [router, redirectTo])

  // Если в URL есть UTM-параметры — сохраняем их в localStorage.
  // Так атрибуция работает даже если реклама ведёт прямо на /auth.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const utm: Record<string, string> = {}
    for (const key of UTM_KEYS) {
      const v = searchParams.get(key)
      if (v) utm[key] = v
    }
    if (utm.utm_source) {
      try {
        const existing = readAttribution()
        // Не перезаписываем существующую атрибуцию (first-touch)
        if (!existing.utm_source) {
          localStorage.setItem('faq_attribution', JSON.stringify({
            ...utm,
            first_seen_at: new Date().toISOString(),
          }))
        }
      } catch {}
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return
    setLoading(true)
    setError(null)

    const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`

    // Запись атрибуции через SECURITY DEFINER функцию (обходит RLS).
    const attribution = readAttribution()
    if (attribution.utm_source) {
      try {
        await supabase.rpc('record_signup_attribution', {
          p_email: email.trim().toLowerCase(),
          p_utm_source: attribution.utm_source ?? null,
          p_utm_medium: attribution.utm_medium ?? null,
          p_utm_campaign: attribution.utm_campaign ?? null,
          p_utm_content: attribution.utm_content ?? null,
          p_first_seen_at: attribution.first_seen_at ?? null,
        })
      } catch (err) {
        // Не блокируем логин если атрибуция не записалась
        console.error('attribution rpc failed:', err)
      }
    }

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: callback },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#f5ebd6',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px 32px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 4px 24px rgba(42, 31, 15, 0.08)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 700,
          color: '#2a1f0f',
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          Français au Quotidien
        </h1>
        <p style={{
          color: '#7a6549',
          fontSize: '15px',
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          Войти по ссылке на email
        </p>

        {sent ? (
          <div style={{
            padding: '20px',
            background: '#f5ebd6',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📧</div>
            <p style={{ color: '#2a1f0f', fontWeight: 600, marginBottom: '4px' }}>
              Письмо отправлено
            </p>
            <p style={{ color: '#7a6549', fontSize: '14px' }}>
              Проверь почту <strong>{email}</strong> и перейди по ссылке. Ссылка действует 1 час.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              style={{
                marginTop: '16px',
                background: 'none',
                border: 'none',
                color: '#c47c40',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Отправить на другой адрес
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ваш@email.ру"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #e5d4b5',
                borderRadius: '12px',
                fontSize: '15px',
                marginBottom: '12px',
                outline: 'none',
                fontFamily: 'inherit',
                background: '#faf6ed',
              }}
            />
            {error && (
              <p style={{ color: '#c44040', fontSize: '13px', marginBottom: '12px' }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                width: '100%',
                padding: '14px',
                background: '#c47c40',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading || !email.trim() ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Отправляем...' : 'Получить ссылку'}
            </button>
          </form>
        )}

        <p style={{
          marginTop: '24px',
          fontSize: '12px',
          color: '#9a8770',
          textAlign: 'center',
        }}>
          Регистрация по email. Пароль не нужен — мы пришлём ссылку для входа.
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f5ebd6' }} />}>
      <AuthForm />
    </Suspense>
  )
}
