import { dom } from '../dom.js';
import { state, set, setPreview, imageSize } from '../state.js';
import { clamp } from '../coords.js';
import { formatNumber } from '../format.js';
import * as actions from '../actions.js';
import * as picker from '../picker.js';

function isEditing(element) {
  return document.activeElement === element;
}

/** Liczby w interfejsie po polsku: 44,92. Eksport CSS zostaje z kropką —
 *  tego wymaga składnia, więc format.js celowo tego nie dotyka. */
function pl(text) {
  return String(text).replace('.', ',');
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
    // Render nie nadpisuje pola w trakcie edycji, więc po opuszczeniu
    // pustego/niepoprawnego pola trzeba wpisać do niego aktualną wartość.
    input.addEventListener('blur', () => render(state));
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

  // Suwak i pole sterują tą samą wartością. Pole ma szerszy zakres niż suwak,
  // żeby dało się wpisać skalę spoza wygodnego zakresu przeciągania.
  bindNumeric(dom.previewScale, dom.previewScaleInput, 0.01, 20, (scale) => setPreview({ scale }));
  bindNumeric(dom.previewRotate, dom.previewRotateInput, -360, 360, (rotate) => setPreview({ rotate }));
}

function bindNumeric(slider, input, min, max, apply) {
  slider.addEventListener('input', () => apply(Number(slider.value)));
  input.addEventListener('input', () => {
    const value = parseField(input);
    if (value !== null) apply(clamp(value, min, max));
  });
  // Puste lub niepoprawne pole zostawia poprzednią wartość — uzupełnia się
  // po opuszczeniu, tak samo jak pola X/Y.
  input.addEventListener('blur', () => render(state));
}

export function render(s) {
  if (!s.image) return;
  const size = imageSize();

  // Pola nie są nadpisywane w trakcie pisania, żeby nie zjadać kursora.
  if (!isEditing(dom.xInput)) {
    dom.xInput.value = pl(s.unit === 'px'
      ? formatNumber(s.origin.x * size.width, 2)
      : formatNumber(s.origin.x * 100, 2));
  }
  if (!isEditing(dom.yInput)) {
    dom.yInput.value = pl(s.unit === 'px'
      ? formatNumber(s.origin.y * size.height, 2)
      : formatNumber(s.origin.y * 100, 2));
  }

  setActive(dom.unitToggle, 'unit', s.unit);
  setActive(dom.stepToggle, 'step', String(s.step));
  setActive(dom.presetRow, 'preset', s.preview.preset);

  for (const button of dom.grid9.children) {
    const matches = Number(button.dataset.x) === s.origin.x && Number(button.dataset.y) === s.origin.y;
    button.classList.toggle('active', matches);
  }

  dom.stepLabel.textContent = `${pl(s.step)}px`;
  dom.precisionBtn.textContent = `.${s.precision}`;
  dom.snapToggle.checked = s.snap;
  dom.loupeToggle.checked = s.loupe;
  dom.autoCopyToggle.checked = s.autoCopy;
  if (!isEditing(dom.templateInput)) dom.templateInput.value = s.template;

  renderCss(actions.currentCss());

  dom.previewPlay.textContent = s.preview.playing ? 'Pauza' : 'Graj';
  dom.previewStage.setAttribute('aria-pressed', String(s.previewInStage));
  dom.customSliders.hidden = s.preview.preset !== 'custom';
  dom.previewScale.value = String(s.preview.scale);
  dom.previewRotate.value = String(s.preview.rotate);
  if (!isEditing(dom.previewScaleInput)) dom.previewScaleInput.value = pl(s.preview.scale);
  if (!isEditing(dom.previewRotateInput)) dom.previewRotateInput.value = `${pl(s.preview.rotate)}°`;

  renderPins(s);
}

/** Rozbija deklarację na właściwość / interpunkcję / wartość. Szablon jest
 *  edytowalny, więc gdy nie wygląda jak deklaracja, zostawiamy zwykły tekst. */
function renderCss(text) {
  const colon = text.indexOf(':');
  if (colon === -1) {
    dom.cssOut.textContent = text;
    return;
  }

  let value = text.slice(colon + 1);
  const semicolon = value.endsWith(';') ? ';' : '';
  if (semicolon) value = value.slice(0, -1);

  const parts = [
    piece('css-prop', text.slice(0, colon)),
    piece('css-punct', ':'),
    piece('css-value', value),
  ];
  if (semicolon) parts.push(piece('css-punct', semicolon));
  dom.cssOut.replaceChildren(...parts);
}

function piece(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
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
