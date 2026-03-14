'use client'
import { useEffect, useState, useCallback } from 'react'
import { browserClient } from '@/lib/supabase'
import { Customer } from '@/lib/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('47') && digits.length === 10) return '+' + digits
  if (digits.length === 8) return '+47' + digits
  return digits
}

function isValidPhone(phone: string): boolean {
  return /^\+47[2-9]\d{7}$/.test(phone)
}

function fmtAppt(iso: string) {
  return new Date(iso).toLocaleString('nb-NO', {
    timeZone: 'Europe/Oslo',
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

// Store input as Oslo-local time → UTC
function toUTC(date: string, time: string): string {
  const str = `${date}T${time}`
  // Append Oslo offset (CET=+01, CEST=+02) by formatting a reference date
  const ref = new Date(str)
  const osloStr = ref.toLocaleString('sv-SE', { timeZone: 'Europe/Oslo' })
  const oslo = new Date(osloStr)
  const diff = ref.getTime() - oslo.getTime()
  return new Date(ref.getTime() - diff).toISOString()
}

const PAGE_SIZE = 20

// ─── Sub-components ───────────────────────────────────────────────────────────

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)
  if (confirm) return (
    <div className="flex gap-1 items-center">
      <button onClick={onDelete} className="text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-red-600 transition-colors">Slett</button>
      <button onClick={() => setConfirm(false)} className="text-xs text-gray-500 px-2.5 py-1.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors">Avbryt</button>
    </div>
  )
  return (
    <button onClick={() => setConfirm(true)} className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded" title="Slett kunde">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
    </button>
  )
}

function CRow({ c, upcoming, onDelete }: { c: Customer; upcoming: boolean; onDelete: (id: string) => void }) {
  return (
    <div className={`bg-white rounded-xl border p-3.5 flex items-center gap-3 ${upcoming ? 'border-gray-100' : 'border-gray-50'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${upcoming ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {c.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${!upcoming ? 'text-gray-500' : ''}`}>{c.name}</p>
        <p className="text-xs text-gray-400">{c.phone}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-xs font-mono font-semibold ${upcoming ? 'text-green-700' : 'text-gray-400'}`}>{fmtAppt(c.appointment_time)}</p>
        <div className="flex gap-1 justify-end mt-1">
          {c.reminded_24h && <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">24t</span>}
          {c.reminded_2h  && <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">2t</span>}
          {c.review_requested && <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">★</span>}
        </div>
      </div>
      <DeleteButton onDelete={() => onDelete(c.id)} />
    </div>
  )
}

function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-32" /><div className="h-2.5 bg-gray-100 rounded w-24" /></div>
      <div className="h-3 bg-gray-100 rounded w-20" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Kunder() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [bizId, setBizId] = useState('')
  const [page, setPage] = useState(0)
  const sb = browserClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    setBizId(user.id)
    const { data } = await sb.from('customers').select('*').eq('business_id', user.id).order('appointment_time', { ascending: false })
    setCustomers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function validatePhone(raw: string) {
    const n = normalizePhone(raw)
    setPhoneError(isValidPhone(n) ? '' : 'Ugyldig norsk nummer — bruk f.eks. 900 00 000')
  }

  async function addCustomer() {
    const normalized = normalizePhone(phone)
    if (!name || !normalized || !date || !time) return
    if (!isValidPhone(normalized)) { setPhoneError('Ugyldig norsk nummer'); return }

    const duplicate = customers.find(c => c.phone === normalized)
    if (duplicate && !window.confirm(`${duplicate.name} har allerede dette nummeret. Legg til allikevel?`)) return

    setSaving(true)
    const apt = toUTC(date, time)
    const { data, error } = await sb.from('customers').insert({ business_id: bizId, name, phone: normalized, appointment_time: apt }).select().single()
    if (!error && data) {
      setCustomers(prev => [data, ...prev])
      setName(''); setPhone(''); setDate(''); setTime('')
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  async function deleteCustomer(id: string) {
    await sb.from('customers').delete().eq('id', id)
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  const now = new Date()
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
  const upcoming = filtered.filter(c => new Date(c.appointment_time) >= now)
  const past     = filtered.filter(c => new Date(c.appointment_time) < now)
  const pastPage = past.slice(0, (page + 1) * PAGE_SIZE)
  const hasMore  = past.length > pastPage.length
  const today    = new Date().toISOString().split('T')[0]
  const normalized = normalizePhone(phone)

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kunder</h1>
        <p className="text-gray-400 text-sm mt-1">{customers.length} kunder totalt</p>
      </div>

      <div className="grid md:grid-cols-5 gap-5">
        {/* Add form */}
        <div className="md:col-span-2 card self-start sticky top-5">
          <h2 className="font-semibold text-gray-900 mb-4">Legg til kunde</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Navn</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ola Nordmann" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon</label>
              <input
                className={`input ${phoneError ? 'border-red-400 focus:ring-red-300' : ''}`}
                value={phone}
                onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                onBlur={e => validatePhone(e.target.value)}
                placeholder="900 00 000"
                type="tel"
              />
              {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
              {phone && !phoneError && normalized !== phone && isValidPhone(normalized) && (
                <p className="text-xs text-green-600 mt-1">Lagres som {normalized}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Dato</label>
              <input className="input" value={date} onChange={e => setDate(e.target.value)} type="date" min={today} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tidspunkt</label>
              <input className="input" value={time} onChange={e => setTime(e.target.value)} type="time" />
            </div>
            {success && (
              <div className="bg-green-50 text-green-700 text-xs rounded-xl px-3 py-2.5 border border-green-100 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                Kunde lagt til! SMS sendes automatisk.
              </div>
            )}
            <button onClick={addCustomer} disabled={saving || !name || !phone || !date || !time || !!phoneError} className="btn-primary w-full">
              {saving ? 'Lagrer...' : 'Legg til kunde'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">SMS sendes automatisk 24t og 2t før timen, og 1t etter.</p>
        </div>

        {/* List */}
        <div className="md:col-span-3 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input className="input pl-10" placeholder="Søk på navn eller telefon..." value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
          </div>

          {loading && [...Array(4)].map((_, i) => <Skeleton key={i} />)}

          {!loading && customers.length === 0 && (
            <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Ingen kunder ennå</p>
              <p className="text-xs text-gray-400 mt-1">Legg til din første kunde i skjemaet til venstre</p>
            </div>
          )}

          {!loading && customers.length > 0 && filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">Ingen kunder funnet for «{search}»</p>
          )}

          {!loading && upcoming.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Kommende ({upcoming.length})</p>
              {upcoming.map(c => <CRow key={c.id} c={c} upcoming onDelete={deleteCustomer} />)}
            </>
          )}

          {!loading && past.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-2">Tidligere ({past.length})</p>
              {pastPage.map(c => <CRow key={c.id} c={c} upcoming={false} onDelete={deleteCustomer} />)}
              {hasMore && (
                <button onClick={() => setPage(p => p + 1)} className="w-full text-xs font-semibold text-gray-500 hover:text-gray-700 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  Vis flere ({past.length - pastPage.length} til)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
