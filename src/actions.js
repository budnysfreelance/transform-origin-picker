// Akcje na poziomie użytkownika — jedyne miejsce, które zapisuje historię
// i odpala auto-kopiowanie. Dzięki temu picker, panel i skróty klawiszowe
// robią to samo, niezależnie od tego, którą drogą użytkownik zmienił punkt.

import { state, set, setOrigin, imageSize } from './state.js';
import { clamp } from './coords.js';
import { formatOrigin, applyTemplate } from './format.js';
import * as history from './history.js';
import { copyText } from './clipboard.js';
import { toast, announce } from './ui/toast.js';

// transform-origin poza boxem jest legalny, ale bez granicy dałoby się
// zgubić punkt daleko poza obrazem — pół boxu w każdą stronę wystarcza.
const SOFT_MIN = -0.5;
const SOFT_MAX = 1.5;

export function clampOrigin(origin) {
  return {
    x: clamp(origin.x, SOFT_MIN, SOFT_MAX),
    y: clamp(origin.y, SOFT_MIN, SOFT_MAX),
  };
}

/** Zmiana bez wpisu w historii — używane w trakcie przeciągania. */
export function previewOrigin(origin) {
  setOrigin(clampOrigin(origin));
}

/** Zmiana zatwierdzona: trafia do historii i (opcjonalnie) do schowka. */
export function commitOrigin(origin, { tag = null } = {}) {
  const next = clampOrigin(origin);
  setOrigin(next);
  history.push(next, { tag });
  refreshHistoryButtons();
  if (state.autoCopy) copyCss({ silent: true });
}

export function nudge(dx, dy, stepPixels) {
  const size = imageSize();
  commitOrigin(
    {
      x: state.origin.x + (dx * stepPixels) / size.width,
      y: state.origin.y + (dy * stepPixels) / size.height,
    },
    { tag: 'nudge' },
  );
  announce(currentFormatted().value);
}

export function undo() {
  const previous = history.undo();
  if (!previous) return;
  setOrigin(previous);
  refreshHistoryButtons();
  toast('Cofnięto');
}

export function redo() {
  const next = history.redo();
  if (!next) return;
  setOrigin(next);
  refreshHistoryButtons();
  toast('Ponowiono');
}

export function resetHistory(origin) {
  history.reset(origin);
  refreshHistoryButtons();
}

function refreshHistoryButtons() {
  // Import DOM leniwie, żeby actions dało się testować bez przeglądarki.
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) undoBtn.disabled = !history.canUndo();
  if (redoBtn) redoBtn.disabled = !history.canRedo();
}

// --- eksport ---------------------------------------------------------

export function currentFormatted() {
  return formatOrigin(state.origin, imageSize(), {
    unit: state.unit,
    precision: state.precision,
  });
}

export function currentCss() {
  return applyTemplate(state.template, currentFormatted());
}

export async function copyCss({ silent = false } = {}) {
  const copied = await copyText(currentCss());
  if (!silent) toast(copied ? 'Skopiowano CSS' : 'Nie udało się skopiować');
  return copied;
}

export async function copyValue() {
  const copied = await copyText(currentFormatted().value);
  toast(copied ? 'Skopiowano wartość' : 'Nie udało się skopiować');
}

// --- przypięte punkty -------------------------------------------------

export function savePin(index) {
  const pins = [...state.pins];
  pins[index] = { ...state.origin };
  set({ pins });
  toast(`Przypięto ${'ABC'[index]}`);
}

export function jumpToPin(index) {
  const pin = state.pins[index];
  if (!pin) {
    savePin(index);
    return;
  }
  commitOrigin(pin, { tag: `pin-${index}` });
  toast(`Punkt ${'ABC'[index]}`);
}
