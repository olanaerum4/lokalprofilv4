import { NextResponse } from 'next/server'
import { serverClient } from '@/lib/supabase-server'
import { sendSMS } from '@/lib/sms'

export async function POST(req: Request) {
  const sb = await serverClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })

  const { to, message } = await req.json()
  if (!to || !message) return NextResponse.json({ error: 'Mangler to eller message' }, { status: 400 })

  const ok = await sendSMS(to, message)
  if (ok) return NextResponse.json({ ok: true })
  return NextResponse.json({ error: 'SMS-sending feilet. Sjekk 46elks-nøklene.' }, { status: 500 })
}
