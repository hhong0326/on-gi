import { formatRelativeTime } from '@/lib/format';

export interface TooltipLabels {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  prayedAt: string; // "{time}에 기도" / "Prayed {time}"
}

interface PrayerLightOptions {
  weight: number;
  isUser: boolean;
  isActive: boolean;
  lat: number;
  lng: number;
  prayedAt?: string;
  context?: 'globe' | 'map';
  tooltipLabels?: TooltipLabels;
}

export function createPrayerLightElement({ weight, isUser, isActive, prayedAt, context = 'globe', tooltipLabels }: PrayerLightOptions): HTMLElement {
  const el = document.createElement('div');
  const tappable = !isActive && !!prayedAt;
  el.style.cssText = `position:relative; transform:translate(-50%,-50%); pointer-events:${tappable ? 'auto' : 'none'}; ${tappable ? 'cursor:pointer;' : ''}`;

  const clamped = Math.min(weight, 8);

  // Globe needs bigger elements (viewed from far), Map needs smaller
  let coreSize: number;
  let glowSize: number;
  let bloomSize: number;

  if (context === 'globe') {
    coreSize = isUser ? 16 : 10 + (clamped / 8) * 8;
    glowSize = coreSize * 5;
    bloomSize = coreSize * 10;
  } else {
    coreSize = isUser ? 6 : 3 + (clamped / 8) * 3;
    glowSize = coreSize * 3;
    bloomSize = coreSize * 6;
  }

  // Use SVG as center image, CSS for glow layers
  const isActiveLight = isActive;
  const svgCore = isActiveLight ? '/기도의빛_중심.svg' : '/잔상_중심.svg';

  const twinkleDuration = 2 + Math.random() * 4;
  const twinkleDelay = Math.random() * -6;
  const anim = isActiveLight
    ? `animation: twinkle ${twinkleDuration}s ease-in-out ${twinkleDelay}s infinite;`
    : '';
  const dimOpacity = isActiveLight ? '' : `opacity: ${0.4 + (clamped / 8) * 0.3};`;

  // Outer bloom (CSS radial gradient)
  const bloomColor = isActiveLight ? '#FFE164' : '#AA8833';
  const bloom = document.createElement('div');
  bloom.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:${bloomSize}px; height:${bloomSize}px;
    border-radius:50%;
    background: radial-gradient(circle, ${bloomColor}30 0%, ${bloomColor}15 40%, transparent 70%);
    transform:translate(-50%,-50%);
    ${anim} ${dimOpacity}
  `;
  el.appendChild(bloom);

  // Inner glow (CSS radial gradient)
  const glowColor = isActiveLight ? '#FFFAB4' : '#BB9944';
  const glow = document.createElement('div');
  glow.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:${glowSize}px; height:${glowSize}px;
    border-radius:50%;
    background: radial-gradient(circle, ${glowColor}55 0%, ${glowColor}25 50%, transparent 70%);
    transform:translate(-50%,-50%);
    ${anim} ${dimOpacity}
  `;
  el.appendChild(glow);

  // Core (SVG image + CSS box-shadow for extra glow)
  const core = document.createElement('img');
  core.src = svgCore;
  const shadowColor = isActiveLight ? '#FFD700' : '#AA8833';
  core.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:${coreSize}px; height:${coreSize}px;
    transform:translate(-50%,-50%);
    pointer-events:none;
    filter: brightness(2);
    box-shadow: 0 0 ${coreSize}px ${shadowColor}, 0 0 ${coreSize * 2}px ${shadowColor}80;
    border-radius: 50%;
    ${anim} ${dimOpacity}
  `;
  el.appendChild(core);

  if (tappable && prayedAt) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = el.querySelector('.prayer-tooltip');
      if (existing) existing.remove();

      const tip = document.createElement('div');
      tip.className = 'prayer-tooltip';
      const relTime = formatRelativeTime(prayedAt, tooltipLabels);
      tip.textContent = tooltipLabels
        ? tooltipLabels.prayedAt.replace('{time}', relTime)
        : relTime + '에 기도';
      el.appendChild(tip);

      tip.addEventListener('animationend', () => tip.remove());
    });
  }

  return el;
}
