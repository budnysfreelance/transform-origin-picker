// Wskazywanie punktu: klik, przeciąganie, przyciąganie do siatki,
// rysowanie markera i prowadnic.

import { dom } from './dom.js';
import { state, imageSize } from './state.js';
import { imageToScreen, screenToImage, toNormalized, toPixels } from './coords.js';
import * as viewport from './viewport.js';
import { previewOrigin, commitOrigin } from './actions.js';

// Węzły, do których warto przyciągać: rogi, środki krawędzi, ćwiartki i tercje.
const SNAP_TARGETS = [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1];
const SNAP_THRESHOLD_PX = 7;

let dragging = false;
let snapped = { x: false, y: false };

/**
 * Zwraca węzeł siatki, do którego przyciąga się `value`, albo null.
 * Próg jest stały w pikselach ekranu, więc przy dużym zoomie przyciąganie
 * naturalnie „słabnie" i nie przeszkadza w precyzyjnym ustawianiu.
 */
function snapAxis(value, axisLengthPx, scale) {
  const threshold = SNAP_THRESHOLD_PX / (axisLengthPx * scale);
  let best = null;
  let bestDistance = Infinity;
  for (const target of SNAP_TARGETS) {
    const distance = Math.abs(value - target);
    if (distance <= threshold && distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}

function originFromEvent(event) {
  const size = imageSize();
  const normalized = toNormalized(screenToImage(viewport.stagePoint(event), state.view), size);

  // Alt chwilowo wyłącza przyciąganie — bez zmiany ustawienia.
  if (!state.snap || event.altKey) {
    snapped = { x: false, y: false };
    return normalized;
  }

  const x = snapAxis(normalized.x, size.width, state.view.scale);
  const y = snapAxis(normalized.y, size.height, state.view.scale);
  snapped = { x: x !== null, y: y !== null };
  return { x: x ?? normalized.x, y: y ?? normalized.y };
}

function onPointerDown(event) {
  if (!state.image) return;

  if (viewport.isSpaceHeld() || event.button === 1) {
    event.preventDefault();
    viewport.beginPan(event);
    return;
  }
  if (event.button !== 0) return;

  dragging = true;
  dom.stage.setPointerCapture(event.pointerId);
  dom.stage.focus({ preventScroll: true });
  previewOrigin(originFromEvent(event));
}

function onPointerMove(event) {
  if (viewport.isPanning(event)) {
    viewport.movePan(event);
    return;
  }
  if (dragging) previewOrigin(originFromEvent(event));
}

function onPointerUp(event) {
  if (viewport.isPanning(event)) {
    viewport.endPan();
    return;
  }
  if (!dragging) return;
  dragging = false;
  // Cały gest to jeden wpis w historii, a nie setki klatek przeciągania.
  commitOrigin(state.origin, { tag: null });
}

export function init() {
  dom.stage.addEventListener('pointerdown', onPointerDown);
  dom.stage.addEventListener('pointermove', onPointerMove);
  dom.stage.addEventListener('pointerup', onPointerUp);
  dom.stage.addEventListener('pointercancel', onPointerUp);
  dom.stage.addEventListener('contextmenu', (event) => {
    if (viewport.isSpaceHeld()) event.preventDefault();
  });
  dom.stage.addEventListener('dragstart', (event) => event.preventDefault());
}

export function render(s) {
  if (!s.image) return;
  const point = imageToScreen(toPixels(s.origin, imageSize()), s.view);

  dom.marker.style.left = `${point.x}px`;
  dom.marker.style.top = `${point.y}px`;
  dom.guideV.style.left = `${point.x}px`;
  dom.guideH.style.top = `${point.y}px`;
  dom.guideV.classList.toggle('snapped', snapped.x);
  dom.guideH.classList.toggle('snapped', snapped.y);
}

/** Po zmianie punktu spoza sceny (pola, presety) nie ma już aktywnego snapu. */
export function clearSnapIndicator() {
  snapped = { x: false, y: false };
}
