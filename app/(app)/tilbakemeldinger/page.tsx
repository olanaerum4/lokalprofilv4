'use client'
import { useEffect, useState } from 'react'
import { browserClient } from '@/lib/supabase'

type FB = {
  id: string; rating: number; message: string | null; created_at: string
  customers: { name: string; phone: string } | null
}

const ratingLabel: Record<number, string> = { 1: 'Dårlig', 2: 'OK', 3: 'Bra', 4: 'Veldig bra', 5: 'Fantastisk' }
const ratingColor: Record<number, string> = {
  1: 'bg-red-50 text-red-600 border-red-100',
  2: 'bg-orange-50 text-orange-600 border-orange-100',
  3: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  4: 'bg-green-50 text-green-700 border-green-100',
  5: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-100 rounded w-40" />
          <div className="h-3 bg-gray-100 rounded w-24" />
          <div className="h-8 bg-gray-100 rounded w-full mt-2" />
        </div>
      </div>
    </div>
  )
}

export default function Tilbakemeldinger() {
  const [feedback, setFeedback] = useState<FB[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'alle' | 'positive' | 'negative'>('alle')
  const sb = browserClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('feedback')
        .select('*, customers(name, phone)')
        .eq('business_id', user.id)
        .order('created_at', { ascending: false })
      setFeedback((data as FB[]) ?? [])
      setLoading(false)
    }
    load()

    // Realtime subscription for new feedback
    const channel = sb.channel('feedback-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, async (payload) => {
        // Fetch with customer join
        const { data } = await sb.from('feedback').select('*, customers(name, phone)').eq('id', payload.new.id).single()
        if (data) setFeedback(prev => [data as FB, ...prev])
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [])

  const shown = feedback.filter(f =>
    filter === 'positive' ? f.rating >= 4 :
    filter === 'negative' ? f.rating <= 3 : true
  )
  const avg = feedback.length
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
    : null
  const dist = [5, 4, 3, 2, 1].map(r => ({ r, n: feedback.filter(f => f.rating === r).length }))
  const maxDist = Math.max(...dist.map(d => d.n), 1)

  // CSV export
  function exportCSV() {
    const rows = [['Navn', 'Telefon', 'Karakter', 'Melding', 'Dato']]
    feedback.forEach(f => {
      rows.push([
        f.customers?.name ?? '',
        f.customers?.phone ?? '',
        String(f.rating),
        f.message ?? '',
        new Date(f.created_at).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' }),
      ])
    })
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'tilbakemeldinger.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tilbakemeldinger</h1>
          <p className="text-gray-400 text-sm mt-1">Svar fra kunder via SMS</p>
        </div>
        {feedback.length > 0 && (
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Eksporter CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} />)}</div>
      ) : feedback.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
          </div>
          <p className="text-sm font-medium text-gray-500">Ingen tilbakemeldinger ennå</p>
          <p className="text-xs text-gray-400 mt-1">Tilbakemeldinger sendes automatisk 1 time etter timen</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="card"><p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Totalt</p><p className="text-2xl font-bold text-gray-900">{feedback.length}</p></div>
            <div className="card"><p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Snitt</p><p className="text-2xl font-bold text-gray-900">{avg} <span className="text-amber-400">★</span></p></div>
            <div className="card">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Fordeling</p>
              {dist.map(d => (
                <div key={d.r} className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] text-gray-400 w-2">{d.r}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-amber-400 h-1.5 rounded-full transition-all" style={{ width: `${(d.n / maxDist) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-3 text-right">{d.n}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-5">
            {(['alle', 'positive', 'negative'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                {f === 'alle' ? `Alle (${feedback.length})` : f === 'positive' ? `★ Positive (${feedback.filter(x => x.rating >= 4).length})` : `⚠ Negative (${feedback.filter(x => x.rating <= 3).length})`}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Ingen {filter === 'positive' ? 'positive' : 'negative'} tilbakemeldinger</p>
          ) : (
            <div className="space-y-3">
              {shown.map(f => (
                <div key={f.id} className={`bg-white rounded-2xl border p-4 ${f.rating <= 3 ? 'border-red-100' : 'border-gray-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                      {f.customers?.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-gray-900">{f.customers?.name ?? 'Ukjent'}</span>
                        <span className="text-xs text-gray-400">{f.customers?.phone}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ratingColor[f.rating]}`}>
                          {f.rating} – {ratingLabel[f.rating]}
                        </span>
                      </div>
                      <div className="text-amber-400 text-sm mb-2">
                        {'★'.repeat(f.rating)}<span className="text-gray-200">{'★'.repeat(5 - f.rating)}</span>
                      </div>
                      {f.message && (
                        <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-600 border border-gray-100">
                          "{f.message}"
                        </div>
                      )}
                      <p className="text-xs text-gray-300 mt-2">
                        {new Date(f.created_at).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
