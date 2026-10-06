import { NextResponse } from 'next/server'
import { createBffAuthClient } from '@/utils/supabase/bff-server'
import { safeInternalRedirect } from '@/lib/auth/safeRedirect'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeInternalRedirect(searchParams.get('next'))

  if (code) {
    const supabase = await createBffAuthClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/?error=auth-callback-failed`)
}
