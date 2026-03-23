'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous-auth'

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
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}

export default function OnboardingPage() {
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
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(180deg, #08080F 0%, #0A0A12 100%)' }}
    >
      <Starfield />

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-sm">
        {/* Logo */}
        <h1
          className="text-4xl font-bold tracking-wider mb-10"
          style={{
            background: 'linear-gradient(135deg, #D4A44C 0%, #F5D98A 40%, #E8C35A 60%, #D4A44C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 12px rgba(212, 164, 76, 0.4))',
          }}
        >
          ON-GI
        </h1>

        {/* Description */}
        <p className="text-sm leading-relaxed mb-12" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          세상의 빛인 당신,
          <br />
          기도의 온기로 함께 어둠을 밝혀요
        </p>

        {/* Nickname input as inline Bible verse */}
        <div className="flex items-baseline justify-center flex-wrap gap-x-1 text-lg mb-2"
          style={{ color: 'rgba(255, 255, 255, 0.9)' }}
        >
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
            className="bg-transparent outline-none text-center text-lg"
            style={{
              borderBottom: '1.5px solid rgba(212, 164, 76, 0.6)',
              color: '#F5D98A',
              width: `${Math.max([...nickname].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 2 : 1), 0), 4)}ch`,
              maxWidth: '10rem',
              caretColor: '#F5D98A',
            }}
            autoFocus
          />
          <span>는 세상의 빛이라</span>
        </div>

        {/* Bible verse reference */}
        <p className="text-xs mb-14" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
          -마태복음 5:14
        </p>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading || !authReady}
          className="px-8 py-3 rounded-full text-sm font-medium transition-all duration-300"
          style={{
            border: isValid ? '1px solid rgba(212, 164, 76, 0.7)' : '1px solid rgba(255, 255, 255, 0.15)',
            color: isValid ? '#F5D98A' : 'rgba(255, 255, 255, 0.25)',
            background: isValid ? 'rgba(212, 164, 76, 0.1)' : 'transparent',
            boxShadow: isValid ? '0 0 16px rgba(212, 164, 76, 0.15)' : 'none',
            opacity: isValid && authReady ? 1 : 0.4,
            cursor: isValid && authReady && !loading ? 'pointer' : 'default',
          }}
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
          ) : (
            '함께하기'
          )}
        </button>
      </div>
    </div>
  )
}
