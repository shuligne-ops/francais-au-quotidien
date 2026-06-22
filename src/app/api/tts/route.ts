import { NextRequest } from 'next/server'

const SPEAKER_RE =
  /\*{0,2}(Camille|L[eé]o|In[eè]s|Mathieu|Chlo[eé]|Youssef|[EÉ]milie|Antoine|Nadia|Julien|Margot|Hugo|Lucie|Th[eé]o|Awa|Romain|Sofie|Marie)\*{0,2}\s*:\s*/i

// Удаляет только разметку/русский/мусор, НЕ трогая имена и границы реплик.
function stripMarkup(text: string): string {
  let t = text
  t = t.replace(/#{1,6}\s*/g, '')
  t = t.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
  t = t.replace(/`([^`]+)`/g, '$1')
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // Русский в скобках — пояснения, не озвучиваем
  t = t.replace(/\([^)]*[\u0400-\u04FF][^)]*\)/g, '')
  // Отдельные русские предложения
  t = t.replace(/[\u0400-\u04FF][\u0400-\u04FF\s,.!?;:'"()-]*[.!?\n]/g, '')
  // Остатки кириллицы
  t = t.replace(/[\u0400-\u04FF]+/g, '')
  // Спецсимволы, КРОМЕ двоеточия (нужно для распознавания реплик) и переносов строк
  t = t.replace(/[*#_~`>|]/g, '')
  return t
}

// Режет реплику на синтез-куски по предложениям, чтобы не превышать maxLen.
function chunkLine(line: string, maxLen: number): string[] {
  if (line.length <= maxLen) return [line]
  const chunks: string[] = []
  let remaining = line
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) { chunks.push(remaining); break }
    let cut = remaining.lastIndexOf('. ', maxLen)
    if (cut < maxLen * 0.3) cut = remaining.lastIndexOf('? ', maxLen)
    if (cut < maxLen * 0.3) cut = remaining.lastIndexOf('! ', maxLen)
    if (cut < maxLen * 0.3) cut = remaining.lastIndexOf(', ', maxLen)
    if (cut < maxLen * 0.3) cut = maxLen
    chunks.push(remaining.substring(0, cut + 1).trim())
    remaining = remaining.substring(cut + 1).trim()
  }
  return chunks.filter(c => c.length > 0)
}

// Разбивает текст на реплики (по сменам говорящего) и снимает имена.
// Возвращает массив реплик; каждая реплика — отдельная «сцена» для синтеза.
function splitIntoLines(text: string, maxLen: number): string[] {
  // Делим по строкам и группируем по началу новой реплики (**Имя :**)
  const rawLines = text.split('\n')
  const lines: string[] = []
  let current = ''

  const flush = () => {
    const cleaned = current.replace(SPEAKER_RE, '').trim()
    if (cleaned.length > 0) lines.push(...chunkLine(cleaned, maxLen))
    current = ''
  }

  for (const raw of rawLines) {
    const line = raw.trim()
    if (!line) continue
    if (SPEAKER_RE.test(line)) {
      // Новая реплика — закрываем предыдущую
      flush()
      current = line
    } else {
      // Продолжение текущей реплики
      current += (current ? ' ' : '') + line
    }
  }
  flush()

  // Если ни одной реплики не распозналось (не диалог, а обычный текст) —
  // обрабатываем как единый блок.
  if (lines.length === 0) {
    const plain = text.replace(/\s{2,}/g, ' ').trim()
    return chunkLine(plain, maxLen)
  }
  return lines
}

async function genChunk(text: string, voiceId: string, apiKey: string): Promise<ArrayBuffer> {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        // stability 0.35 — больше эмоциональной вариативности и темпа (0.5 = «диктор»)
        // style 0.4 — усиливает экспрессивность исходного голоса
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.75,
          style: 0.4,
          use_speaker_boost: true,
        },
      }),
    }
  )
  if (!r.ok) throw new Error('TTS chunk failed')
  return r.arrayBuffer()
}

// Короткая mp3-пауза (тишина) между репликами, чтобы слышалась смена говорящего.
// ~280 мс тишины в формате mp3_22050_32, заранее закодированная.
function silenceBuffer(): ArrayBuffer {
  // Минимальный валидный mp3-фрейм тишины, повторённый.
  const frame = new Uint8Array([
    0xff, 0xe3, 0x18, 0xc4, 0x00, 0x00, 0x00, 0x03, 0x48, 0x00, 0x00, 0x00,
    0x00, 0x4c, 0x41, 0x4d, 0x45, 0x33, 0x2e, 0x31, 0x30, 0x30, 0x55, 0x55,
    0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55,
  ])
  const repeats = 24
  const out = new Uint8Array(frame.length * repeats)
  for (let i = 0; i < repeats; i++) out.set(frame, i * frame.length)
  return out.buffer
}

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text) return new Response('No text', { status: 400 })

  const stripped = stripMarkup(text)
  const lines = splitIntoLines(stripped, 700)
  if (lines.length === 0) return new Response('Too short', { status: 400 })

  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'Da9VfudgKUvFOKayCiue'
  const apiKey = process.env.ELEVENLABS_API_KEY!

  try {
    const buffers = await Promise.all(lines.map(c => genChunk(c, voiceId, apiKey)))
    const pause = silenceBuffer()

    // Склеиваем реплики с паузой между ними (пауза только между, не после последней).
    const parts: ArrayBuffer[] = []
    buffers.forEach((b, i) => {
      parts.push(b)
      if (i < buffers.length - 1 && lines.length > 1) parts.push(pause)
    })

    const total = parts.reduce((s, b) => s + b.byteLength, 0)
    const combined = new Uint8Array(total)
    let off = 0
    for (const b of parts) { combined.set(new Uint8Array(b), off); off += b.byteLength }
    return new Response(combined.buffer, { headers: { 'Content-Type': 'audio/mpeg' } })
  } catch (err) {
    console.error('TTS error:', err)
    return new Response('TTS Error', { status: 500 })
  }
}
