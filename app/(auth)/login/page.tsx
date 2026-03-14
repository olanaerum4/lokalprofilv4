'use client'
import { useState } from 'react'
import { browserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit() {
    setLoading(true); setError('')
    const { error } = await browserClient().auth.signInWithPassword({ email, password })
    if (error) setError('Feil e-post eller passord')
    else { router.push('/dashboard'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
            </div>
            <span className="text-xl font-bold text-gray-900">LokalProfil</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Logg inn</h1>
          <p className="text-gray-500 text-sm mt-1">Velkommen tilbake</p>
        </div>
        <div className="card">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-post</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@bedrift.no" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Passord</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" className="input" />
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100">{error}</div>}
            <button onClick={submit} disabled={loading} className="btn-primary w-full">
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </div>
          <p className="text-center text-sm text-gray-500 mt-5">
            Ingen konto? <Link href="/register" className="text-green-600 font-semibold hover:underline">Registrer deg</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
