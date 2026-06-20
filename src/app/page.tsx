'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'

type LessonSummary = {
  id: number
  level: string
  lesson_number: number
  title_fr: string
  title_ru: string
}

type Lesson = {
  id: number
  level: string
  lesson_number: number
  title_fr: string
  title_ru: string
  content: any
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const FREE_A1_LESSONS = 3

function normalizeMd(t: string) {
  return t.replace(/\*\*\s+/g, '**').replace(/\s+\*\*/g, '**')
}

let gAudio: HTMLAudioElement | null = null
let gAudioIdx = -1

export default function Home() {
  const router = useRouter()
  const [level, setLevel] = useState('A1')
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [msgs, setMsgs] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [tts, setTts] = useState<'idle' | 'load' | 'play'>('idle')
  const [ttsIdx, setTtsIdx] = useState(-1)

  // Auth + access state
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accessibleLevels, setAccessibleLevels] = useState<Set<string>>(new Set(['A1']))
  const [authLoaded, setAuthLoaded] = useState(false)

  // Авто-запуск первого урока A1, если пришли с лендинга /start (URL: /?lesson=1)
  const [autoStart, setAutoStart] = useState(false)

  const endRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const recRef = useRef<any>(null)
  const hasPaidAccess = Array.from(accessibleLevels).some(l => l !== 'A1')

  // Загружаем сессию и доступные уровни
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? null)
        const { data: access } = await supabase
          .from('user_level_access')
          .select('level, expires_at')
          .eq('user_id', user.id)
          .eq('active', true)
        const now = Date.now()
        const levels = new Set(['A1'])
        if (access) {
          for (const a of access) {
            if (!a.expires_at || new Date(a.expires_at).getTime() > now) {
              levels.add(a.level)
            }
          }
        }
        setAccessibleLevels(levels)
      } else {
        setAccessibleLevels(new Set(['A1']))
      }
      setAuthLoaded(true)
    }
    load()
  }, [])

  useEffect(() => {
    if (!accessibleLevels.has(level)) {
      setLessons([])
      return
    }

    let query = supabase.from('lessons').select('id,level,lesson_number,title_fr,title_ru')
      .eq('level', level).order('lesson_number')

    if (level === 'A1' && !hasPaidAccess) {
      query = query.lte('lesson_number', FREE_A1_LESSONS)
    }

    query
      .then(({ data }) => { if (data) setLessons(data as LessonSummary[]) })
  }, [level, accessibleLevels, hasPaidAccess])

  // На монтировании читаем ?lesson=1 — взводим флаг автозапуска
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('lesson') === '1') setAutoStart(true)
  }, [])

  // Когда уроки A1 загрузились — открываем первый и снимаем флаг
  useEffect(() => {
    if (!autoStart || lesson || lessons.length === 0) return
    const firstA1 = lessons.find(l => l.level === 'A1')
    if (firstA1) {
      setAutoStart(false)
      open(firstA1.id)
    }
  }, [autoStart, lesson, lessons])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = '48px'
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 160) + 'px'
    }
  }, [input])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUserEmail(null)
    setAccessibleLevels(new Set(['A1']))
    if (level !== 'A1') setLevel('A1')
  }

  function handleLevelClick(l: string) {
    if (accessibleLevels.has(l)) {
      setLevel(l)
      return
    }
    // Уровень заблокирован — отправляем на /pricing
    if (!userEmail) {
      router.push('/auth?redirect_to=' + encodeURIComponent('/pricing'))
    } else {
      router.push('/pricing')
    }
  }

  async function open(id: number) {
    const { data } = await supabase.from('lessons').select('*').eq('id', id).single()
    if (!data) return
    const lessonData = data as Lesson
    const canOpen = hasPaidAccess || (lessonData.level === 'A1' && lessonData.lesson_number <= FREE_A1_LESSONS)
    if (!canOpen) {
      router.push(userEmail ? '/pricing' : '/auth?redirect_to=' + encodeURIComponent('/pricing'))
      return
    }
    setLesson(lessonData)
    setMsgs([])
    kill()
    await chat(lessonData, [])
  }

  async function chat(l: Lesson, h: Message[], u?: string) {
    setLoading(true)
    const m = u ? [...h, { role: 'user' as const, content: u }] : h
    if (u) { setMsgs(m); setInput('') }
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson: l.content, lessonTitle: l.title_fr, lessonLevel: l.level, lessonNumber: l.lesson_number, messages: m })
      })
      if (!r.ok) throw 0
      const rd = r.body?.getReader(), dc = new TextDecoder()
      let txt = ''
      setMsgs([...m, { role: 'assistant', content: '' }])
      while (rd) {
        const { done, value } = await rd.read()
        if (done) break
        txt += dc.decode(value, { stream: true })
        setMsgs([...m, { role: 'assistant', content: txt }])
      }
    } catch { setMsgs([...m, { role: 'assistant', content: 'Ошибка. Попробуйте ещё раз.' }]) }
    setLoading(false)
  }

  function send() {
    if (!input.trim() || !lesson || loading) return
    chat(lesson, msgs, input.trim())
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function kill() {
    if (gAudio) { gAudio.pause(); gAudio.src = ''; gAudio = null }
    gAudioIdx = -1; setTts('idle'); setTtsIdx(-1)
  }

  async function speak(text: string, idx: number) {
    if (gAudioIdx === idx && gAudio) {
      if (tts === 'play') { gAudio.pause(); setTts('idle'); return }
      if (tts === 'idle') { gAudio.play(); setTts('play'); return }
    }
    kill(); setTts('load'); setTtsIdx(idx); gAudioIdx = idx
    try {
      const r = await fetch('/api/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      if (!r.ok) throw 0
      const b = await r.blob(), u = URL.createObjectURL(b), a = new Audio(u)
      gAudio = a
      a.onended = () => kill()
      a.onerror = () => kill()
      a.play(); setTts('play')
    } catch { kill() }
  }

  function mic() {
    if (recording) {
      recRef.current?.stop()
      setRecording(false)
      return
    }

    if (!recRef.current) {
      const S = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!S) { alert('Браузер не поддерживает речь'); return }
      const r = new S()
      r.lang = 'fr-FR'
      r.continuous = false
      r.interimResults = false
      r.maxAlternatives = 1

      r.onresult = (e: any) => {
        if (e.results.length > 0 && e.results[0].length > 0) {
          const transcript = e.results[0][0].transcript
          setInput(prev => prev ? prev + ' ' + transcript : transcript)
        }
      }

      r.onend = () => { setRecording(false) }
      r.onerror = () => { setRecording(false) }

      recRef.current = r
    }

    recRef.current.start()
    setRecording(true)
  }

  function back() { kill(); setLesson(null); setMsgs([]) }

  // ===== Внутри урока =====
  if (lesson) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={back} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '14px' }}>← Retour</button>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px', color: '#1a1a2e' }}>
            {lesson.level}-{String(lesson.lesson_number).padStart(2, '0')}: {lesson.title_fr}
          </div>
          <div style={{ fontSize: '13px', color: '#999' }}>{lesson.title_ru}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
            {m.role === 'assistant' ? (
              <div style={{ background: 'white', borderLeft: '3px solid #002395', borderRadius: '0 12px 12px 0', padding: '16px 20px', maxWidth: '85%', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'relative' }}>
                <ReactMarkdown components={{ p: ({children}) => <p style={{marginBottom:"8px"}}>{children}</p>, strong: ({children}) => <strong style={{color:"#002395"}}>{children}</strong> }}>{m.content.replace(/\n/g, "  \n")}</ReactMarkdown>
                {m.content.length > 10 && (
                  <button onClick={() => speak(m.content, i)} style={{
                    marginTop: '8px', padding: '6px 14px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '13px',
                    background: ttsIdx === i && tts === 'load' ? '#FEF3C7' : ttsIdx === i && tts === 'play' ? '#002395' : '#f3f4f6',
                    color: ttsIdx === i && tts === 'play' ? 'white' : '#555'
                  }}>
                    {ttsIdx === i && tts === 'load' ? '⏳ Загрузка...' : ttsIdx === i && tts === 'play' ? '⏸ Пауза' : '🔊 Слушать'}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ background: '#002395', color: 'white', borderRadius: '12px 0 0 12px', padding: '16px 20px', maxWidth: '85%' }}>
                <p style={{ margin: 0 }}>{m.content}</p>
              </div>
            )}
          </div>
        ))}
        {loading && msgs[msgs.length - 1]?.role !== 'assistant' && (
          <div style={{ padding: '16px 20px', background: 'white', borderLeft: '3px solid #002395', borderRadius: '0 12px 12px 0', maxWidth: '85%' }}>
            <span style={{ animation: 'pulse 1s infinite' }}>...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ borderTop: '1px solid #eee', background: 'white', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <textarea ref={taRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
            placeholder="Écrivez ici..." rows={1}
            style={{ flex: 1, padding: '12px 16px', border: '1px solid #ddd', borderRadius: '12px', fontSize: '14px', resize: 'none', minHeight: '48px', maxHeight: '160px', overflowY: 'auto', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={mic} style={{
            width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '20px',
            background: recording ? '#ED2939' : '#f3f4f6', color: recording ? 'white' : '#555'
          }}>🎤</button>
          <button onClick={send} disabled={!input.trim() || loading} style={{
            width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '18px',
            background: '#002395', color: 'white', opacity: !input.trim() || loading ? 0.3 : 1
          }}>▲</button>
        </div>
      </div>
    </div>
  )

  // ===== Главная (выбор уровня и урока) =====
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 16px' }}>
      {/* Шапка с логином/выходом */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginBottom: '24px',
        minHeight: '36px',
      }}>
        {authLoaded && (userEmail ? (
          <>
            <span style={{ fontSize: '13px', color: '#888', alignSelf: 'center' }}>
              {userEmail}
            </span>
            <button
              onClick={() => router.push('/pricing')}
              style={{
                padding: '7px 14px',
                background: '#c47c40',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Подписка
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '7px 14px',
                background: 'white',
                color: '#555',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Выйти
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push('/auth')}
            style={{
              padding: '7px 14px',
              background: '#002395',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Войти
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>Français au Quotidien</h1>
        <p style={{ color: '#888', fontSize: '18px' }}>Разговорный французский каждый день</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {LEVELS.map(l => {
          const isAccessible = accessibleLevels.has(l)
          const isSelected = level === l
          return (
            <button
              key={l}
              onClick={() => handleLevelClick(l)}
              title={isAccessible ? '' : 'Откройте по подписке'}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: isSelected ? '2px solid #002395' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                background: isSelected ? '#002395' : 'white',
                color: isSelected ? 'white' : (isAccessible ? '#555' : '#bbb'),
                fontFamily: 'inherit',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {l}
              {!isAccessible && <span style={{ fontSize: '11px' }}>🔒</span>}
            </button>
          )
        })}
      </div>

      <div>
        {lessons.map(ls => (
          <button key={ls.id} onClick={() => open(ls.id)} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '16px 20px', background: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', marginBottom: '8px', fontFamily: 'inherit'
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#999' }}>{String(ls.lesson_number).padStart(2, '0')}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: '#1a1a2e' }}>{ls.title_fr}</div>
                <div style={{ fontSize: '13px', color: '#999', marginTop: '2px' }}>{ls.title_ru}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
