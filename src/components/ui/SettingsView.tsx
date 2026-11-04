'use client';

import { useState } from 'react';
import {useTranslations} from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

interface SettingsViewProps {
  nickname: string | null;
  onNicknameSaved: (nickname: string) => void;
  onClose: () => void;
}

export function SettingsView({ nickname, onNicknameSaved, onClose }: SettingsViewProps) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
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
      onNicknameSaved(trimmed);
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

  return (
    // HistoryView와 동일 프레임 — 전체 화면 + 스크롤 영역 pb-24로 플로팅 탭바 공간 확보
    <div className="absolute inset-0 z-30 flex flex-col bg-night">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-16 pb-4">
        <h2 className="text-lg font-semibold text-ivory">{t('title')}</h2>
        <button onClick={onClose} className="rounded-full px-3 py-2 text-sm text-ivory/45 transition-colors duration-300 ease-weighted hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60">{t('close')}</button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {/* Account */}
        <div className="mb-4 rounded-2xl border border-gold/10 bg-gold/5 p-4">
          <p className="mb-3 text-xs font-semibold text-gold">{t('account')}</p>

          {/* Nickname */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-ivory/70">{t('nickname')}</span>
            {editingNickname ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => { if ([...e.target.value].length <= 10) setNewNickname(e.target.value); }}
                  className="w-24 rounded-full border border-gold/30 bg-night px-3 py-2 text-xs text-ivory caret-gold-light outline-none focus-visible:border-gold/60"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNicknameUpdate(); }}
                />
                <button onClick={handleNicknameUpdate} className="rounded-full bg-gold px-3 py-2 text-xs font-semibold text-night transition-opacity duration-300 ease-weighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 active:scale-[0.98] disabled:opacity-40" disabled={nicknameSaving}>
                  <span className={nicknameSaving ? 'animate-pulse' : undefined}>{t('save')}</span>
                </button>
                <button onClick={() => setEditingNickname(false)} className="rounded-full bg-gold/10 px-3 py-2 text-xs text-ivory/70 transition-colors duration-300 ease-weighted hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60">
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setNewNickname(nickname ?? ''); setEditingNickname(true); }}
                className="rounded-full bg-gold/10 px-3 py-2 text-xs text-ivory/70 transition-colors duration-300 ease-weighted hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                {nickname}{tc('nicknameSuffix')}
              </button>
            )}
          </div>

          {/* Invite link share */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-ivory/70">{t('invite')}</span>
            <button onClick={handleShareInvite} className="rounded-full bg-gold/10 px-3 py-2 text-xs text-ivory/70 transition-colors duration-300 ease-weighted hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60">
              {copied ? t('inviteCopied') : t('inviteCopy')}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="mb-4 rounded-2xl border border-gold/10 bg-gold/5 p-4">
          <p className="mb-3 text-xs font-semibold text-gold">{t('language')}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ivory/70">{t('appLanguage')}</span>
            <LanguageSelector variant="inline" />
          </div>
        </div>

        {/* Privacy notice */}
        <div className="mb-4 rounded-2xl border border-gold/10 bg-gold/5 p-4">
          <p className="mb-1 text-xs font-semibold text-gold">{t('privacy')}</p>
          <p className="text-xs text-ivory/45">
            {t('privacyNotice')}
          </p>
        </div>
      </div>
    </div>
  );
}
