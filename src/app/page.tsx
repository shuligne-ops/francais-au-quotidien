'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// Этот лендинг — точка приземления для рекламного трафика FAQ.
// НЕ показывает селектор уроков. Одна цель: довести до клика "Попробовать первый урок".
// UTM-параметры из URL сохраняем в localStorage, чтобы потом сматчить с регистрацией.
// Структура и логика — копия EF-лендинга, палитра — тёплая (бежевый/охра/тёмно-коричневый).

function StartContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Сохраняем UTM в localStorage для последующей атрибуции платежей к рекламной кампании
  useEffect(() => {
    const utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
    const data: Record<string, string> = {}
    utms.forEach(k => {
      const v = searchParams.get(k)
      if (v) data[k] = v
    })
    if (Object.keys(data).length > 0) {
      try {
        data.first_seen_at = new Date().toISOString()
        localStorage.setItem('faq_attribution', JSON.stringify(data))
      } catch {}
    }
  }, [searchParams])

  function startFirstLesson() {
    // Первый урок A1 — id зависит от данных в Supabase, но ссылка на главную с автозапуском
    // самого первого. Простой путь: редирект на главную, фронт сам подхватит дефолт A1-01.
    router.push('/?lesson=1')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FAF3E7 0%, #F0E4CC 100%)',
      color: '#3D2817',
      fontFamily: 'var(--font-sans, system-ui)',
    }}>
      {/* HERO */}
      <section style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '48px 20px 32px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 14px',
          background: 'rgba(200, 150, 74, 0.18)',
          color: '#A87729',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '20px',
          letterSpacing: '0.5px',
        }}>
          FRANÇAIS AU QUOTIDIEN
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 'clamp(32px, 6vw, 48px)',
          fontWeight: 700,
          lineHeight: 1.15,
          margin: '0 0 20px',
          color: '#2A1810',
        }}>
          Перестань стесняться<br/>говорить по-французски
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 3vw, 19px)',
          lineHeight: 1.6,
          color: '#5C4033',
          maxWidth: '560px',
          margin: '0 auto 32px',
        }}>
          180 уроков-диалогов с Камиллой и её друзьями. Из любого уровня — в свободную речь. 30 минут в день, без зубрёжки.
        </p>

        <button
          onClick={startFirstLesson}
          style={{
            background: '#C8964A',
            color: '#FAF3E7',
            border: 'none',
            padding: '16px 40px',
            borderRadius: '12px',
            fontSize: '17px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 8px 24px rgba(200, 150, 74, 0.3)',
          }}
        >
          Попробовать первый урок →
        </button>

        <p style={{
          marginTop: '14px',
          fontSize: '13px',
          color: '#8B6F47',
        }}>
          Без регистрации. Бесплатно.
        </p>
      </section>

      {/* DIALOGUE PREVIEW — чтобы человек СРАЗУ увидел что это */}
      <section style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '32px 20px',
      }}>
        <p style={{
          textAlign: 'center',
          color: '#8B6F47',
          fontSize: '13px',
          letterSpacing: '1.5px',
          marginBottom: '20px',
        }}>
          ВОТ КАК ЭТО ВЫГЛЯДИТ
        </p>

        <div style={{
          background: 'rgba(255, 255, 255, 0.6)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(200, 150, 74, 0.25)',
          boxShadow: '0 2px 12px rgba(61, 40, 23, 0.06)',
        }}>
          <DialogueLine speaker="Camille" text="Bah, t'as vu Léo ce matin ?" />
          <DialogueLine speaker="Inès" text="Non, pourquoi ?" />
          <DialogueLine speaker="Camille" text="Il avait l'air... bizarre. Du coup je m'inquiète." />
          <DialogueLine speaker="Inès" text="Bizarre comment ?" />
          <DialogueLine speaker="Camille" text="Enfin, tu sais, comme quand il a un truc à dire mais il dit rien." />
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: '14px',
          color: '#5C4033',
          marginTop: '16px',
          fontStyle: 'italic',
        }}>
          Реальные диалоги. Живые ситуации. Никаких «Bonjour, je m'appelle Marie».
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '40px 20px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: '26px',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '32px',
          color: '#2A1810',
        }}>
          Как устроен курс
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          <Feature icon="🎭" title="Диалоги, не правила" text="Учишься на реальных разговорах между Камиллой, Лео, Инес и их друзьями" />
          <Feature icon="🎙" title="Голос и распознавание" text="Слушаешь, повторяешь, говоришь — приложение услышит и поймёт" />
          <Feature icon="📈" title="6 уровней — 180 уроков" text="От первых фраз до свободной речи. Каждый урок — новая ситуация" />
          <Feature icon="📱" title="Где угодно" text="Браузер на телефоне, планшете, компьютере. Без установки приложения" />
        </div>
      </section>

      {/* FOUNDER STORY */}
      <section style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px 20px',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.6)',
          borderRadius: '16px',
          padding: '28px 24px',
          border: '1px solid rgba(200, 150, 74, 0.2)',
          boxShadow: '0 2px 12px rgba(61, 40, 23, 0.06)',
        }}>
          <p style={{
            color: '#8B6F47',
            fontSize: '13px',
            letterSpacing: '1.5px',
            marginBottom: '16px',
          }}>
            ОТ АВТОРА
          </p>
          <p style={{
            fontSize: '16px',
            lineHeight: 1.7,
            color: '#3D2817',
            margin: 0,
          }}>
            Я три года учился в Горьковском инязе на французском отделении. Грамматика, фонетика, тексты про Жанну д'Арк — всё было. А когда нужно было говорить с живым французом, стоял и молчал. Языковой барьер.
            <br/><br/>
            Когда я наконец заговорил — понял, что мешало всё это время: не было живой разговорной практики каждый день.
            <br/><br/>
            Français au Quotidien — это то, чего мне самому не хватало. Курс, который вытаскивает в речь — через диалоги с Камиллой, как они говорят на самом деле.
          </p>
          <p style={{
            marginTop: '16px',
            fontSize: '14px',
            color: '#8B6F47',
          }}>
            — Александр, автор курса
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px 20px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: '26px',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '8px',
          color: '#2A1810',
        }}>
          Сколько это стоит
        </h2>
        <p style={{
          textAlign: 'center',
          color: '#8B6F47',
          marginBottom: '24px',
        }}>
          Уровень A1 — навсегда бесплатно. Дальше по подписке.
        </p>

        <div style={{
          background: 'rgba(200, 150, 74, 0.12)',
          border: '1px solid rgba(200, 150, 74, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#3D2817',
        }}>
          🎁 <strong style={{ color: '#A87729' }}>Старт-оффер для первых 50:</strong> год за 4 990 ₽ вместо 7 990 ₽
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
        }}>
          <Price label="Месяц" value="890 ₽" period="в мес" />
          <Price label="Год" value="7 990 ₽" period="экономия 25%" highlight />
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#8B6F47',
          marginTop: '16px',
        }}>
          Самозанятый Мешалкин А.В., ИНН 540447003201. Оплата через ЮKassa.
        </p>
      </section>

      {/* FINAL CTA */}
      <section style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '32px 20px 64px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: '24px',
          fontWeight: 700,
          marginBottom: '20px',
          color: '#2A1810',
        }}>
          Начни прямо сейчас
        </h2>

        <button
          onClick={startFirstLesson}
          style={{
            background: '#C8964A',
            color: '#FAF3E7',
            border: 'none',
            padding: '16px 40px',
            borderRadius: '12px',
            fontSize: '17px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 8px 24px rgba(200, 150, 74, 0.3)',
          }}
        >
          Открыть первый урок →
        </button>

        <p style={{
          marginTop: '14px',
          fontSize: '13px',
          color: '#8B6F47',
        }}>
          Первые 30 уроков A1 — бесплатно, без регистрации.
        </p>
      </section>

      {/* TELEGRAM CHANNEL */}
      <section style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '0 20px 56px',
      }}>
        <div style={{
          background: 'rgba(200, 150, 74, 0.08)',
          border: '1px solid rgba(200, 150, 74, 0.25)',
          borderRadius: '12px',
          padding: '20px 24px',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '14px',
            color: '#5C4033',
            marginBottom: '12px',
            lineHeight: 1.5,
          }}>
            Не готовы начать сегодня? Подписывайтесь на канал —<br />
            раз в несколько дней живая фраза или кусочек диалога.
          </p>
          <a
            href="https://t.me/francais_au_quotidien"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              color: '#A87729',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              borderBottom: '1px solid rgba(168, 119, 41, 0.4)',
              paddingBottom: '2px',
            }}
          >
            @francais_au_quotidien →
          </a>
        </div>
      </section>
    </div>
  )
}

