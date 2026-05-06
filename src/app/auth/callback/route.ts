import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Этот route обрабатывает возврат пользователя по magic link.
// Supabase кладёт сессию в URL hash (#access_token=...) и сам её подхватывает
// на клиенте. Этот эндпоинт нужен, чтобы:
//   1) принять `code` из query (если магия идёт через PKCE flow)
//   2) перекинуть пользователя на нужную страницу через ?next=
//
// Если приходит ?code= — обмениваем на сессию серверно и ставим cookie.
// Если приходит #access_token — ничего не делаем здесь, клиент подхватит сам.

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'

  // Безопасный next: только относительные пути на нашем домене
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
      return NextResponse.redirect(new URL('/auth?error=callback_failed', url.origin))
    }
  }

  return NextResponse.redirect(new URL(safeNext, url.origin))
}
