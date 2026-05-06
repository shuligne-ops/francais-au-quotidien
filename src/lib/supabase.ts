import { createClient, SupportedStorage } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// safeStorage — обёртка над localStorage, которая не падает,
// если localStorage недоступен (incognito, SSR) и игнорирует поломанные значения
const safeStorage: SupportedStorage = {
  getItem: (key: string) => {
    try {
      if (typeof window === 'undefined') return null
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(key, value)
    } catch {
      // молча игнорируем
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window === 'undefined') return
      window.localStorage.removeItem(key)
    } catch {
      // молча игнорируем
    }
  },
}

// noopLock — отключаем встроенный auth-lock supabase-js v2,
// который иногда зависает в localStorage и блокирует инициализацию клиента
// (известный баг, в EF лечили этим же способом 5 мая 2026)
const noopLock = async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  return await fn()
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    lock: noopLock,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type Lesson = {
  id: number
  level: string
  lesson_number: number
  title_fr: string
  title_ru: string
  content: {
    step1: { phrase_fr: string; phrase_ru: string; explanation_fr: string; example_fr: string }
    step2: { dialogue_with_names: string[] }
    step3: {
      comprehension: { question: string; answer: string }[]
      vocab: { word: string; explanation_fr: string; translation_ru: string }[]
      culture_note: string
      grammar_micro: string
    }
    step4: { dialogue_no_names: string[] }
    step5: { scenario: string; models: string[] }
  }
}

export async function getLessons(level: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('level', level)
    .order('lesson_number')
  if (error) throw error
  return data as Lesson[]
}

export async function getLesson(level: string, lessonNumber: number): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('level', level)
    .eq('lesson_number', lessonNumber)
    .single()
  if (error) return null
  return data as Lesson
}
