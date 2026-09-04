// Zoom i pan sceny. Cała matematyka siedzi w coords.js — tutaj tylko
// wiązanie z DOM-em i wejściem.

import { dom } from './dom.js';
import { state, set, imageSize } from './state.js';
import { clamp, fitView, centerView, zoomAt } from './coords.js';

const MIN_SCALE = 0.02;
const MAX_SCALE = 64;

let spaceHeld = false;
let pan = null;
let lastStageSize = null;

export function stageSize() {
  const rect = dom.stage.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

/** Punkt zdarzenia we współrzędnych sceny. */
export function stagePoint(event) {
  const rect = dom.stage.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export function fit() {
  if (!state.image) return;
  set({ view: fitView(imageSize(), stageSize(), 32) });
}

export function setScale(nextScale, anchor) {
  if (!state.image) return;
  const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
  const pivot = anchor ?? { x: stageSize().width / 2, y: stageSize().height / 2 };
  set({ view: zoomAt(state.view, pivot, clamped) });
}

export function zoomBy(factor, anchor) {
  setScale(state.view.scale * factor, anchor);
}

export function actualSize() {
  if (!state.image) return;
  set({ view: centerView(imageSize(), stageSize(), 1) });
}

export function setSpaceHeld(held) {
  spaceHeld = held;
  dom.stage.classList.toggle('panning', held);
}

export function isSpaceHeld() {
  return spaceHeld;
}

/** Rozpoczyna przeciąganie widoku. Wywoływane przez picker.js. */
export function beginPan(event) {
  pan = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    panX: state.view.panX,
    panY: state.view.panY,
  };
  dom.stage.setPointerCapture(event.pointerId);
  dom.stage.classList.add('dragging');
}

export function isPanning(event) {
  return pan !== null && (!event || event.pointerId === pan.pointerId);
}

export function movePan(event) {
  if (!pan || event.pointerId !== pan.pointerId) return;
  set({
    view: {
      scale: state.view.scale,
      panX: pan.panX + (event.clientX - pan.startX),
      panY: pan.panY + (event.clientY - pan.startY),
    },
  });
}

export function endPan() {
  pan = null;
  dom.stage.classList.remove('dragging');
}

function onWheel(event) {
  if (!state.image) return;
  event.preventDefault();
  // deltaMode 1 = linie (Firefox), 2 = strony
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
  const factor = Math.exp(-event.deltaY * unit * 0.0018);
  zoomBy(factor, stagePoint(event));
}

/** Przy zmianie rozmiaru sceny trzymamy w miejscu punkt obrazu z jej środka. */
function onStageResize() {
  const size = stageSize();
  if (lastStageSize && state.image) {
    const dx = (size.width - lastStageSize.width) / 2;
    const dy = (size.height - lastStageSize.height) / 2;
    if (dx || dy) {
      set({ view: { ...state.view, panX: state.view.panX + dx, panY: state.view.panY + dy } });
    }
  }
  lastStageSize = size;
}

export function init() {
  dom.stage.addEventListener('wheel', onWheel, { passive: false });
  new ResizeObserver(onStageResize).observe(dom.stage);
}

export function render(s) {
  if (!s.image) return;
  const { width, height } = imageSize();

  dom.canvasLayer.style.width = `${width}px`;
  dom.canvasLayer.style.height = `${height}px`;
  dom.canvasLayer.style.transform =
    `translate(${s.view.panX}px, ${s.view.panY}px) scale(${s.view.scale})`;

  // Powyżej 2× pokazujemy prawdziwe piksele zamiast rozmycia interpolacją.
  dom.img.classList.toggle('crisp', s.view.scale >= 2);
  // Obrys ghosta rysuje się wewnątrz skalowanej warstwy, więc kompensujemy skalę.
  dom.ghost.style.setProperty('--ghost-width', `${1 / s.view.scale}px`);

  dom.zoomBadge.textContent = `${formatZoom(s.view.scale)} · ${width}×${height}`;
}

function formatZoom(scale) {
  const percent = scale * 100;
  return `${percent >= 100 ? Math.round(percent) : percent.toFixed(percent < 10 ? 1 : 0)}%`;
}
