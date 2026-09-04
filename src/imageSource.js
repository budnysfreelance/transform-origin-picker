// Wejście obrazka: plik, drag&drop, wklejenie ze schowka, wznowienie sesji.

import { dom } from './dom.js';
import { state, set } from './state.js';
import * as viewport from './viewport.js';
import { resetHistory } from './actions.js';
import { saveLastImage, clearLastImage, loadLastImage } from './session.js';
import { toast } from './ui/toast.js';

let objectUrl = null;
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';

function decode(url) {
  return new Promise((resolve, reject) => {
    const element = new Image();
    element.decoding = 'async';
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Nie udało się wczytać obrazka'));
    element.src = url;
  });
}

/**
 * @param {Blob} blob
 * @param {string} name
 * @param {{origin?: {x:number,y:number}, persist?: boolean}} options
 */
export async function loadBlob(blob, name, { origin = null, persist = true } = {}) {
  if (!blob || !blob.type.startsWith('image/')) {
    toast('To nie jest obrazek');
    return;
  }

  const nextUrl = URL.createObjectURL(blob);
  let element;
  try {
    element = await decode(nextUrl);
  } catch {
    URL.revokeObjectURL(nextUrl);
    toast('Nie udało się wczytać obrazka');
    return;
  }

  // Zwalniamy poprzedni URL dopiero po udanym wczytaniu nowego —
  // przy błędzie zostajemy z działającym obrazkiem.
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = nextUrl;

  // SVG bez intrinsic size raportuje 0 — wtedy przyjmujemy rozmiar zastępczy.
  const width = element.naturalWidth || 512;
  const height = element.naturalHeight || 512;

  dom.img.src = objectUrl;
  dom.previewImg.src = objectUrl;

  // Scena i panel muszą być widoczne przed pierwszym renderem — inaczej
  // fit() i układ podglądu policzyłyby się na zerowych wymiarach.
  showStage(name, width, height);

  set({
    image: { el: element, width, height, name, blob },
    origin: origin ? { ...origin } : { x: 0.5, y: 0.5 },
  });

  viewport.fit();
  resetHistory(state.origin);
  dom.stage.focus({ preventScroll: true });

  if (persist) saveLastImage(blob, name, state.origin);
}

function showStage(name, width, height) {
  dom.dropzone.hidden = true;
  dom.stage.hidden = false;
  dom.panel.hidden = false;
  dom.fileChip.hidden = false;
  dom.fileName.textContent = name;
  dom.imageDims.textContent = `${width}×${height}`;
}

export function reset() {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  dom.img.removeAttribute('src');
  dom.previewImg.removeAttribute('src');
  dom.stage.hidden = true;
  dom.panel.hidden = true;
  dom.dropzone.hidden = false;
  dom.fileChip.hidden = true;
  set({ image: null });
  clearLastImage();
}

export function pickFile() {
  fileInput.click();
}

/** Wznawia ostatnią sesję po odświeżeniu strony. „Nowy obrazek" czyści zapis,
 *  więc świadome zamknięcie pracy nie wraca przy następnym wejściu. */
export async function restoreSession() {
  const record = await loadLastImage();
  if (!record?.blob || state.image) return;
  await loadBlob(record.blob, record.name, { origin: record.origin, persist: false });
}

function imageFromDataTransfer(transfer) {
  if (!transfer) return null;
  for (const item of transfer.files) {
    if (item.type.startsWith('image/')) return item;
  }
  return null;
}

export function init() {
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) loadBlob(file, file.name);
    fileInput.value = '';   // pozwala wybrać ten sam plik ponownie
  });

  dom.dropzone.addEventListener('click', pickFile);
  dom.dropzoneBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    pickFile();
  });

  // Drop działa na całym oknie — nie trzeba celować w dropzone.
  for (const type of ['dragenter', 'dragover']) {
    window.addEventListener(type, (event) => {
      event.preventDefault();
      dom.dropzone.classList.add('drag');
    });
  }
  for (const type of ['dragleave', 'drop']) {
    window.addEventListener(type, () => dom.dropzone.classList.remove('drag'));
  }
  window.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = imageFromDataTransfer(event.dataTransfer);
    if (file) loadBlob(file, file.name);
  });

  window.addEventListener('paste', (event) => {
    const items = event.clipboardData?.items ?? [];
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          event.preventDefault();
          loadBlob(blob, blob.name || 'wklejone.png');
          return;
        }
      }
    }
  });

  restoreSession();
}

/** Zapisuje bieżący origin przy obrazku, żeby przeżył odświeżenie. */
export function persistOrigin() {
  if (state.image) saveLastImage(state.image.blob, state.image.name, state.origin);
}
