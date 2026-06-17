'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { usePrayerState, type ViewTab } from '@/hooks/usePrayerState';
import { createClient } from '@/lib/supabase/client';
import { PrayerOverlay } from '@/components/ui/PrayerOverlay';
import { HistoryView } from '@/components/ui/HistoryView';
import { PrayerCompleteModal } from '@/components/ui/PrayerCompleteModal';

const MapboxView = dynamic(
  () => import('@/components/mapbox/MapboxView').then((m) => m.MapboxView),
  { ssr: false }
);

function InviteCodeEntry() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError('');
    router.push(`/?code=${trimmed}`);
  };

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-6"
      style={{ background: '#08080F' }}
    >
      <p className="mb-6 text-center text-sm text-white/40">
        초대 코드를 입력해주세요
      </p>
      <div className="flex w-full max-w-xs gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder=""
          className="flex-1 rounded-lg bg-white/10 px-4 py-3 text-center text-sm text-white outline-none placeholder:text-white/20"
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={!code.trim()}
          className={`rounded-lg px-4 py-3 text-sm font-medium transition-all ${
            code.trim()
              ? 'bg-amber-500/90 text-white'
              : 'bg-white/5 text-white/20'
          }`}
        >
          입장
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function MainPage() {
  const state = usePrayerState('home');
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [completedDuration, setCompletedDuration] = useState<number | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleNicknameUpdate = async () => {
    const trimmed = newNickname.trim();
    if (!trimmed || trimmed.length > 10 || nicknameSaving) return;
    setNicknameSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('users').update({ nickname: trimmed }).eq('id', user.id);
      state.setNickname(trimmed);
    }
    setNicknameSaving(false);
    setEditingNickname(false);
  };

  const handleShareInvite = async () => {
    const url = `${window.location.origin}?code=ONGI2026`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const handleTabChange = (tab: ViewTab) => {
    if (tab === 'settings') {
      setShowSettings((v) => !v);
      setShowHistory(false);
    } else if (tab === 'history') {
      setShowHistory(true);
      setShowSettings(false);
    } else {
      setShowHistory(false);
      setShowSettings(false);
      state.setActiveTab(tab);
    }
  };

  const handleTogglePrayer = async () => {
    if (state.isPraying) {
      // Capture elapsed before state resets
      const elapsed = state.elapsedSeconds;
      await state.handleTogglePrayer();
      if (elapsed > 0) setCompletedDuration(elapsed);
      return;
    }
    await state.handleTogglePrayer();
  };

  if (!state.ready) return null;

  if (!state.nickname) {
    return <InviteCodeEntry />;
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: '#08080F' }}>
      <div className="absolute inset-0">
        <MapboxView
          points={state.points}
          isPraying={state.isPraying}
          userPosition={state.userPosition}
        />
      </div>

      {showSettings && (
        <div className="absolute bottom-28 left-1/2 z-30 w-80 -translate-x-1/2 rounded-2xl bg-black/80 p-4 backdrop-blur-md">
          <p className="mb-3 text-xs font-medium text-white/70">👤 계정</p>

            {/* Nickname */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-white/70">닉네임</span>
              {editingNickname ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => { if ([...e.target.value].length <= 10) setNewNickname(e.target.value); }}
                    className="w-24 rounded bg-white/10 px-2 py-1 text-xs text-white outline-none"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNicknameUpdate(); }}
                  />
                  <button onClick={handleNicknameUpdate} className="rounded bg-amber-500 px-2 py-1 text-xs text-white" disabled={nicknameSaving}>
                    {nicknameSaving ? '...' : '저장'}
                  </button>
                  <button onClick={() => setEditingNickname(false)} className="rounded bg-white/10 px-2 py-1 text-xs text-white/60">
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setNewNickname(state.nickname ?? ''); setEditingNickname(true); }}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60"
                >
                  {state.nickname}님 ✏️
                </button>
              )}
            </div>

            {/* Invite link share */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-white/70">초대 링크</span>
              <button onClick={handleShareInvite} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                {copied ? '✅ 복사됨' : '📋 복사하기'}
              </button>
            </div>


          {/* Privacy notice */}
          <div className="mb-3 border-t border-white/10 pt-3">
            <p className="mb-1 text-xs font-medium text-white/70">🔒 프라이버시</p>
            <p className="text-xs leading-relaxed text-white/30">
              위치 정보는 약 10km 단위로 대략화되어 저장됩니다. 정확한 위치는 수집하지 않습니다.
            </p>
          </div>

          <button
            onClick={() => setShowSettings(false)}
            className="w-full rounded-lg bg-white/10 py-2 text-xs text-white/60"
          >
            닫기
          </button>
        </div>
      )}

      {showHistory && (
        <HistoryView onClose={() => setShowHistory(false)} />
      )}

      {completedDuration !== null && (
        <PrayerCompleteModal
          durationSeconds={completedDuration}
          onClose={() => setCompletedDuration(null)}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <PrayerOverlay
          prayerCount={state.points.filter((p) => p.isActive).length}
          isPraying={state.isPraying}
          elapsedSeconds={state.elapsedSeconds}
          onTogglePrayer={handleTogglePrayer}
          activeTab={showHistory ? 'history' : state.activeTab}
          onTabChange={handleTabChange}
          nickname={state.nickname}
        />
      </div>
    </div>
  );
}
