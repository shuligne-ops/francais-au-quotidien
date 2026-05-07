'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function StartPage() {
  return (
    <Suspense fallback={null}>
      <StartPageContent />
    </Suspense>
  )
}

function StartPageContent() {
  const params = useSearchParams()
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null)

  // Сохраняем UTM-метки в localStorage при первом заходе
  useEffect(() => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    const utmData: Record<string, string> = {}
    utmKeys.forEach((k) => {
      const v = params.get(k)
      if (v) utmData[k] = v
    })
    if (Object.keys(utmData).length > 0) {
      utmData['captured_at'] = new Date().toISOString()
      localStorage.setItem('faq_utm', JSON.stringify(utmData))
    }
  }, [params])

  // Подгружаем количество оставшихся мест по старт-офферу
  // (если эндпоинта пока нет — показываем дефолт)
  useEffect(() => {
    fetch('/api/seats-left')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data.left === 'number') setSeatsLeft(data.left)
      })
      .catch(() => {})
  }, [])

  return (
    <main style={{
      background: '#FAF3E7',
      color: '#3D2817',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, sans-serif',
      lineHeight: 1.6,
    }}>
      {/* HERO */}
      <section style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '80px 24px 60px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 14px',
          background: '#C8964A',
          color: 'white',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 500,
          letterSpacing: '0.5px',
          marginBottom: '24px',
        }}>
          FRANÇAIS AU QUOTIDIEN
        </div>

        <h1 style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 'clamp(36px, 6vw, 56px)',
          fontWeight: 700,
          lineHeight: 1.15,
          marginBottom: '24px',
          color: '#2A1810',
        }}>
          Французский, на котором<br/>действительно говорят
        </h1>

        <p style={{
          fontSize: '20px',
          color: '#5C4033',
          marginBottom: '40px',
          maxWidth: '560px',
          marginInline: 'auto',
        }}>
          180 уроков с Камиллой — учительницей, которая разговаривает живым языком,
          а не зачитывает учебник.
        </p>

        <Link href="/auth" style={{
          display: 'inline-block',
          padding: '16px 36px',
          background: '#3D2817',
          color: '#FAF3E7',
          fontSize: '17px',
          fontWeight: 600,
          borderRadius: '8px',
          textDecoration: 'none',
          marginBottom: '12px',
        }}>
          Начать с A1 бесплатно
        </Link>

        <p style={{ fontSize: '14px', color: '#8B6F47', margin: 0 }}>
          Регистрация в один клик. Без карты.
        </p>
      </section>

      {/* ИСТОРИЯ */}
      <section style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '60px 24px',
        borderTop: '1px solid #E8DCC4',
      }}>
        <h2 style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '24px',
          color: '#2A1810',
        }}>
          Почему я делаю этот курс
        </h2>

        <div style={{ fontSize: '17px', color: '#3D2817' }}>
          <p style={{ marginBottom: '20px' }}>
            Я три года учился в Горьковском инязе, потом сам доучил английский
            и французский до уровня, на котором живу в них.
          </p>

          <p style={{ marginBottom: '20px' }}>
            Я знаю, как преподают французский в институте — пять лет грамматики,
            таблицы спряжений, тексты про Жанну д'Арк. И знаю, почему после диплома
            человек всё ещё может на ровном месте впасть в ступор, когда нужно
            спросить дорогу или поговорить с консьержкой.
          </p>

          <p style={{ marginBottom: '20px' }}>
            Дело не в грамматике. Дело в том, что живой французский — это
            <em> bah</em>, <em>du coup</em>, <em>enfin</em>, незаконченные фразы,
            ритм, в который надо попасть. Этому в институтах не учат.
          </p>

          <p style={{ marginBottom: 0, fontWeight: 500 }}>
            Этот курс — то, чего мне самому не хватало.
          </p>

          <p style={{
            marginTop: '24px',
            fontSize: '15px',
            color: '#8B6F47',
            fontStyle: 'italic',
          }}>
            — Александр, автор Français au Quotidien
          </p>
        </div>
      </section>

      {/* ДИАЛОГ */}
      <section style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '60px 24px',
        borderTop: '1px solid #E8DCC4',
      }}>
        <h2 style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '12px',
          color: '#2A1810',
        }}>
          Как выглядит урок с Камиллой
        </h2>

        <p style={{ fontSize: '15px', color: '#8B6F47', marginBottom: '32px' }}>
          Фрагмент урока A2. Ученик задаёт вопрос — Камилла отвечает.
        </p>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 2px 12px rgba(61, 40, 23, 0.08)',
        }}>
          <DialogueLine
            speaker="Ученик"
            color="#8B6F47"
            text="Камилла, а почему французы всё время говорят «du coup»? Что это вообще значит?"
          />
          <DialogueLine
            speaker="Camille"
            color="#C8964A"
            text="Ah, bah écoute, c'est la question à un million ! «Du coup» — c'est… enfin, littéralement ça veut dire «du coup», как «в результате», но честно? Французы суют его везде, иногда вообще без смысла."
          />
          <DialogueLine
            speaker="Camille"
            color="#C8964A"
            text="Tu sais, c'est comme «короче» по-русски. «Короче, я пошёл» — это не значит, что человек реально что-то сократил. Просто слово-паразит. У нас «du coup» делает ту же работу — заполняет паузу, связывает мысли."
          />
          <DialogueLine
            speaker="Camille"
            color="#C8964A"
            text="Du coup, не парься, если не понимаешь его в каждой фразе. Главное — научись слышать ритм. А смысл подтянется."
          />

          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px dashed #E8DCC4',
            fontSize: '14px',
            color: '#8B6F47',
            fontStyle: 'italic',
          }}>
            ↑ Это не «диалог из учебника». Камилла говорит, как говорят живые
            французы — с фамильярностями, паузами и сравнениями, которые
            понятны русскому уху.
          </div>
        </div>
      </section>

      {/* ЧТО ВНУТРИ */}
      <section style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '60px 24px',
        borderTop: '1px solid #E8DCC4',
      }}>
        <h2 style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '32px',
          color: '#2A1810',
          textAlign: 'center',
        }}>
          Что внутри
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          <FeatureCard
            number="180"
            title="уроков"
            text="Шесть уровней от A1 до C2. По 30 уроков на каждом."
          />
          <FeatureCard
            number="5"
            title="шагов в уроке"
            text="Ключевая фраза → диалог → разбор → второе прослушивание → практика."
          />
          <FeatureCard
            number="∞"
            title="попыток"
            text="Камилла не устаёт. Можете повторять и переспрашивать сколько нужно."
          />
        </div>
      </section>

      {/* ЦЕНЫ */}
      <section style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '60px 24px',
        borderTop: '1px solid #E8DCC4',
      }}>
        <h2 style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '12px',
          color: '#2A1810',
          textAlign: 'center',
        }}>
          Тарифы
        </h2>

        <p style={{
          textAlign: 'center',
          color: '#8B6F47',
          marginBottom: '40px',
        }}>
          A1 — бесплатно навсегда. Хотите дальше — выбирайте подписку.
        </p>

        {/* Старт-оффер */}
        <div style={{
          background: 'linear-gradient(135deg, #3D2817 0%, #5C4033 100%)',
          color: '#FAF3E7',
          padding: '32px',
          borderRadius: '16px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#C8964A',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}>
            СТАРТ-ОФФЕР
          </div>

          <div style={{ fontSize: '14px', color: '#D4B896', marginBottom: '8px' }}>
            Первым 50 подписчикам
          </div>

          <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>
            Год за 4 990 ₽
          </div>

          <div style={{
            fontSize: '15px',
            color: '#D4B896',
            marginBottom: '20px',
            textDecoration: 'line-through',
          }}>
            обычная цена 7 990 ₽
          </div>

          {seatsLeft !== null && seatsLeft > 0 && (
            <div style={{ fontSize: '14px', color: '#FAF3E7', marginBottom: '20px' }}>
              Осталось <strong>{seatsLeft}</strong> мест из 50
            </div>
          )}

          <Link href="/pricing" style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: '#C8964A',
            color: 'white',
            fontWeight: 600,
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '16px',
          }}>
            Забрать оффер
          </Link>
        </div>

        {/* Обычные тарифы */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          <PriceCard title="Месяц" price="890 ₽" subtitle="попробовать" />
          <PriceCard title="Год" price="7 990 ₽" subtitle="экономия 30%" />
        </div>
      </section>

      {/* CTA */}
      <section style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '60px 24px 100px',
        textAlign: 'center',
        borderTop: '1px solid #E8DCC4',
      }}>
        <h2 style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '16px',
          color: '#2A1810',
        }}>
          Начните с первого урока. Бесплатно.
        </h2>

        <p style={{
          color: '#5C4033',
          marginBottom: '32px',
          fontSize: '17px',
        }}>
          Решение о подписке — потом. Сначала просто попробуйте.
        </p>

        <Link href="/auth" style={{
          display: 'inline-block',
          padding: '18px 40px',
          background: '#3D2817',
          color: '#FAF3E7',
          fontSize: '18px',
          fontWeight: 600,
          borderRadius: '8px',
          textDecoration: 'none',
        }}>
          Открыть первый урок →
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#3D2817',
        color: '#D4B896',
        padding: '32px 24px',
        textAlign: 'center',
        fontSize: '13px',
      }}>
        <div style={{ marginBottom: '8px' }}>
          Français au Quotidien · Самозанятый Шулигин А.
        </div>
        <div style={{ color: '#8B6F47' }}>
          ИНН 540447003201
        </div>
      </footer>
    </main>
  )
}

