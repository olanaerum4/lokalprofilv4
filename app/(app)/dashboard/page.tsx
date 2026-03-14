'use client'
import { useEffect, useState } from 'react'
import { browserClient } from '@/lib/supabase'
import Link from 'next/link'

type Biz = { name: string; google_review_link: string | null }
type Customer = { id: string; name: string; phone: string; appointment_time: string }
type Feedback = { id: string; rating: number; message: string | null; customers: { name: string } | null }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit' })
}

function StatSkeleton() {
  return <div className="card animate-pulse"><div className="h-3 bg-gray-100 rounded w-24 mb-2" /><div className="h-7 bg-gray-100 rounded w-12" /></div>
}

function CardSkeleton() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-4 bg-gray-100 rounded w-32" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <div className="w-2 h-2 rounded-full bg-gray-100 flex-shrink-0" />
          <div className="flex-1 h-3 bg-gray-100 rounded" />
          <div className="w-10 h-3 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [biz, setBiz] = useState<Biz | null>(null)
  const [todayC, setTodayC] = useState<Customer[]>([])
  const [totalC, setTotalC] = useState(0)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const sb = browserClient()

  async function load() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return

    // Hent businesses-rad — opprett den hvis den mangler (safety net)
    let { data: bizData } = await sb.from('businesses').select('*').eq('id', user.id).single()
    if (!bizData) {
      const { data: created } = await sb.from('businesses')
        .insert({ id: user.id, email: user.email, name: user.email?.split('@')[0] ?? 'Min bedrift' })
        .select().single()
      bizData = created
    }
    setBiz(bizData)

    const nowOslo = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' }))
    const todayStart = new Date(nowOslo); todayStart.setHours(0, 0, 0, 0)
    const todayEnd   = new Date(nowOslo); todayEnd.setHours(23, 59, 59, 999)

    const [{ data: tc }, { count }, { data: fb }] = await Promise.all([
      sb.from('customers').select('*').eq('business_id', user.id)
        .gte('appointment_time', todayStart.toISOString())
        .lte('appointment_time', todayEnd.toISOString())
        .order('appointment_time'),
      sb.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', user.id),
      sb.from('feedback').select('*, customers(name)').eq('business_id', user.id)
        .order('created_at', { ascending: false }).limit(5),
    ])

    setTodayC(tc ?? [])
    setTotalC(count ?? 0)
    setFeedback(fb ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = sb.channel('dashboard-feedback')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, () => load())
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [])

  const now = new Date()
  const avg = feedback.length
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
    : null
  const nowOslo = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' }))
  const dateStr = nowOslo.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {loading ? 'Laster...' : `Hei, ${biz?.name ?? 'der'} 👋`}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{dateStr}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loading ? [...Array(4)].map((_, i) => <StatSkeleton key={i} />) : (
          [
            { label: 'Timer i dag',      value: todayC.length },
            { label: 'Totale kunder',    value: totalC },
            { label: 'Tilbakemeldinger', value: feedback.length },
            { label: 'Snittkarakter',    value: avg ? `${avg} ★` : '–' },
          ].map(s => (
            <div key={s.label} className="card">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? <CardSkeleton /> : (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Timer i dag</h2>
              <Link href="/kunder" className="text-xs text-green-600 font-semibold">+ Legg til</Link>
            </div>
            {!todayC.length ? (
              <div className="text-center py-10">
                <p className="text-sm text-gray-400">Ingen timer i dag</p>
                <Link href="/kunder" className="text-xs text-green-600 font-semibold mt-2 inline-block">Legg til kunde →</Link>
              </div>
            ) : todayC.map(c => {
              const isPast = new Date(c.appointment_time) < now
              return (
                <div key={c.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 mb-2 ${isPast ? 'bg-gray-50' : 'bg-green-50'}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isPast ? 'bg-gray-300' : 'bg-green-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isPast ? 'text-gray-400' : ''}`}>{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  <span className={`text-xs font-mono font-semibold ${isPast ? 'text-gray-400' : 'text-green-700'}`}>
                    {fmtTime(c.appointment_time)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {loading ? <CardSkeleton /> : (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Siste tilbakemeldinger</h2>
              <Link href="/tilbakemeldinger" className="text-xs text-green-600 font-semibold">Se alle</Link>
            </div>
            {!feedback.length ? (
              <div className="text-center py-10">
                <p className="text-sm text-gray-400">Ingen tilbakemeldinger ennå</p>
                <p className="text-xs text-gray-300 mt-1">Sendes automatisk 1t etter timen</p>
              </div>
            ) : feedback.map(f => (
              <div key={f.id} className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                  {f.customers?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{f.customers?.name}</span>
                    <span className="text-xs text-amber-500">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                  </div>
                  {f.message && <p className="text-xs text-gray-400 truncate">{f.message}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && !biz?.google_review_link && (
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-amber-500 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Legg til Google-anmeldelseslenke</p>
            <p className="text-xs text-amber-600">Sendes automatisk til fornøyde kunder.</p>
          </div>
          <Link href="/innstillinger" className="text-sm font-semibold text-amber-700 hover:underline">Sett opp →</Link>
        </div>
      )}
    </div>
  )
}
