import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type Plan = 'monthly' | 'yearly' | 'yearly_launch'

const PRICES: Record<Plan, { amount: number; description: string; durationDays: number }> = {
  monthly: { amount: 890, description: 'Подписка на курс «Français au Quotidien», месяц', durationDays: 30 },
  yearly: { amount: 7990, description: 'Подписка на курс «Français au Quotidien», год', durationDays: 365 },
  yearly_launch: { amount: 4990, description: 'Подписка на курс «Français au Quotidien», год (старт-оффер)', durationDays: 365 },
}

const LAUNCH_LIMIT = 50

export async function POST(req: NextRequest) {
  try {
    const { plan } = (await req.json()) as { plan: Plan }

    if (!plan || !PRICES[plan]) {
      return NextResponse.json({ error: 'invalid_plan' }, { status: 400 })
    }

    // Получаем юзера из Authorization header
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )

    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

    // Service role клиент для записи в БД (мимо RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Если выбран старт-оффер — проверяем что лимит не исчерпан
    if (plan === 'yearly_launch') {
      const { count } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('plan', 'yearly_launch')
        .eq('status', 'active')

      if (typeof count === 'number' && count >= LAUNCH_LIMIT) {
        return NextResponse.json({ error: 'launch_offer_sold_out' }, { status: 400 })
      }
    }

    const price = PRICES[plan]
    const expiresAt = new Date(Date.now() + price.durationDays * 24 * 60 * 60 * 1000).toISOString()

    // Создаём pending-подписку
    const { data: subscription, error: subErr } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan,
        status: 'pending',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        amount_paid: price.amount,
        currency: 'RUB',
      })
      .select()
      .single()

    if (subErr || !subscription) {
      console.error('[checkout] failed to create subscription:', subErr)
      return NextResponse.json({ error: 'db_error' }, { status: 500 })
    }

    // Создаём платёж в ЮKassa
    const shopId = process.env.YOOKASSA_SHOP_ID
    const secretKey = process.env.YOOKASSA_SECRET_KEY
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://francais-au-quotidien.ru'

    if (!shopId || !secretKey) {
      console.error('[checkout] YOOKASSA_SHOP_ID or YOOKASSA_SECRET_KEY missing')
      return NextResponse.json({ error: 'payment_provider_not_configured' }, { status: 500 })
    }

    const idempotenceKey = crypto.randomUUID()
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64')

    const yookassaPayload = {
      amount: { value: price.amount.toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: `${baseUrl}/payment/success`,
      },
      description: price.description,
      metadata: {
        product: 'faq',
        subscription_id: String(subscription.id),
        user_id: user.id,
        plan,
      },
      receipt: {
        customer: { email: user.email },
        items: [{
          description: price.description,
          quantity: '1.00',
          amount: { value: price.amount.toFixed(2), currency: 'RUB' },
          vat_code: 1, // НДС не облагается (для самозанятых)
          payment_mode: 'full_payment',
          payment_subject: 'service',
        }],
      },
    }

    const yookassaRes = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify(yookassaPayload),
    })

    if (!yookassaRes.ok) {
      const errText = await yookassaRes.text()
      console.error('[checkout] YooKassa error:', yookassaRes.status, errText)
      return NextResponse.json({ error: 'yookassa_error' }, { status: 500 })
    }

    const payment = await yookassaRes.json()

    // Сохраняем payment_id в подписке для последующего сопоставления в webhook
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ yookassa_payment_id: payment.id })
      .eq('id', subscription.id)

    return NextResponse.json({
      confirmation_url: payment.confirmation.confirmation_url,
      payment_id: payment.id,
    })
  } catch (e) {
    console.error('[checkout] unexpected error:', e)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
