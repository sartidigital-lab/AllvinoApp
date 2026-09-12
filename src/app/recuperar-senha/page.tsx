'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy'

export default function RecuperarSenhaPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkRecoverySession = async () => {
      const { data } = await supabase.auth.getSession()
      setReady(Boolean(data.session))
      setCheckingSession(false)
    }

    checkRecoverySession()
  }, [supabase.auth])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    const passwordError = getPasswordPolicyError(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmation) {
      setError('A confirmação da senha não confere.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setMessage('Senha atualizada com sucesso. Você já pode continuar usando sua conta.')
    setPassword('')
    setConfirmation('')
  }

  if (checkingSession) {
    return <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6"><p className="font-bold text-stone-500">Validando link de recuperação...</p></main>
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-3xl font-bold">Link inválido ou expirado</h1>
        <p className="text-sm font-bold text-stone-500">Solicite um novo link de redefinição para continuar.</p>
        <Link href="/?login=true" className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white">Voltar para entrar</Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-serif text-3xl font-bold">Redefinir senha</h1>
      <p className="mt-2 text-sm font-bold text-stone-500">Escolha uma nova senha para sua conta Allvino.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-3xl border border-stone-100 bg-white p-6 shadow-sm">
        <label className="block text-sm font-bold">Nova senha<input className="mt-2 w-full rounded-xl border border-stone-200 p-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
        <label className="block text-sm font-bold">Confirmar nova senha<input className="mt-2 w-full rounded-xl border border-stone-200 p-3" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required /></label>
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        {message && <p className="text-sm font-bold text-emerald-700">{message}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-black px-4 py-3 font-bold text-white disabled:opacity-50">{loading ? 'Atualizando...' : 'Atualizar senha'}</button>
      </form>

      <button type="button" onClick={() => router.push('/')} className="mt-5 text-sm font-bold text-stone-500 underline">Voltar ao início</button>
    </main>
  )
}
