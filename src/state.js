// Jedno źródło prawdy + minimalny pub/sub. Aplikacja jest na tyle mała,
// że subskrybenci po prostu przerysowują się przy każdej zmianie.

export const state = {
  /** @type {{el: HTMLImageElement, width:number, height:number, name:string, blob:Blob}|null} */
  image: null,

  /** Origin znormalizowany (0..1). Wartości poza zakresem są legalne. */
  origin: { x: 0.5, y: 0.5 },

  /** Transformacja widoku sceny. */
  view: { scale: 1, panX: 0, panY: 0 },

  unit: 'pct',        // 'pct' | 'px'
  precision: 1,       // miejsca po przecinku w eksporcie
  step: 1,            // krok nudge'a w pikselach obrazu
  snap: true,
  loupe: true,
  previewInStage: false,
  autoCopy: false,
  template: 'transform-origin: {value};',

  preview: {
    playing: true,
    preset: 'pulse',  // 'pulse' | 'spin' | 'zoom' | 'flip' | 'custom'
    scale: 1.6,
    rotate: 25,
    duration: 2400,
  },

  /** @type {Array<{x:number,y:number}|null>} sloty A/B/C do porównywania kandydatów */
  pins: [null, null, null],

  helpOpen: false,
};

const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notify(changed = new Set()) {
  for (const listener of listeners) listener(state, changed);
}

/** Płytki merge + powiadomienie. Zagnieżdżone obiekty podmieniaj w całości. */
export function set(patch) {
  Object.assign(state, patch);
  notify(new Set(Object.keys(patch)));
}

export function setOrigin(origin) {
  set({ origin: { x: origin.x, y: origin.y } });
}

export function setPreview(patch) {
  set({ preview: { ...state.preview, ...patch } });
}

export function imageSize() {
  return state.image
    ? { width: state.image.width, height: state.image.height }
    : { width: 1, height: 1 };
}
