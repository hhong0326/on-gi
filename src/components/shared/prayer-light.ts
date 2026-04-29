interface PrayerLightOptions {
  weight: number;
  isUser: boolean;
  isActive: boolean;
  lat: number;
  lng: number;
  context?: 'globe' | 'map';
}

export function createPrayerLightElement({ weight, isUser, isActive, context = 'globe' }: PrayerLightOptions): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative; transform:translate(-50%,-50%); pointer-events:none;';

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

  return el;
}
