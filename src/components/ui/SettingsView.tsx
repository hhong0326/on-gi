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
    // HistoryView와 동일 프레임 — bottom-[92px]로 하단 탭바 상시 노출
    <div className="absolute inset-x-0 top-0 bottom-[92px] z-40 flex flex-col bg-[#08080F]">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-14 pb-4">
        <h2 className="text-lg font-bold text-white">{t('title')}</h2>
        <button onClick={onClose} className="text-sm text-white/50">{t('close')}</button>
      </header>

      <div className="flex-1 overflow-y-auto px-5">
        {/* Account */}
        <div className="mb-4 rounded-xl bg-white/5 p-4">
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
                onClick={() => { setNewNickname(nickname ?? ''); setEditingNickname(true); }}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60"
              >
                {nickname}{tc('nicknameSuffix')}
              </button>
            )}
          </div>

          {/* Invite link share */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70">{t('invite')}</span>
            <button onClick={handleShareInvite} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
              {copied ? t('inviteCopied') : t('inviteCopy')}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="mb-4 rounded-xl bg-white/5 p-4">
          <p className="mb-3 text-xs font-medium text-white/70">{t('language')}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70">{t('appLanguage')}</span>
            <LanguageSelector variant="inline" />
          </div>
        </div>

        {/* Privacy notice */}
        <div className="mb-4 rounded-xl bg-white/5 p-4">
          <p className="mb-1 text-xs font-medium text-white/70">{t('privacy')}</p>
          <p className="text-xs leading-relaxed text-white/30">
            {t('privacyNotice')}
          </p>
        </div>
      </div>
    </div>
  );
}
