import { dom } from '../dom.js';
import { state, set, setPreview, imageSize } from '../state.js';
import { formatNumber } from '../format.js';
import * as actions from '../actions.js';
import * as picker from '../picker.js';

function isEditing(element) {
  return document.activeElement === element;
}

function parseField(input) {
  const value = Number.parseFloat(input.value.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/** Wartość pola -> znormalizowany origin (pola pokazują px albo %). */
function fieldToNormalized(value, axisLength) {
  return state.unit === 'px' ? value / axisLength : value / 100;
}

function commitFields({ tag }) {
  const size = imageSize();
  const x = parseField(dom.xInput);
  const y = parseField(dom.yInput);
  picker.clearSnapIndicator();
  actions.commitOrigin(
    {
      x: x === null ? state.origin.x : fieldToNormalized(x, size.width),
      y: y === null ? state.origin.y : fieldToNormalized(y, size.height),
    },
    { tag },
  );
}

export function init() {
  for (const input of [dom.xInput, dom.yInput]) {
    input.addEventListener('input', () => commitFields({ tag: 'field' }));
    input.addEventListener('change', () => commitFields({ tag: null }));
  }

  dom.unitToggle.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-unit]');
    if (button) set({ unit: button.dataset.unit });
  });

  dom.stepToggle.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-step]');
    if (button) set({ step: Number.parseFloat(button.dataset.step) });
  });

  dom.grid9.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-x]');
    if (!button) return;
    picker.clearSnapIndicator();
    actions.commitOrigin({ x: Number(button.dataset.x), y: Number(button.dataset.y) });
  });

  document.querySelectorAll('[data-nudge]').forEach((button) => {
    const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    button.addEventListener('click', () => {
      const [dx, dy] = deltas[button.dataset.nudge];
      picker.clearSnapIndicator();
      actions.nudge(dx, dy, state.step);
    });
  });

  dom.snapToggle.addEventListener('change', () => set({ snap: dom.snapToggle.checked }));
  dom.loupeToggle.addEventListener('change', () => set({ loupe: dom.loupeToggle.checked }));
  dom.ghostToggle.addEventListener('change', () => set({ ghost: dom.ghostToggle.checked }));
  dom.autoCopyToggle.addEventListener('change', () => set({ autoCopy: dom.autoCopyToggle.checked }));

  dom.undoBtn.addEventListener('click', actions.undo);
  dom.redoBtn.addEventListener('click', actions.redo);

  dom.precisionBtn.addEventListener('click', () => set({ precision: (state.precision + 1) % 3 }));
  dom.copyBtn.addEventListener('click', () => actions.copyCss());
  dom.copyValueBtn.addEventListener('click', () => actions.copyValue());

  dom.templateInput.addEventListener('input', () => set({ template: dom.templateInput.value }));

  dom.pins.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-pin]');
    if (!button) return;
    const index = Number(button.dataset.pin);
    if (event.shiftKey) actions.savePin(index);
    else actions.jumpToPin(index);
  });

  // --- podgląd ---
  dom.presetRow.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-preset]');
    if (button) setPreview({ preset: button.dataset.preset });
  });
  dom.previewPlay.addEventListener('click', () => setPreview({ playing: !state.preview.playing }));
  dom.previewStage.addEventListener('click', () => set({ previewInStage: !state.previewInStage }));
  dom.previewScale.addEventListener('input', () =>
    setPreview({ scale: Number(dom.previewScale.value) }));
  dom.previewRotate.addEventListener('input', () =>
    setPreview({ rotate: Number(dom.previewRotate.value) }));
}

export function render(s) {
  if (!s.image) return;
  const size = imageSize();

  // Pola nie są nadpisywane w trakcie pisania, żeby nie zjadać kursora.
  if (!isEditing(dom.xInput)) {
    dom.xInput.value = s.unit === 'px'
      ? formatNumber(s.origin.x * size.width, 2)
      : formatNumber(s.origin.x * 100, 2);
  }
  if (!isEditing(dom.yInput)) {
    dom.yInput.value = s.unit === 'px'
      ? formatNumber(s.origin.y * size.height, 2)
      : formatNumber(s.origin.y * 100, 2);
  }

  setActive(dom.unitToggle, 'unit', s.unit);
  setActive(dom.stepToggle, 'step', String(s.step));
  setActive(dom.presetRow, 'preset', s.preview.preset);

  for (const button of dom.grid9.children) {
    const matches = Number(button.dataset.x) === s.origin.x && Number(button.dataset.y) === s.origin.y;
    button.classList.toggle('active', matches);
  }

  dom.stepLabel.textContent = `${s.step}px`;
  dom.precisionBtn.textContent = `.${s.precision}`;
  dom.snapToggle.checked = s.snap;
  dom.loupeToggle.checked = s.loupe;
  dom.ghostToggle.checked = s.ghost;
  dom.autoCopyToggle.checked = s.autoCopy;
  if (!isEditing(dom.templateInput)) dom.templateInput.value = s.template;

  dom.cssOut.textContent = actions.currentCss();

  dom.previewPlay.textContent = s.preview.playing ? 'Pauza' : 'Graj';
  dom.previewStage.setAttribute('aria-pressed', String(s.previewInStage));
  dom.customSliders.hidden = s.preview.preset !== 'custom';
  dom.previewScale.value = String(s.preview.scale);
  dom.previewRotate.value = String(s.preview.rotate);
  dom.previewScaleValue.textContent = String(s.preview.scale);
  dom.previewRotateValue.textContent = `${s.preview.rotate}°`;

  renderPins(s);
}

function setActive(container, key, value) {
  for (const button of container.querySelectorAll(`button[data-${key}]`)) {
    button.classList.toggle('active', button.dataset[key] === value);
  }
}

function renderPins(s) {
  for (const button of dom.pins.children) {
    const pin = s.pins[Number(button.dataset.pin)];
    button.classList.toggle('set', Boolean(pin));
    button.querySelector('span').textContent = pin
      ? `${formatNumber(pin.x * 100, 0)}/${formatNumber(pin.y * 100, 0)}`
      : 'puste';
  }
}
