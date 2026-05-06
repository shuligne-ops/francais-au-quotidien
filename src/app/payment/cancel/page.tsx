'use client'

import { useRouter } from 'next/navigation'

export default function CancelPage() {
  const router = useRouter()

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
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>↩️</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '24px',
          color: '#2a1f0f',
          marginBottom: '8px',
        }}>
          Оплата не завершена
        </h1>
        <p style={{ color: '#7a6549', marginBottom: '24px' }}>
          Ничего не списалось. Можно попробовать ещё раз.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={() => router.push('/pricing')}
            style={{
              padding: '12px 24px',
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
            К тарифам
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#2a1f0f',
              border: '1px solid #e5d4b5',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  )
}
