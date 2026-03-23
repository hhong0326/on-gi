'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MainPage() {
  const [nickname, setNickname] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setReady(true)
        return
      }

      const { data } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', user.id)
        .single()

      if (data && data.nickname !== '기도자') {
        setNickname(data.nickname)
      }
      setReady(true)
    }
    loadUser()
  }, [])

  if (!ready) return null

  if (!nickname) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center px-6"
        style={{ background: 'linear-gradient(180deg, #08080F 0%, #0A0A12 100%)' }}
      >
        <p className="text-sm text-center leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
          초대 링크를 통해 입장해주세요
        </p>
      </div>
    )
  }

  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{ background: 'linear-gradient(180deg, #08080F 0%, #0A0A12 100%)' }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-safe-top"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
      >
        <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          {nickname && `${nickname}님`}
        </span>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          <span style={{ color: '#D4A44C', fontSize: '8px' }}>●</span>
          <span>지금 기도하는 사람들</span>
          <span style={{ color: '#F5D98A' }}>0</span>
        </div>
      </header>

      {/* Globe placeholder */}
      <main className="flex-1 flex items-center justify-center">
        <p className="text-lg" style={{ color: 'rgba(255, 255, 255, 0.15)' }}>
          지구본 자리
        </p>
      </main>

      {/* CTA button */}
      <div className="flex justify-center pb-6">
        <button
          disabled
          className="px-8 py-3 rounded-full text-sm font-medium"
          style={{
            border: '1px solid rgba(212, 164, 76, 0.4)',
            color: 'rgba(245, 217, 138, 0.5)',
            background: 'rgba(212, 164, 76, 0.05)',
            cursor: 'default',
          }}
        >
          지금 함께 기도하기
        </button>
      </div>

      {/* Tab bar */}
      <nav
        className="flex items-center justify-around border-t py-2"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.08)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        }}
      >
        <TabItem icon="🌍" label="기도 지구본" active />
        <TabItem icon="📖" label="기도 기록" />
        <TabItem icon="⚙️" label="설정" />
      </nav>
    </div>
  )
}

function TabItem({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
  return (
    <button
      className="flex flex-col items-center gap-0.5 text-xs"
      style={{
        color: active ? '#F5D98A' : 'rgba(255, 255, 255, 0.3)',
      }}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
