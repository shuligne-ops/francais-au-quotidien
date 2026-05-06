'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SuccessPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'active' | 'pending'>('checking')

  useEffect(() => {
    let stop = false

    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }

      // Polling — webhook прилетает за 1-3 секунды, но дадим до 20 секунд
      const start = Date.now()
      while (!stop && Date.now() - start < 20000) {
        const { data } = await supabase
          .from('user_level_access')
          .select('id')
          .eq('user_id', user.id)
          .eq('active', true)
          .limit(1)

        if (data && data.length > 0) {
          setStatus('active')
          return
        }
        await new Promise(r => setTimeout(r, 1500))
      }
      setStatus('pending')
    }

    check()
    return () => { stop = true }
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5ebd6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px 32px',
        maxWidth: '460px',
        width: '100%',
        textAlign: 'center',
      }}>
        {status === 'checking' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              color: '#2a1f0f',
              marginBottom: '8px',
            }}>
              Активируем доступ
            </h1>
            <p style={{ color: '#7a6549' }}>Подождите несколько секунд...</p>
          </>
        )}

        {status === 'active' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              color: '#2a1f0f',
              marginBottom: '8px',
            }}>
              Доступ открыт!
            </h1>
            <p style={{ color: '#7a6549', marginBottom: '24px' }}>
              Все уровни A2–C2 теперь доступны. Bonne chance !
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '12px 32px',
                background: '#c47c40',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              К урокам
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📨</div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              color: '#2a1f0f',
              marginBottom: '8px',
            }}>
              Оплата получена
            </h1>
            <p style={{ color: '#7a6549', marginBottom: '8px' }}>
              Доступ активируется в течение 1-2 минут.
            </p>
            <p style={{ color: '#9a8770', fontSize: '13px', marginBottom: '24px' }}>
              Если через 5 минут уроки A2 не откроются — напишите в поддержку.
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '12px 32px',
                background: '#c47c40',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              На главную
            </button>
          </>
        )}
      </div>
    </div>
  )
}
