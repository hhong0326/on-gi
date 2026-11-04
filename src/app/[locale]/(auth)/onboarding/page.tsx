'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous-auth'
import { LanguageSelector } from '@/components/ui/LanguageSelector'

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const stars: { x: number; y: number; r: number; opacity: number; speed: number }[] = []

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function initStars() {
      stars.length = 0
      const count = Math.floor((canvas!.width * canvas!.height) / 4000)
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          r: Math.random() * 1.2 + 0.3,
          opacity: Math.random() * 0.6 + 0.2,
          speed: Math.random() * 0.005 + 0.002,
        })
      }
    }

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const now = Date.now()
      for (const star of stars) {
        const flicker = Math.sin(now * star.speed) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 240, ${star.opacity * flicker})`
        ctx.fill()
      }

      animationId = requestAnimationFrame(draw)
    }

    resize()
    initStars()
    draw()

    window.addEventListener('resize', () => {
      resize()
      initStars()
    })

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  )
}

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function init() {
      const session = await ensureAnonymousSession()
      if (!session) return

      // Already onboarded → go to main
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', session.user.id)
        .single()

      if (data && data.nickname !== '기도자') {
        router.replace('/')
        return
      }

      setAuthReady(true)
    }
    init()
  }, [router])

  const handleSubmit = useCallback(async () => {
    const trimmed = nickname.trim()
    if (!trimmed || loading || !authReady) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user session')

      const { error } = await supabase
        .from('users')
        .update({ nickname: trimmed })
        .eq('id', user.id)

      if (error) throw error
      router.push('/')
    } catch (err) {
      console.error('Failed to update nickname:', err)
      setLoading(false)
    }
  }, [nickname, loading, authReady, router])

  const isValid = nickname.trim().length >= 1

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center bg-night px-6">
      <Starfield />

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 drop-shadow-glow">
          <Image src="/logo-en-lg.svg" alt="ON-GI" width={113} height={40} priority />
        </div>

        {/* Description */}
        <p className="text-base text-ivory/70 mb-12">
          {t('tagline1')}
          <br />
          {t('tagline2')}
        </p>

        {/* Nickname input as inline Bible verse */}
        <div className="flex items-baseline justify-center flex-wrap gap-x-1 text-lg text-ivory mb-2">
          <input
            ref={inputRef}
            type="text"
            value={nickname}
            onChange={(e) => {
              if ([...e.target.value].length <= 10) setNickname(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
            className="max-w-40 border-b-2 border-gold/60 bg-transparent text-center text-lg text-gold-light caret-gold-light outline-none transition-colors duration-300 ease-weighted focus:border-gold"
            // 입력 길이에 따라 실시간으로 늘어나는 폭 — 동적 값이라 style 유지
            style={{
              width: `${Math.max([...nickname].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 2 : 1), 0), 4)}ch`,
            }}
            autoFocus
          />
          <span>{t('verse')}</span>
        </div>

        {/* Bible verse reference */}
        <p className="text-xs text-ivory/30 mb-16">
          {t('verseRef')}
        </p>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading || !authReady}
          className={`h-12 rounded-full border px-8 text-base font-semibold transition-[background-color,border-color,color,opacity,transform] duration-300 ease-weighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 active:scale-[0.98] disabled:cursor-default ${
            isValid
              ? 'border-gold/60 bg-gold/10 text-gold-light hover:bg-gold/15'
              : 'border-gold/15 text-ivory/30'
          } ${isValid && authReady ? 'opacity-100' : 'opacity-40'}`}
        >
          <span className={loading ? 'animate-pulse' : undefined}>{t('join')}</span>
        </button>
      </div>

      {/* Language selector */}
      <div className="absolute bottom-8 z-10">
        <LanguageSelector />
      </div>
    </div>
  )
}
