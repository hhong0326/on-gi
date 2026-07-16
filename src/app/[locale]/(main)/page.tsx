'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

import { usePrayerState, type ViewTab } from '@/hooks/usePrayerState';
import { getPrayerAudio } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import { PrayerOverlay } from '@/components/ui/PrayerOverlay';
import { HistoryView } from '@/components/ui/HistoryView';
import { PrayerCompleteModal } from '@/components/ui/PrayerCompleteModal';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { EasterEggModal } from '@/components/ui/EasterEggModal';

const MapboxView = dynamic(
  () => import('@/components/mapbox/MapboxView').then((m) => m.MapboxView),
  { ssr: false }
);

export default function MainPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const state = usePrayerState('home');
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [completedDuration, setCompletedDuration] = useState<number | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [spinAvailable, setSpinAvailable] = useState(true);
  const resumeSpinRef = useRef<(() => void) | null>(null);

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
      getPrayerAudio().stop();
      // Capture elapsed before state resets
      const elapsed = state.elapsedSeconds;
      await state.handleTogglePrayer();
      if (elapsed > 0) setCompletedDuration(elapsed);
      return;
    }
    // 사용자 제스처 콜스택 안에서(await 이전) 재생해야 iOS 자동재생 정책을 통과한다
    getPrayerAudio().play();
    await state.handleTogglePrayer();
  };

  // 어떤 경로로든 기도가 끝나면 음악도 반드시 멈춘다 (버튼 핸들러의 stop은 즉시성용, 이건 상태 기반 보장)
  useEffect(() => {
    if (!state.isPraying) getPrayerAudio().stop();
  }, [state.isPraying]);

  useEffect(() => {
    return () => getPrayerAudio().stop();
  }, []);

  useEffect(() => {
    if (state.ready && !state.nickname) {
      router.push('/onboarding');
    }
  }, [state.ready, state.nickname, router]);

  // Render map immediately so the Mapbox chunk/WebGL/tiles load in parallel
  // with Supabase auth + data queries; only overlay UI waits for readiness.
  const uiReady = state.ready && !!state.nickname;

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: '#08080F' }}>
      <div className="absolute inset-0 z-0">
        <MapboxView
          points={state.points}
          isPraying={state.isPraying}
          userPosition={state.userPosition}
          onEasterEggClick={() => setShowEasterEgg(true)}
          onSpinAvailableChange={setSpinAvailable}
          resumeSpinRef={resumeSpinRef}
        />
      </div>

      {showSettings && (
        <div className="absolute bottom-28 left-1/2 z-30 w-80 -translate-x-1/2 rounded-2xl bg-[#12121F] p-4">
          <p className="mb-3 text-xs font-medium text-white/70">{t('account')}</p>

            {/* Nickname */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-white/70">{t('nickname')}</span>
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
                    {nicknameSaving ? '...' : t('save')}
                  </button>
                  <button onClick={() => setEditingNickname(false)} className="rounded bg-white/10 px-2 py-1 text-xs text-white/60">
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setNewNickname(state.nickname ?? ''); setEditingNickname(true); }}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60"
                >
                  {state.nickname}{tc('nicknameSuffix')} ✏️
                </button>
              )}
            </div>

            {/* Invite link share */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-white/70">{t('invite')}</span>
              <button onClick={handleShareInvite} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                {copied ? t('inviteCopied') : t('inviteCopy')}
              </button>
            </div>


          {/* Language */}
          <div className="mb-3 border-t border-white/10 pt-3">
            <p className="mb-1 text-xs font-medium text-white/70">{t('language')}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">{t('appLanguage')}</span>
              <LanguageSelector variant="inline" />
            </div>
          </div>

          {/* Privacy notice */}
          <div className="mb-3 border-t border-white/10 pt-3">
            <p className="mb-1 text-xs font-medium text-white/70">{t('privacy')}</p>
            <p className="text-xs leading-relaxed text-white/30">
              {t('privacyNotice')}
            </p>
          </div>

          <button
            onClick={() => setShowSettings(false)}
            className="w-full rounded-lg bg-white/10 py-2 text-xs text-white/60"
          >
            {t('close')}
          </button>
        </div>
      )}

      {showHistory && (
        <HistoryView onClose={() => setShowHistory(false)} />
      )}

      {showEasterEgg && (
        <EasterEggModal onClose={() => setShowEasterEgg(false)} />
      )}

      {completedDuration !== null && (
        <PrayerCompleteModal
          durationSeconds={completedDuration}
          onClose={() => setCompletedDuration(null)}
        />
      )}

      {uiReady && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <PrayerOverlay
            prayerCount={state.points.filter((p) => p.isActive).length}
            isPraying={state.isPraying}
            elapsedSeconds={state.elapsedSeconds}
            onTogglePrayer={handleTogglePrayer}
            activeTab={showHistory ? 'history' : state.activeTab}
            onTabChange={handleTabChange}
            nickname={state.nickname}
            showSpinButton={spinAvailable}
            onSpinClick={() => resumeSpinRef.current?.()}
          />
        </div>
      )}
    </div>
  );
}
