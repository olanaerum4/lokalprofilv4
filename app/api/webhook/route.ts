import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase-server'
import { sendSMS, sms, normalizePhone } from '@/lib/sms'

export async function POST(req: Request) {
  const ct = req.headers.get('content-type') ?? ''
  let from = '', message = ''

  if (ct.includes('application/x-www-form-urlencoded')) {
    const p = new URLSearchParams(await req.text())
    from = p.get('from') ?? ''; message = p.get('message') ?? ''
  } else {
    const b = await req.json().catch(() => ({}))
    from = b.from ?? ''; message = b.message ?? ''
  }

  if (!from || !message) return NextResponse.json({ ok: false })

  const normalizedFrom = normalizePhone(from)
  const sb = adminClient()
  const text = message.trim()

  // ─── Find the RIGHT customer ─────────────────────────────────────────────
  // Strategy: telefonnummer + tidspunkt
  //   1. Finn alle kunder med dette nummeret
  //   2. Blant dem: velg den som senest fikk review_requested=true (= svarer riktig bedrift)
  //   3. Fallback: siste time uansett

  const { data: allMatches } = await sb.from('customers')
    .select('*, businesses(id, name, google_review_link)')
    .in('phone', [normalizedFrom, from])
    .order('appointment_time', { ascending: false })

  if (!allMatches || allMatches.length === 0) return NextResponse.json({ ok: true })

  // Prioriter kunden som faktisk fikk tilbakemeldingsmelding sendt (review_requested=true)
  // og der timen er nærmest nå (men ikke for langt tilbake — maks 48t siden)
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const reviewRequested = allMatches.filter(c =>
    c.review_requested === true && c.appointment_time > cutoff
  )

  // Blant de som fikk review-SMS: velg den med nyligste time
  const customer = reviewRequested.length > 0
    ? reviewRequested[0]           // allerede sortert på appointment_time DESC
    : allMatches[0]                // fallback: siste time uansett

  const biz = customer.businesses as any
  const rating = parseInt(text)

  // ─── Lagre innkommende melding ────────────────────────────────────────────
  await sb.from('messages').insert({
    business_id: biz.id,
    customer_id: customer.id,
    direction: 'in',
    body: text,
  })

  // ─── Håndter karakter (1–5) ───────────────────────────────────────────────
  if (!isNaN(rating) && rating >= 1 && rating <= 5) {
    // Sjekk om vi allerede har mottatt tilbakemelding for denne timen
    // (knytt til appointment_time-vinduet, ikke bare customer_id)
    const { data: existing } = await sb.from('feedback')
      .select('id')
      .eq('customer_id', customer.id)
      .gte('created_at', cutoff)   // bare tilbakemeldinger siste 48t
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!existing) {
      await sb.from('feedback').insert({
        customer_id: customer.id,
        business_id: biz.id,
        rating,
      })

      const replyMsg = rating >= 4
        ? (biz.google_review_link
            ? sms.positive(biz.google_review_link)
            : `Så glad du er fornøyd! 🌟 Takk for at du valgte ${biz.name}!`)
        : sms.negative()

      await sendSMS(normalizedFrom, replyMsg)
      await sb.from('messages').insert({
        business_id: biz.id,
        customer_id: customer.id,
        direction: 'out',
        body: replyMsg,
      })
    }

    return NextResponse.json({ ok: true, action: 'rating' })
  }

  // ─── Håndter oppfølgingstekst etter negativ karakter ─────────────────────
  const { data: fb } = await sb.from('feedback')
    .select('id, rating, message')
    .eq('customer_id', customer.id)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (fb && fb.rating <= 3 && !fb.message) {
    await sb.from('feedback').update({ message: text }).eq('id', fb.id)
  }

  return NextResponse.json({ ok: true })
}

export async function GET() { return NextResponse.json({ ok: true }) }
