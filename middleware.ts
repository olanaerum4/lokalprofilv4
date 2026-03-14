import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = req.nextUrl.pathname
  const isAuth    = path.startsWith('/login') || path.startsWith('/register')
  const isApi     = path.startsWith('/api')
  const isBetaling = path.startsWith('/betaling')

  // Ikke innlogget → login
  if (!user && !isAuth && !isApi) return NextResponse.redirect(new URL('/login', req.url))

  // Innlogget på auth-sider → dashboard
  if (user && isAuth) return NextResponse.redirect(new URL('/dashboard', req.url))

  // Sjekk om kontoen er låst (bare for app-sider, ikke api/betaling)
  if (user && !isApi && !isBetaling) {
    const { data: biz } = await supabase
      .from('businesses')
      .select('is_active')
      .eq('id', user.id)
      .single()

    // Konto funnet og låst → redirect til betalingsside
    if (biz && biz.is_active === false) {
      return NextResponse.redirect(new URL('/betaling', req.url))
    }
  }

  return res
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
