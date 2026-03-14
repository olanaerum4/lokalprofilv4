import { redirect } from 'next/navigation'
import { serverClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await serverClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: biz } = await sb.from('businesses').select('name').eq('id', user.id).single()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar bizName={biz?.name ?? user.email!} />
      <main className="flex-1 md:ml-56 pb-20 md:pb-0 min-w-0">
        {children}
      </main>
    </div>
  )
}
