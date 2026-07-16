// 기도 앰비언트 오디오 래퍼.
// 웹뷰 전환 시 이 파일의 구현만 네이티브 브릿지(오디오 세션)로 교체한다 — bridge.ts와 동일한 대비.
const AUDIO_SRC = '/audio/prayer-ambient-v1.m4a';
const MUTED_KEY = 'ongi-audio-muted';
const FADE_MS = 1000;

interface PrayerAudio {
  play: () => void;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
}

let instance: PrayerAudio | null = null;

export function getPrayerAudio(): PrayerAudio {
  if (instance) return instance;

  let audio: HTMLAudioElement | null = null;
  let fadeFrame: number | null = null;
  let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
  let muted = false;

  try {
    muted = localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    // storage unavailable (private mode 등)
  }

  const ensureAudio = () => {
    if (!audio) {
      audio = new Audio(AUDIO_SRC);
      audio.loop = true;
      audio.preload = 'none';
    }
    return audio;
  };

  const cancelFade = () => {
    if (fadeFrame !== null) {
      cancelAnimationFrame(fadeFrame);
      fadeFrame = null;
    }
    if (fadeTimeout !== null) {
      clearTimeout(fadeTimeout);
      fadeTimeout = null;
    }
  };

  const isFading = () => fadeFrame !== null || fadeTimeout !== null;

  const setMediaSession = () => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'ON-GI',
      artist: '기도의 불',
      artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
  };

  instance = {
    play: () => {
      const el = ensureAudio();
      cancelFade();
      el.volume = muted ? 0 : 1;
      // 오디오는 부가 기능 — 자동재생 거부 등 실패해도 기도 플로우를 막지 않는다
      el.play().then(setMediaSession).catch(() => {});
    },
    stop: () => {
      if (!audio || audio.paused) return;
      const el = audio;
      cancelFade();
      const startVolume = el.volume;
      const t0 = performance.now();
      const finalize = () => {
        cancelFade();
        el.pause();
        el.currentTime = 0;
      };
      const fade = (now: number) => {
        const progress = Math.min((now - t0) / FADE_MS, 1);
        el.volume = startVolume * (1 - progress);
        if (progress < 1) {
          fadeFrame = requestAnimationFrame(fade);
        } else {
          finalize();
        }
      };
      fadeFrame = requestAnimationFrame(fade);
      // rAF는 탭이 백그라운드/가려짐 상태면 실행되지 않으므로,
      // 페이드와 무관하게 정지를 보장하는 백스톱 타이머를 함께 건다
      fadeTimeout = setTimeout(finalize, FADE_MS + 100);
    },
    setMuted: (value: boolean) => {
      muted = value;
      if (audio && !isFading()) audio.volume = muted ? 0 : 1;
      try {
        localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
      } catch {
        // storage unavailable
      }
    },
    isMuted: () => muted,
  };

  return instance;
}
