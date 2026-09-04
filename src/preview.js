// Podgląd na żywo. Kluczowa zasada: podgląd używa dokładnie tego samego
// `transform-origin` w procentach, który wychodzi w eksportowanym CSS —
// nie własnej matematyki. Dzięki temu to, co widzisz, jest tym, co dostaniesz.

import { dom } from './dom.js';
import { state, imageSize } from './state.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let rafId = null;
let startedAt = 0;
let lastT = 0;   // postęp ostatniej klatki — pauza zatrzymuje obraz w miejscu

/** Klatka animacji dla postępu t ∈ [0,1). */
function frameAt(preset, t, config) {
  switch (preset) {
    case 'spin':
      return { rotate: t * 360, scaleX: 1, scaleY: 1 };

    case 'pulse': {
      const eased = (1 - Math.cos(t * Math.PI * 2)) / 2;
      const scale = 1 + (config.scale - 1) * eased;
      return { rotate: 0, scaleX: scale, scaleY: scale };
    }

    case 'zoom': {
      // Dojazd do celu i twardy powrót — dobrze pokazuje, dokąd „ucieka" kadr.
      const progress = t < 0.85 ? easeOutCubic(t / 0.85) : 0;
      const scale = 1 + (config.scale - 1) * progress;
      return { rotate: 0, scaleX: scale, scaleY: scale };
    }

    case 'flip':
      return { rotate: 0, scaleX: Math.cos(t * Math.PI * 2), scaleY: 1 };

    default: // 'custom' — statycznie, sterowane suwakami
      return { rotate: config.rotate, scaleX: config.scale, scaleY: config.scale };
  }
}

/** Najbardziej odchylona klatka danego presetu — do obrysu ghosta. */
function extremeFrame(preset, config) {
  const t = { spin: 0.125, pulse: 0.5, zoom: 0.85, flip: 0.5 }[preset] ?? 0;
  return frameAt(preset, t, config);
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function toCss(frame) {
  return `rotate(${frame.rotate}deg) scale(${frame.scaleX}, ${frame.scaleY})`;
}

function originCss(origin) {
  return `${origin.x * 100}% ${origin.y * 100}%`;
}

function isAnimated(s) {
  return s.preview.preset !== 'custom' && s.preview.playing;
}

function applyFrame(frame) {
  const s = state;
  const css = toCss(frame);

  dom.previewImg.style.transform = css;
  // Scena: transform na <img> składa się z pan/zoom warstwy nadrzędnej,
  // więc podgląd nie psuje współrzędnych markera.
  dom.img.style.transform = s.previewInStage ? css : 'none';
}

function tick(now) {
  if (!isAnimated(state)) {
    rafId = null;
    return;
  }
  if (!startedAt) startedAt = now - lastT * state.preview.duration;
  lastT = ((now - startedAt) % state.preview.duration) / state.preview.duration;
  applyFrame(frameAt(state.preview.preset, lastT, state.preview));
  rafId = requestAnimationFrame(tick);
}

function start() {
  if (rafId !== null) return;
  startedAt = 0;   // tick wyliczy go z lastT, żeby wznowić tam, gdzie stanęło
  rafId = requestAnimationFrame(tick);
}

function stop() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}

/** Dopasowuje ramkę podglądu do proporcji obrazu — inaczej `transform-origin`
 *  w procentach odnosiłby się do pudełka, a nie do widocznego obrazka. */
function layoutFrame(s) {
  const size = imageSize();
  const available = Math.max(80, dom.previewTile.clientWidth - 28);
  const scale = Math.min(available / size.width, 190 / size.height);
  dom.previewFrame.style.width = `${Math.round(size.width * scale)}px`;
  dom.previewFrame.style.height = `${Math.round(size.height * scale)}px`;
}

export function init() {
  // Przy włączonej redukcji ruchu nie startujemy pętli — suwaki w trybie
  // „ręcznie" pozwalają obejrzeć transformację bez animacji.
  if (reducedMotion.matches) {
    state.preview.playing = false;
    state.preview.preset = 'custom';
  }
  window.addEventListener('resize', () => {
    if (state.image) layoutFrame(state);
  });
}

export function render(s) {
  if (!s.image) {
    stop();
    return;
  }

  layoutFrame(s);

  const origin = originCss(s.origin);
  dom.previewImg.style.transformOrigin = origin;
  dom.img.style.transformOrigin = origin;
  dom.ghost.style.transformOrigin = origin;

  dom.previewOrigin.style.left = `${s.origin.x * 100}%`;
  dom.previewOrigin.style.top = `${s.origin.y * 100}%`;

  dom.ghost.classList.toggle('on', s.ghost);
  if (s.ghost) {
    dom.ghost.style.transform = toCss(extremeFrame(s.preview.preset, s.preview));
  }

  if (isAnimated(s)) {
    start();
  } else {
    stop();
    applyFrame(frameAt(s.preview.preset, s.preview.preset === 'custom' ? 0 : lastT, s.preview));
  }
}
