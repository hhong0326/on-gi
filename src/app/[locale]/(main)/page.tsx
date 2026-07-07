'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

import { usePrayerState, type ViewTab } from '@/hooks/usePrayerState';
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
      // Capture elapsed before state resets
      const elapsed = state.elapsedSeconds;
      await state.handleTogglePrayer();
      if (elapsed > 0) setCompletedDuration(elapsed);
      return;
    }
    await state.handleTogglePrayer();
  };

  useEffect(() => {
    if (state.ready && !state.nickname) {
      router.push('/onboarding');
    }
  }, [state.ready, state.nickname, router]);

  if (!state.ready || !state.nickname) return null;

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: '#08080F' }}>
      <div className="absolute inset-0">
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
        <div className="absolute bottom-28 left-1/2 z-30 w-80 -translate-x-1/2 rounded-2xl bg-black/80 p-4 backdrop-blur-md">
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
    </div>
  );
}
