'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { createClient } from '../../utils/supabase/client'
import { safeInternalRedirect } from '@/lib/auth/safeRedirect'
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy'
import { formatCpf, formatPhone, getLocalToday, isValidCpf, isValidPhone, onlyDigits } from '@/lib/auth/customerRegistration'
import { Modal, ModalHeader, ModalBody, Input, Button, Checkbox } from '@/components/ui'

type AuthMode = 'login' | 'signup'

export function AuthModal() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginOpen = searchParams.get('login') === 'true'
  const redirectTo = safeInternalRedirect(searchParams.get('redirectTo'))
  const requestedMode: AuthMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'

  const [mode, setMode] = useState<AuthMode>(requestedMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [whatsappSamePhone, setWhatsappSamePhone] = useState(true)
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    setMode(requestedMode)
  }, [requestedMode])

  const closeModal = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('login')
    params.delete('mode')
    const newUrl = pathname + (params.toString() ? `?${params.toString()}` : '')
    router.replace(newUrl, { scroll: false })
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
    setNotice(null)
    const params = new URLSearchParams(searchParams)
    params.set('login', 'true')
    params.set('mode', nextMode)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleEmailLogin = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    try {
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Tempo esgotado. Verifique sua conexão e tente novamente.')), 15000)
      })

      const { error: loginError } = await Promise.race([
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        timeout,
      ])

      if (loginError) {
        setError(loginError.message)
        return
      }

      closeModal()
      router.replace(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar agora.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    const passwordError = getPasswordPolicyError(password)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    if (password !== passwordConfirmation) {
      setError('A confirmação da senha não confere.')
      setLoading(false)
      return
    }

    if (!isValidCpf(cpf)) {
      setError('Informe um CPF válido.')
      setLoading(false)
      return
    }

    if (!isValidPhone(phone)) {
      setError('Informe um telefone válido com DDD.')
      setLoading(false)
      return
    }

    const resolvedWhatsapp = whatsappSamePhone ? phone : whatsapp
    if (!isValidPhone(resolvedWhatsapp)) {
      setError('Informe um WhatsApp válido com DDD.')
      setLoading(false)
      return
    }

    if (birthDate && birthDate > getLocalToday()) {
      setError('A data de aniversário não pode estar no futuro.')
      setLoading(false)
      return
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nome_completo: name.trim(),
            cpf: onlyDigits(cpf),
            telefone: onlyDigits(phone),
            whatsapp: onlyDigits(resolvedWhatsapp),
            whatsapp_mesmo_telefone: whatsappSamePhone,
            data_nascimento: birthDate || null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (!data.session) {
        setNotice('Cadastro criado. Verifique seu e-mail para confirmar a conta e continuar.')
        return
      }

      closeModal()
      router.replace(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o cadastro agora.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setLoading(true)
    setError(null)
    setNotice(null)

    if (!email.trim()) {
      setError('Informe seu e-mail para receber o link de redefinição.')
      setLoading(false)
      return
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/recuperar-senha`,
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setNotice('Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível solicitar a redefinição agora.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })

    if (oauthError) setError(oauthError.message)
  }

  return (
    <Modal isOpen={isLoginOpen} onClose={closeModal}>
      <ModalHeader title={mode === 'signup' ? 'Criar cadastro no Allvino' : 'Entrar no Allvino'} onClose={closeModal} />
      <ModalBody>
        <div className="mb-5 flex rounded-xl bg-stone-100 p-1 text-sm font-bold">
          <button type="button" onClick={() => switchMode('login')} className={`flex-1 rounded-lg px-3 py-2 ${mode === 'login' ? 'bg-white text-black shadow-sm' : 'text-stone-500'}`}>
            Entrar
          </button>
          <button type="button" onClick={() => switchMode('signup')} className={`flex-1 rounded-lg px-3 py-2 ${mode === 'signup' ? 'bg-white text-black shadow-sm' : 'text-stone-500'}`}>
            Criar cadastro
          </button>
        </div>

        <form onSubmit={mode === 'signup' ? handleEmailSignUp : handleEmailLogin} className="space-y-4">
          {mode === 'signup' && (
            <Input id="signup-name" label="Nome completo" type="text" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} autoComplete="name" placeholder="Seu nome" />
          )}

          <Input id="auth-email" label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="seu@email.com" />

          {mode === 'signup' && (
            <>
              <Input id="signup-cpf" label="CPF" type="text" inputMode="numeric" value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} required maxLength={14} autoComplete="off" placeholder="000.000.000-00" />
              <Input id="signup-phone" label="Telefone" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} required autoComplete="tel" placeholder="(00) 00000-0000" />
              <Checkbox
                id="signup-whatsapp-same-phone"
                label="Meu WhatsApp é o mesmo número"
                description="Desmarque para informar outro contato."
                checked={whatsappSamePhone}
                onChange={(event) => setWhatsappSamePhone(event.target.checked)}
              />
              {!whatsappSamePhone && (
                <Input id="signup-whatsapp" label="WhatsApp" type="tel" inputMode="tel" value={whatsapp} onChange={(event) => setWhatsapp(formatPhone(event.target.value))} required autoComplete="tel" placeholder="(00) 00000-0000" />
              )}
            </>
          )}

          <Input id="auth-password" label={mode === 'signup' ? 'Criar senha' : 'Senha'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="Mínimo de 8 caracteres" />

          {mode === 'signup' && (
            <>
              <Input id="signup-password-confirmation" label="Confirmar senha" type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required minLength={8} autoComplete="new-password" placeholder="Repita sua senha" />
              <Input id="signup-birth-date" label="Data de aniversário (opcional)" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} max={getLocalToday()} autoComplete="bday" />
            </>
          )}

          {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}
          {notice && <p role="status" className="text-center text-sm font-bold text-emerald-700">{notice}</p>}

          <Button type="submit" disabled={loading} loading={loading} className="w-full">
            {loading ? 'Aguarde...' : mode === 'signup' ? 'Criar cadastro' : 'Entrar'}
          </Button>
        </form>

        {mode === 'login' && (
          <button type="button" onClick={handlePasswordReset} disabled={loading} className="mt-4 w-full text-center text-sm font-bold text-stone-500 underline hover:text-black">
            Esqueci minha senha
          </button>
        )}

        {mode === 'login' && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
              <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-gray-500">Ou continue com</span></div>
            </div>

            <Button variant="secondary" onClick={handleGoogleLogin} className="mt-6 w-full">
              Google
            </Button>
          </div>
        )}
      </ModalBody>
    </Modal>
  )
}
