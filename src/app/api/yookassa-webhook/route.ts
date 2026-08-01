import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// ЮKassa шлёт webhook на этот URL после успешного/неуспешного платежа.
// Документация: https://yookassa.ru/developers/using-api/webhooks
//
// Безопасность:
// - На уровне HTTP IP-валидация ЮKassa частично закомментирована (как в EF):
//   полагаемся на сверку payment.id с записью в БД с status='pending'.
//   Это достаточно на старте; при росте трафика стоит вернуть IP-проверку.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    console.log('[yookassa-webhook] event:', body.event, 'payment_id:', body.object?.id)

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    if (body.event === 'payment.succeeded') {
      const payment = body.object
      if (!payment?.id) {
        return NextResponse.json({ error: 'no_payment_id' }, { status: 400 })
      }

      // Находим подписку по yookassa_payment_id
      const { data: subscription, error: findErr } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('yookassa_payment_id', payment.id)
        .single()

      if (findErr || !subscription) {
        console.error('[yookassa-webhook] subscription not found for payment:', payment.id)
        // Возвращаем 200, чтобы ЮKassa не ретраила бесконечно — платёж не наш
        return NextResponse.json({ ok: true, found: false })
      }

      // Проверка metadata.product (на случай если на этот webhook прилетит платёж от EF)
      if (payment.metadata?.product && payment.metadata.product !== 'faq') {
        console.log('[yookassa-webhook] payment is for', payment.metadata.product, '— skipping')
        return NextResponse.json({ ok: true, skipped: 'wrong_product' })
      }

      // Проверка суммы
      const expectedAmount = subscription.amount_paid
      const actualAmount = Math.round(parseFloat(payment.amount.value))
      if (expectedAmount !== actualAmount) {
        console.error('[yookassa-webhook] amount mismatch:', { expected: expectedAmount, actual: actualAmount })
        return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 })
      }

      // Идемпотентность: если уже active — просто 200
      if (subscription.status === 'active') {
        console.log('[yookassa-webhook] already active, idempotent ok')
        return NextResponse.json({ ok: true, already_active: true })
      }

      // Активируем подписку — триггер trg_grant_level_access автоматически
      // создаст записи в user_level_access для всех уровней A1-C2.
      const { error: updateErr } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ status: 'active' })
        .eq('id', subscription.id)

      if (updateErr) {
        console.error('[yookassa-webhook] update failed:', updateErr)
        return NextResponse.json({ error: 'db_update_failed' }, { status: 500 })
      }

      console.log('[yookassa-webhook] activated subscription', subscription.id, 'for user', subscription.user_id)

      return NextResponse.json({ ok: true, activated: true })
    }

    if (body.event === 'refund.succeeded') {
      const refund = body.object
      console.log('[yookassa-webhook] refund.succeeded received for payment:', refund?.payment_id, 'refund:', refund?.id)

      if (!refund?.payment_id) {
        return NextResponse.json({ error: 'no_payment_id' }, { status: 400 })
      }

      const { data: subscription, error: findErr } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, user_id, status')
        .eq('yookassa_payment_id', refund.payment_id)
        .maybeSingle()

      if (findErr) {
        console.error('[yookassa-webhook] refund: find subscription failed:', findErr)
        return NextResponse.json({ error: 'db_error' }, { status: 500 })
      }

      if (!subscription) {
        console.warn('[yookassa-webhook] refund: subscription not found for payment:', refund.payment_id)
        return NextResponse.json({ ok: true, found: false })
      }

      if (subscription.status === 'refunded') {
        return NextResponse.json({ ok: true, already_refunded: true })
      }

      const { error: updateErr } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ status: 'refunded' })
        .eq('id', subscription.id)
        .eq('status', 'pending')
      if (updateErr) {
        console.error('[yookassa-webhook] refund: update failed:', updateErr)
        return NextResponse.json({ error: 'db_update_failed' }, { status: 500 })
      }

      const { error: revokeErr } = await supabaseAdmin
        .from('user_level_access')
        .delete()
        .eq('user_id', subscription.user_id)

      if (revokeErr) {
        console.error('[yookassa-webhook] refund: failed to revoke access:', revokeErr)
      }

      console.log('[yookassa-webhook] refund processed for subscription', subscription.id, 'user', subscription.user_id)
      return NextResponse.json({ ok: true, refunded: true })
    }

    return NextResponse.json({ ok: true, ignored: body.event })
  } catch (e) {
    console.error('[yookassa-webhook] unexpected error:', e)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
