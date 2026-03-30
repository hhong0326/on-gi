interface PrayerLightOptions {
  weight: number;
  isUser: boolean;
  isActive: boolean;
  lat: number;
  lng: number;
}

// Active prayer SVGs
const ACTIVE_LAYERS = [
  { src: '/기도의빛_바깥블룸.svg', size: 63 },
  { src: '/기도의빛_안쪽글로우.svg', size: 32 },
  { src: '/기도의빛_중심.svg', size: 10 },
];

// Residual light SVGs (잔상)
const RESIDUAL_LAYERS = [
  { src: '/잔상_바깥.svg', size: 63 },
  { src: '/잔상_글로우.svg', size: 32 },
  { src: '/잔상_중심.svg', size: 10 },
];

export function createPrayerLightElement({ weight, isUser, isActive, lat, lng }: PrayerLightOptions): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative; transform:translate(-50%,-50%); pointer-events:none;';

  const clamped = Math.min(weight, 8);
  const scale = isUser ? 2 : 0.6 + (clamped / 8) * 1.4;
  const layers = isActive || isUser ? ACTIVE_LAYERS : RESIDUAL_LAYERS;

  // Twinkle for active prayers only
  const twinkleDuration = 2 + Math.random() * 4;
  const twinkleDelay = Math.random() * -6;

  layers.forEach((layer) => {
    const img = document.createElement('img');
    img.src = layer.src;
    img.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:${layer.size * scale}px; height:${layer.size * scale}px;
      transform:translate(-50%,-50%);
      pointer-events:none;
    `;

    if (isActive || isUser) {
      img.style.animation = `twinkle ${twinkleDuration}s ease-in-out ${twinkleDelay}s infinite`;
    } else {
      // Residual: dimmer, no animation
      img.style.opacity = `${0.3 + (clamped / 8) * 0.3}`;
    }

    el.appendChild(img);
  });

  return el;
}
