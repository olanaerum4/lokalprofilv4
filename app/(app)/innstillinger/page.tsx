'use client'
import { useEffect, useState } from 'react'
import { browserClient } from '@/lib/supabase'

export default function Innstillinger() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [link, setLink] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testMsg, setTestMsg] = useState('')
  const [userId, setUserId] = useState('')
  const sb = browserClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await sb.from('businesses').select('*').eq('id', user.id).single()
      if (data) { setName(data.name ?? ''); setPhone(data.phone ?? ''); setLink(data.google_review_link ?? '') }
    }
    load()
  }, [])

  async function save() {
    setSaving(true)
    await sb.from('businesses').update({ name, phone, google_review_link: link }).eq('id', userId)
    setSaved(true); setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  async function testSms() {
    if (!testPhone) return
    setTesting(true); setTestMsg('')
    const r = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testPhone, message: `Hei! Test-SMS fra LokalProfil for ${name}. Alt fungerer! 🎉` }),
    })
    const d = await r.json()
    setTestMsg(d.ok ? '✓ SMS sendt! Sjekk telefonen.' : '✗ Feil: ' + (d.error ?? 'Ukjent feil'))
    setTesting(false)
  }

  const sections = [
    { label: '24t påminnelse', text: `Hei [navn]! Påminnelse om din time hos ${name||'[bedrift]'} i morgen kl [tid]. Avbestilling? Ring oss direkte.` },
    { label: '2t påminnelse', text: `Hei [navn]! Din time hos ${name||'[bedrift]'} er om 2 timer (kl [tid]). Vi gleder oss til å se deg!` },
    { label: 'Tilbakemelding (1t etter)', text: `Hei [navn]! Takk for besøket hos ${name||'[bedrift]'} i dag 😊 Svar med: 1=Dårlig 2=OK 3=Bra 4=Veldig bra 5=Fantastisk` },
    { label: 'Svar 4–5 (positiv)', text: `Så glad du er fornøyd! 🌟 Legg igjen en anmeldelse her: ${link||'[google-lenke]'}` },
    { label: 'Svar 1–3 (negativ)', text: `Det er leit å høre! Vi ønsker å bli bedre. Hva kan vi gjøre annerledes? Svar på denne meldingen.` },
  ]

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Innstillinger</h1>
        <p className="text-gray-400 text-sm mt-1">Bedriftsinformasjon og SMS-oppsett</p>
      </div>

      <div className="space-y-4">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Bedriftsinformasjon</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Bedriftsnavn *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Hansens Frisørsalong" />
              <p className="text-xs text-gray-400 mt-1">Brukes i alle SMS-meldinger</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Telefonnummer</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+47 900 00 000" type="tel" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Google-anmeldelseslenke</label>
              <input className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="https://g.page/r/din-bedrift/review" type="url" />
              <p className="text-xs text-gray-400 mt-1">Sendes automatisk til kunder som gir 4–5 i karakter</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-2">Test SMS</h2>
          <p className="text-xs text-gray-400 mb-3">Verifiser at 46elks fungerer ved å sende en test-SMS</p>
          <div className="flex gap-2">
            <input className="input flex-1" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+47 900 00 000" type="tel" />
            <button onClick={testSms} disabled={testing || !testPhone} className="btn-secondary flex-shrink-0">
              {testing ? 'Sender...' : 'Send test'}
            </button>
          </div>
          {testMsg && (
            <div className={`mt-2 text-xs rounded-xl px-3 py-2.5 border ${testMsg.startsWith('✓') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              {testMsg}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">SMS-maler (forhåndsvisning)</h2>
          <div className="space-y-2">
            {sections.map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{s.label}</p>
                <p className="text-xs text-gray-600 font-mono leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {saved && <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 border border-green-100 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
          Lagret!
        </div>}

        <button onClick={save} disabled={saving} className="btn-primary w-full py-3">
          {saving ? 'Lagrer...' : 'Lagre endringer'}
        </button>
      </div>
    </div>
  )
}
