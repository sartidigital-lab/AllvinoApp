'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '../../utils/supabase/client'
import { Modal, ModalHeader, ModalBody, Input, Button, IconButton } from '@/components/ui'

export function AuthModal() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginOpen = searchParams.get('login') === 'true'
  const redirectTo = searchParams.get('redirectTo') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const closeModal = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('login')
    const newUrl = pathname + (params.toString() ? `?${params.toString()}` : '')
    router.replace(newUrl, { scroll: false })
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Tempo esgotado. Verifique sua conexão e tente novamente.')), 15000)
      })

      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        timeout,
      ])

      if (error) {
        setError(error.message)
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

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) {
      setError(error.message)
    }
  }

  return (
    <Modal isOpen={isLoginOpen} onClose={closeModal}>
      <ModalHeader title="Entrar no Allvino" onClose={closeModal} />
      <ModalBody>
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Ou continue com</span>
            </div>
          </div>

          <div className="mt-6">
            <Button
              variant="secondary"
              onClick={handleGoogleLogin}
              className="w-full"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  )
}
