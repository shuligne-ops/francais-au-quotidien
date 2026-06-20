'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const LAUNCH_LIMIT = 50

type Plan = 'monthly' | 'yearly' | 'yearly_launch'

const PLANS: { id: Plan; title: string; price: number; period: string; note?: string; highlight?: boolean }[] = [
  { id: 'monthly', title: 'Месяц', price: 1500, period: 'в месяц' },
  { id: 'yearly_launch', title: 'Год · Старт-оффер', price: 4990, period: 'в год', note: 'Только для первых 50 подписчиков', highlight: true },
  { id: 'yearly', title: 'Год', price: 7990, period: 'в год', note: 'Экономия 25%' },
]

export default function PricingPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string | null } | null>(null)
  const [launchTaken, setLaunchTaken] = useState<number>(0)
  const [loading, setLoading] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser({ email: user.email ?? null })
    })

    // Считаем сколько уже куплено старт-офферов (status='active' и plan='yearly_launch')
    supabase
      .from('user_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('plan', 'yearly_launch')
      .eq('status', 'active')
      .then(({ count }) => {
        if (typeof count === 'number') setLaunchTaken(count)
      })
  }, [])

  const launchLeft = Math.max(0, LAUNCH_LIMIT - launchTaken)
  const launchAvailable = launchLeft > 0

  async function handleChoose(plan: Plan) {
    setError(null)

    // Старт-оффер закончился — отключаем кнопку (на бэке тоже проверим)
    if (plan === 'yearly_launch' && !launchAvailable) {
      setError('Стартовое предложение закончилось')
      return
    }

    // Не залогинен — на /auth с redirect_to=/pricing
    if (!user) {
      const next = encodeURIComponent(`/pricing?plan=${plan}`)
      router.push(`/auth?redirect_to=${next}`)
      return
    }

    setLoading(plan)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Не удалось создать платёж')
        setLoading(null)
        return
      }

      // ЮKassa возвращает confirmation_url — редиректим туда
      window.location.href = data.confirmation_url
    } catch (e) {
      setError('Сетевая ошибка. Попробуйте ещё раз.')
      setLoading(null)
    }
  }

  // Авто-выбор плана из ?plan= после редиректа с /auth
  useEffect(() => {
    if (!user) return
    const url = new URL(window.location.href)
    const plan = url.searchParams.get('plan') as Plan | null
    if (plan && ['monthly', 'yearly', 'yearly_launch'].includes(plan)) {
      url.searchParams.delete('plan')
      window.history.replaceState({}, '', url.toString())
      handleChoose(plan)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5ebd6',
      padding: '32px 16px 64px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 700,
            color: '#2a1f0f',
            marginBottom: '8px',
          }}>
            Подписка на курс
          </h1>
          <p style={{ color: '#7a6549', fontSize: '17px' }}>
            3 урока A1 — бесплатно. Остальные уроки A1 и уровни A2–C2 по подписке.
          </p>
        </header>

        {launchAvailable && (
          <div style={{
            background: '#c47c40',
            color: 'white',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '24px',
            textAlign: 'center',
            fontSize: '15px',
            fontWeight: 500,
          }}>
            🎉 Стартовое предложение: годовая подписка <strong>4 990 ₽</strong> для первых 50 подписчиков. Осталось мест: <strong>{launchLeft}</strong>.
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}>
          {PLANS.map(p => {
            const isLaunch = p.id === 'yearly_launch'
            const disabled = isLaunch && !launchAvailable
            const isLoading = loading === p.id

            return (
              <div
                key={p.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '28px 24px',
                  border: p.highlight ? '2px solid #c47c40' : '1px solid #e5d4b5',
                  opacity: disabled ? 0.5 : 1,
                  position: 'relative',
                }}
              >
                {p.highlight && launchAvailable && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#c47c40',
                    color: 'white',
                    padding: '4px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    ВЫГОДНО
                  </div>
                )}

                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#2a1f0f',
                  marginBottom: '8px',
                }}>
                  {p.title}
                </h3>

                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                  marginBottom: '4px',
                }}>
                  <span style={{ fontSize: '32px', fontWeight: 700, color: '#2a1f0f' }}>
                    {p.price.toLocaleString('ru-RU')} ₽
                  </span>
                  <span style={{ color: '#7a6549', fontSize: '14px' }}>{p.period}</span>
                </div>

                {p.note && (
                  <p style={{ fontSize: '13px', color: '#7a6549', marginBottom: '16px' }}>
                    {p.note}
                  </p>
                )}

                <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', fontSize: '14px', color: '#5a4a35' }}>
                  <li style={{ marginBottom: '8px' }}>✓ Все уровни A2–C2</li>
                  <li style={{ marginBottom: '8px' }}>✓ 150 уроков с Camille</li>
                  <li style={{ marginBottom: '8px' }}>✓ Аудио + распознавание речи</li>
                  <li>✓ Доступ с любого устройства</li>
                </ul>

                <button
                  onClick={() => handleChoose(p.id)}
                  disabled={disabled || isLoading || loading !== null}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: p.highlight ? '#c47c40' : '#2a1f0f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {isLoading ? 'Переходим к оплате...' : disabled ? 'Места закончились' : 'Выбрать'}
                </button>
              </div>
            )
          })}
        </div>

        {error && (
          <p style={{
            textAlign: 'center',
            color: '#c44040',
            marginTop: '20px',
            fontSize: '14px',
          }}>
            {error}
          </p>
        )}

        <p style={{
          textAlign: 'center',
          marginTop: '32px',
          fontSize: '13px',
          color: '#9a8770',
        }}>
          Оплата через ЮKassa. Самозанятый Мешалкин А.В., ИНН 540447003201.
        </p>
      </div>
    </div>
  )
}