function DialogueLine({ speaker, text }: { speaker: string; text: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <span style={{
        color: '#A87729',
        fontWeight: 700,
        fontSize: '14px',
        marginRight: '8px',
      }}>
        {speaker}:
      </span>
      <span style={{
        color: '#3D2817',
        fontSize: '15px',
        fontStyle: 'italic',
      }}>
        "{text}"
      </span>
    </div>
  )
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <h3 style={{
        fontSize: '16px',
        fontWeight: 700,
        marginBottom: '6px',
        color: '#2A1810',
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '14px',
        lineHeight: 1.5,
        color: '#5C4033',
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  )
}

function Price({ label, value, period, highlight }: { label: string; value: string; period: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'rgba(200, 150, 74, 0.15)' : 'rgba(255, 255, 255, 0.5)',
      border: highlight ? '1px solid rgba(200, 150, 74, 0.5)' : '1px solid rgba(200, 150, 74, 0.15)',
      borderRadius: '12px',
      padding: '16px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '13px', color: '#8B6F47', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 700, color: '#2A1810', marginBottom: '2px' }}>{value}</p>
      <p style={{ fontSize: '12px', color: '#8B6F47' }}>{period}</p>
    </div>
  )
}

export default function StartPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAF3E7' }} />}>
      <StartContent />
    </Suspense>
  )
}
