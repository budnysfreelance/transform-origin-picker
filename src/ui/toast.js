import { dom } from '../dom.js';

let hideTimer = null;

export function toast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => dom.toast.classList.remove('show'), 1400);
}

/** Komunikat dla czytników ekranu — bez wizualnego toasta. */
export function announce(message) {
  dom.liveRegion.textContent = message;
}
