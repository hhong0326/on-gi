'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CaretRight, MagnifyingGlass } from '@phosphor-icons/react';

import { getCurrentPosition } from '@/lib/bridge';
import {
  churchArtSrc,
  createChurch,
  distanceParts,
  findSimilarChurches,
  levelProgress,
  searchChurches,
  setMyChurch,
  type ChurchSummary,
  type MyChurch,
} from '@/lib/church';
import { formatDuration, type DurationUnits } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { LogoPulse } from '@/components/ui/LogoPulse';

// mapbox-gl은 브라우저 전용 — 세우기 화면에 들어갈 때만 불러온다
const ChurchPinMap = dynamic(
  () => import('@/components/church/ChurchPinMap').then((m) => m.ChurchPinMap),
  { ssr: false, loading: () => <div className="h-56 rounded-2xl border border-gold/15 bg-gold/5" /> },
);

type Mode = 'mine' | 'search' | 'create';

interface LevelText {
  name: string;
  about: string;
  verse: string;
  ref: string;
}

interface ChurchViewProps {
  church: MyChurch | null;
  onChurchChanged: () => Promise<void>;
  onClose: () => void;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60';
const CHIP = `rounded-full bg-gold/10 px-3 py-2 text-xs text-ivory/70 transition-colors duration-300 ease-weighted hover:bg-gold/15 ${FOCUS}`;
const PRIMARY = `h-12 w-full rounded-full bg-gold text-base font-semibold text-night transition-[opacity,transform] duration-300 ease-weighted active:scale-[0.98] disabled:opacity-40 ${FOCUS}`;

export function ChurchView({ church, onChurchChanged, onClose }: ChurchViewProps) {
  const t = useTranslations('church');
  const th = useTranslations('history');
  const levels = t.raw('levels') as LevelText[];
  const units: DurationUnits = { seconds: th('seconds'), minutes: th('minutes'), hours: th('hours') };

  const [mode, setMode] = useState<Mode>(church ? 'mine' : 'search');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  // 거리순 정렬·지도 중심용 현재 위치 (저장하지 않음)
  useEffect(() => {
    let cancelled = false;
    getCurrentPosition().then((pos) => {
      if (!cancelled) setPosition(pos);
    });
    return () => { cancelled = true; };
  }, []);

  const levelName = (level: number) => levels[Math.min(Math.max(level, 1), levels.length) - 1]?.name ?? '';
  const distanceText = (km: number | null) => {
    if (km === null) return null;
    const { unit, n } = distanceParts(km);
    return t(unit, { n });
  };

  const handleJoin = async (id: string) => {
    await setMyChurch(createClient(), id);
    await onChurchChanged();
    setMode('mine');
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-night">
      <header className="flex items-center justify-between px-6 pt-16 pb-4">
        <div className="flex items-center gap-2">
          {mode === 'create' && (
            <button onClick={() => setMode('search')} aria-label={t('back')} className={`-ml-2 rounded-full p-2 text-ivory/70 ${FOCUS}`}>
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-lg font-semibold text-ivory">
            {mode === 'mine' ? t('title') : mode === 'search' ? t('findTitle') : t('createTitle')}
          </h2>
        </div>
        <button
          onClick={mode === 'search' && church ? () => setMode('mine') : onClose}
          className={`rounded-full px-3 py-2 text-sm text-ivory/45 transition-colors duration-300 ease-weighted hover:text-ivory ${FOCUS}`}
        >
          {mode === 'search' && church ? t('cancel') : t('close')}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {mode === 'mine' && church && (
          <MineSection
            church={church}
            level={levels[church.level - 1]}
            nextName={church.nextLevelSeconds !== null ? levelName(church.level + 1) : null}
            units={units}
            onChange={() => setMode('search')}
          />
        )}
        {mode === 'search' && (
          <SearchSection
            position={position}
            currentChurchId={church?.id ?? null}
            levelName={levelName}
            distanceText={distanceText}
            onJoin={handleJoin}
            onCreate={() => setMode('create')}
          />
        )}
        {mode === 'create' && (
          <CreateSection
            position={position}
            distanceText={distanceText}
            onJoin={handleJoin}
            onCreated={async () => {
              await onChurchChanged();
              setMode('mine');
            }}
          />
        )}
      </div>
    </div>
  );
}

function MineSection({
  church,
  level,
  nextName,
  units,
  onChange,
}: {
  church: MyChurch;
  level: LevelText | undefined;
  nextName: string | null;
  units: DurationUnits;
  onChange: () => void;
}) {
  const t = useTranslations('church');
  const progress = levelProgress(church);
  const remaining = church.nextLevelSeconds !== null ? church.nextLevelSeconds - church.totalSeconds : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <Image
          src={churchArtSrc(church.level)}
          alt={level?.name ?? ''}
          width={240}
          height={180}
          unoptimized
          className="h-auto w-60 drop-shadow-glow"
        />
        <p className="text-xs font-semibold text-gold">{t('levelLabel', { level: church.level, name: level?.name ?? '' })}</p>
        <h3 className="text-2xl font-semibold text-ivory">{church.name}</h3>
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-2 overflow-hidden rounded-full bg-gold/15">
          <div
            className="h-full origin-left rounded-full bg-gold transition-transform duration-500 ease-weighted"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
        <p className="text-sm text-ivory/70">
          {nextName
            ? <>{t('next', { name: nextName })} · <span className="tabular-nums">{t('remaining', { time: formatDuration(Math.max(remaining, 0), units) })}</span></>
            : t('maxReached')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gold/10 bg-gold/5 p-4">
          <p className="text-2xl font-semibold tabular-nums text-gold-light">{t('members', { count: church.membersThisWeek })}</p>
          <p className="text-xs text-ivory/45">{t('membersWeek')}</p>
        </div>
        <div className="rounded-2xl border border-gold/10 bg-gold/5 p-4">
          <p className="text-2xl font-semibold tabular-nums text-gold-light">{formatDuration(church.warmthSeconds, units)}</p>
          <p className="text-xs text-ivory/45">{t('warmth')}</p>
        </div>
      </div>

      {level && (
        <div className="rounded-2xl border border-gold/10 p-4">
          <p className="text-sm text-ivory/70">{level.about}</p>
          <p className="mt-3 text-sm font-medium text-gold-light">{level.verse}</p>
          <p className="mt-1 text-xs text-ivory/30">{level.ref}</p>
        </div>
      )}

      <button onClick={onChange} className={`self-center ${CHIP}`}>{t('change')}</button>
    </div>
  );
}

function SearchSection({
  position,
  currentChurchId,
  levelName,
  distanceText,
  onJoin,
  onCreate,
}: {
  position: { lat: number; lng: number } | null;
  currentChurchId: string | null;
  levelName: (level: number) => string;
  distanceText: (km: number | null) => string | null;
  onJoin: (id: string) => Promise<void>;
  onCreate: () => void;
}) {
  const t = useTranslations('church');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChurchSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // 입력이 멈추고 300ms 뒤 검색 (위치가 잡히면 거리순으로 다시)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      searchChurches(createClient(), query, position)
        .then((rows) => { if (!cancelled) { setResults(rows); setFailed(false); } })
        .catch(() => { if (!cancelled) setFailed(true); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, position]);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 rounded-full border border-gold/30 px-4 py-3 focus-within:border-gold/60">
        <MagnifyingGlass size={16} className="text-gold" />
        <input
          id="church-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchLabel')}
          aria-label={t('searchLabel')}
          className="w-full bg-transparent text-sm text-ivory caret-gold-light outline-none placeholder:text-ivory/30"
        />
      </label>
      <p className="text-xs text-ivory/30">{t('nearby')}</p>

      {failed && <p className="text-sm text-gold-light">{t('loadFailed')}</p>}
      {!failed && results === null && <div className="flex justify-center pt-8"><LogoPulse /></div>}
      {results !== null && results.length === 0 && <p className="pt-4 text-center text-sm text-ivory/45">{t('empty')}</p>}

      {results?.map((c) => {
        const isMine = c.id === currentChurchId;
        const distance = distanceText(c.distanceKm);
        return (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-gold/10 bg-gold/5 px-4 py-3">
            <Image src={churchArtSrc(c.level)} alt="" width={48} height={36} unoptimized className="h-9 w-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ivory">{c.name}</p>
              <p className="text-xs text-ivory/45">{levelName(c.level)}{distance ? ` · ${distance}` : ''}</p>
            </div>
            {isMine ? (
              <span className="shrink-0 rounded-full bg-gold px-3 py-2 text-xs font-semibold text-night">{t('mine')}</span>
            ) : (
              <button
                onClick={async () => { setJoiningId(c.id); try { await onJoin(c.id); } catch { setFailed(true); } finally { setJoiningId(null); } }}
                disabled={joiningId !== null}
                className={`shrink-0 ${CHIP} font-semibold text-gold-light disabled:opacity-40`}
              >
                <span className={joiningId === c.id ? 'animate-pulse' : undefined}>{t('setMine')}</span>
              </button>
            )}
          </div>
        );
      })}

      <button onClick={onCreate} className={`mt-2 flex items-center justify-center gap-1 rounded-full py-3 text-sm text-gold ${FOCUS}`}>
        {t('noneHint')} <span className="font-semibold">{t('createLink')}</span> <CaretRight size={14} />
      </button>
    </div>
  );
}

function CreateSection({
  position,
  distanceText,
  onJoin,
  onCreated,
}: {
  position: { lat: number; lng: number } | null;
  distanceText: (km: number | null) => string | null;
  onJoin: (id: string) => Promise<void>;
  onCreated: () => Promise<void>;
}) {
  const t = useTranslations('church');
  const [name, setName] = useState('');
  const [similar, setSimilar] = useState<{ id: string; name: string; distanceKm: number } | null>(null);
  const [warnedFor, setWarnedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const centerRef = useRef<{ lat: number; lng: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError(t('nameRequired')); return; }
    const pin = centerRef.current ?? position;
    if (!pin || submitting) return;

    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    try {
      // 같은 이름+위치로 처음 누를 땐 근처 중복을 먼저 안내, 한 번 더 누르면 그대로 세운다
      const key = `${trimmed}|${pin.lat.toFixed(3)}|${pin.lng.toFixed(3)}`;
      if (warnedFor !== key) {
        const found = await findSimilarChurches(supabase, trimmed, pin);
        if (found.length > 0) {
          setSimilar(found[0]);
          setWarnedFor(key);
          return;
        }
      }
      const result = await createChurch(supabase, trimmed, pin);
      if ('error' in result) {
        setError(result.error === 'daily_limit' ? t('dailyLimit') : t('createFailed'));
        return;
      }
      await onCreated();
    } catch {
      setError(t('createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {position ? <ChurchPinMap center={position} centerRef={centerRef} /> : <div className="h-56 rounded-2xl border border-gold/15 bg-gold/5" />}
      <p className="text-xs text-ivory/45">{t('mapHint')}</p>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-ivory/45">{t('nameLabel')}</span>
        <input
          id="church-name"
          type="text"
          value={name}
          maxLength={40}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          className="border-b-2 border-gold/60 bg-transparent py-2 text-base text-gold-light caret-gold-light outline-none transition-colors duration-300 ease-weighted focus:border-gold"
        />
      </label>

      {similar && warnedFor && (
        <div className="flex flex-col gap-2 rounded-2xl border border-gold-light/30 bg-gold-light/5 p-4">
          <p className="text-sm text-gold-light">{t('similar', { name: similar.name, distance: distanceText(similar.distanceKm) ?? '' })}</p>
          <p className="text-xs text-ivory/45">{t('similarHint')}</p>
          <button type="button" onClick={() => onJoin(similar.id).catch(() => setError(t('createFailed')))} className={`self-start ${CHIP} font-semibold text-gold-light`}>{t('joinSimilar')}</button>
        </div>
      )}

      {error && <p className="text-sm text-gold-light" role="alert">{error}</p>}

      <button type="submit" disabled={submitting || !position} className={PRIMARY}>
        <span className={submitting ? 'animate-pulse' : undefined}>{t('createCta')}</span>
      </button>
    </form>
  );
}