function DialogueLine({
  speaker,
  color,
  text,
}: {
  speaker: string
  color: string
  text: string
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        fontWeight: 600,
        color,
        fontSize: '14px',
        marginBottom: '4px',
        letterSpacing: '0.3px',
      }}>
        {speaker}
      </div>
      <div style={{
        fontSize: '16px',
        color: '#3D2817',
        lineHeight: 1.6,
      }}>
        {text}
      </div>
    </div>
  )
}

function FeatureCard({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(61, 40, 23, 0.06)',
    }}>
      <div style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: '40px',
        fontWeight: 700,
        color: '#C8964A',
        lineHeight: 1,
        marginBottom: '4px',
      }}>
        {number}
      </div>
      <div style={{
        fontSize: '14px',
        color: '#8B6F47',
        marginBottom: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {title}
      </div>
      <div style={{ fontSize: '14px', color: '#5C4033' }}>
        {text}
      </div>
    </div>
  )
}

function PriceCard({
  title,
  price,
  subtitle,
}: {
  title: string
  price: string
  subtitle: string
}) {
  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #E8DCC4',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '14px',
        color: '#8B6F47',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: '28px',
        fontWeight: 700,
        color: '#2A1810',
        marginBottom: '4px',
      }}>
        {price}
      </div>
      <div style={{ fontSize: '13px', color: '#8B6F47' }}>
        {subtitle}
      </div>
    </div>
  )
}
