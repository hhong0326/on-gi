const BULB_COLORS = ['#FFD700', '#FFA500', '#FF8C42', '#FFE4B5', '#FFFACD'];

function pickColor(lat: number, lng: number): string {
  return BULB_COLORS[Math.abs(Math.floor((lat + lng) * 100)) % BULB_COLORS.length];
}

interface PrayerLightOptions {
  weight: number;
  isUser: boolean;
  lat: number;
  lng: number;
}

export function createPrayerLightElement({ weight, isUser, lat, lng }: PrayerLightOptions): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative; transform:translate(-50%,-50%); pointer-events:none;';

  const clamped = Math.min(weight, 8);
  const t = clamped / 8;

  const color = isUser ? '#FFD700' : pickColor(lat, lng);
  const coreColor = isUser ? '#FFFFFF' : color;

  const coreSize = isUser ? 8 : 3 + t * 5;
  const innerSize = coreSize * 3;
  const outerSize = coreSize * 7;
  const gleamSize = coreSize * 14;

  const twinkleDuration = 2 + Math.random() * 4;
  const twinkleDelay = Math.random() * -6;

  // Wide gleam
  const gleam = document.createElement('div');
  gleam.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:${gleamSize}px; height:${gleamSize}px;
    border-radius:50%;
    background: radial-gradient(circle, ${color}12 0%, ${color}06 40%, transparent 70%);
    transform:translate(-50%,-50%);
    animation: twinkle ${twinkleDuration * 1.5}s ease-in-out ${twinkleDelay}s infinite;
  `;
  el.appendChild(gleam);

  // Outer bloom
  const outer = document.createElement('div');
  outer.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:${outerSize}px; height:${outerSize}px;
    border-radius:50%;
    background: radial-gradient(circle, ${color}20 0%, ${color}08 50%, transparent 70%);
    transform:translate(-50%,-50%);
    animation: twinkle ${twinkleDuration * 1.2}s ease-in-out ${twinkleDelay}s infinite;
  `;
  el.appendChild(outer);

  // Inner glow
  const inner = document.createElement('div');
  inner.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:${innerSize}px; height:${innerSize}px;
    border-radius:50%;
    background: radial-gradient(circle, ${color}40 0%, ${color}15 50%, transparent 70%);
    transform:translate(-50%,-50%);
    animation: twinkle ${twinkleDuration}s ease-in-out ${twinkleDelay}s infinite;
  `;
  el.appendChild(inner);

  // Core
  const core = document.createElement('div');
  core.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:${coreSize}px; height:${coreSize}px;
    border-radius:50%;
    background:${coreColor};
    box-shadow: 0 0 ${coreSize * 1.5}px ${color}, 0 0 ${coreSize * 3}px ${color}80;
    transform:translate(-50%,-50%);
    animation: twinkle ${twinkleDuration}s ease-in-out ${twinkleDelay}s infinite;
  `;
  el.appendChild(core);

  return el;
}
