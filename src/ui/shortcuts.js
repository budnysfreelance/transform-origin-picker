import { dom } from '../dom.js';
import { state, set, setPreview } from '../state.js';
import * as actions from '../actions.js';
import * as viewport from '../viewport.js';
import * as picker from '../picker.js';
import * as imageSource from '../imageSource.js';

// Presety w układzie przestrzennym numpada: 7 to lewy górny, 1 lewy dolny.
const GRID_PRESETS = {
  7: [0, 0],   8: [0.5, 0],   9: [1, 0],
  4: [0, 0.5], 5: [0.5, 0.5], 6: [1, 0.5],
  1: [0, 1],   2: [0.5, 1],   3: [1, 1],
};

const ARROWS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

function isTyping(event) {
  const tag = event.target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable;
}

export function toggleHelp(open) {
  const next = open ?? !state.helpOpen;
  set({ helpOpen: next });
  dom.helpOverlay.hidden = !next;
  if (next) dom.helpClose.focus();
}

function onKeyDown(event) {
  const mod = event.metaKey || event.ctrlKey;

  if (event.key === 'Escape') {
    if (state.helpOpen) toggleHelp(false);
    else if (state.image) imageSource.reset();
    return;
  }

  if (mod && event.key.toLowerCase() === 'v') return;   // wklejanie obsługuje paste

  if (mod && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    picker.clearSnapIndicator();
    if (event.shiftKey) actions.redo();
    else actions.undo();
    return;
  }

  if (mod && event.key.toLowerCase() === 'c' && !isTyping(event)) {
    event.preventDefault();
    actions.copyCss();
    return;
  }

  if (mod && (event.key === '0' || event.key === '9')) {
    event.preventDefault();
    if (event.key === '0') viewport.fit();
    else viewport.actualSize();
    return;
  }

  if (isTyping(event) || mod) return;

  if (event.key === ' ' && !viewport.isSpaceHeld()) {
    event.preventDefault();
    viewport.setSpaceHeld(true);
    return;
  }

  if (event.key === '?') {
    event.preventDefault();
    toggleHelp();
    return;
  }

  if (!state.image) return;

  if (event.key in ARROWS) {
    event.preventDefault();
    // ⇧ = grubszy krok, ⌥ = sub-pixel. Krok jest w pikselach obrazu,
    // więc precyzja nie zależy od aktualnego zoomu.
    const step = event.shiftKey ? state.step * 10 : event.altKey ? 0.1 : state.step;
    const [dx, dy] = ARROWS[event.key];
    picker.clearSnapIndicator();
    actions.nudge(dx, dy, step);
    return;
  }

  const digit = Number(event.key);
  if (GRID_PRESETS[digit]) {
    event.preventDefault();
    const [x, y] = GRID_PRESETS[digit];
    picker.clearSnapIndicator();
    actions.commitOrigin({ x, y });
    return;
  }

  if (['+', '='].includes(event.key)) { viewport.zoomBy(1.25); return; }
  if (['-', '_'].includes(event.key)) { viewport.zoomBy(1 / 1.25); return; }

  const pinIndex = ['a', 'b', 'c'].indexOf(event.key.toLowerCase());
  if (pinIndex !== -1) {
    picker.clearSnapIndicator();
    if (event.shiftKey) actions.savePin(pinIndex);
    else actions.jumpToPin(pinIndex);
    return;
  }

  switch (event.key.toLowerCase()) {
    case 'p': setPreview({ playing: !state.preview.playing }); break;
    case 'i': set({ previewInStage: !state.previewInStage }); break;
    case 'g': set({ ghost: !state.ghost }); break;
    case 's': set({ snap: !state.snap }); break;
    case 'l': set({ loupe: !state.loupe }); break;
    case 'o': imageSource.pickFile(); break;
  }
}

function onKeyUp(event) {
  if (event.key === ' ') viewport.setSpaceHeld(false);
}

export function init() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // Utrata fokusu okna zostawiłaby spację „wciśniętą" na zawsze.
  window.addEventListener('blur', () => viewport.setSpaceHeld(false));

  dom.helpBtn.addEventListener('click', () => toggleHelp(true));
  dom.helpClose.addEventListener('click', () => toggleHelp(false));
  dom.helpOverlay.addEventListener('click', (event) => {
    if (event.target === dom.helpOverlay) toggleHelp(false);
  });
  dom.openBtn.addEventListener('click', imageSource.pickFile);
  dom.resetBtn.addEventListener('click', imageSource.reset);
}
