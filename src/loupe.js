// Lupa: okolica wybranego punktu w powiększeniu, bez interpolacji.
// Zaparkowana w rogu sceny (nie lata za kursorem, żeby nie zasłaniać obrazu)
// i pokazuje zawsze bieżący origin — służy do weryfikacji, czy punkt siedzi
// dokładnie na tym pikselu, o który chodziło.

import { dom } from './dom.js';
import { imageSize } from './state.js';
import { imageToScreen, toPixels } from './coords.js';

const SIZE = 150;      // px na ekranie
const ZOOM = 8;        // ile pikseli ekranu na piksel obrazu
const MARGIN = 10;

export function render(s) {
  const visible = Boolean(s.image) && s.loupe;
  dom.loupe.hidden = !visible;
  if (!visible) return;

  const size = imageSize();
  const center = toPixels(s.origin, size);
  park(s, center);
  draw(s, center, size);
}

/** Przerzuca lupę na drugą stronę, gdy marker wszedłby pod nią. */
function park(s, center) {
  const marker = imageToScreen(center, s.view);
  const stageWidth = dom.stage.clientWidth;
  const nearTop = marker.y < SIZE + MARGIN * 2;
  const nearRight = marker.x > stageWidth - SIZE - MARGIN * 2;

  dom.loupe.style.top = `${MARGIN}px`;
  if (nearTop && nearRight) {
    dom.loupe.style.left = `${MARGIN}px`;
    dom.loupe.style.right = 'auto';
  } else {
    dom.loupe.style.left = 'auto';
    dom.loupe.style.right = `${MARGIN}px`;
  }
}

function draw(s, center, size) {
  const ratio = window.devicePixelRatio || 1;
  if (dom.loupe.width !== SIZE * ratio) {
    dom.loupe.width = SIZE * ratio;
    dom.loupe.height = SIZE * ratio;
  }

  const ctx = dom.loupe.getContext('2d');
  if (!ctx) {
    dom.loupe.hidden = true;   // brak kontekstu 2D — appka działa dalej, tylko bez lupy
    return;
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  // Ustawiane po każdej zmianie rozmiaru canvasu — wtedy stan kontekstu wraca do domyślnego.
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#0b0c0e';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const sourceSpan = SIZE / ZOOM;  // ile pikseli obrazu mieści się w lupie
  const sx = center.x - sourceSpan / 2;
  const sy = center.y - sourceSpan / 2;

  // Wycinek może wystawać poza obraz (origin bywa poza boxem) — rysujemy
  // tylko część wspólną, przeskalowaną do właściwego miejsca w lupie.
  const cropX = Math.max(0, -sx);
  const cropY = Math.max(0, -sy);
  const cropW = Math.min(sourceSpan - cropX, size.width - Math.max(0, sx));
  const cropH = Math.min(sourceSpan - cropY, size.height - Math.max(0, sy));

  if (cropW > 0 && cropH > 0) {
    ctx.drawImage(
      s.image.el,
      Math.max(0, sx), Math.max(0, sy), cropW, cropH,
      cropX * ZOOM, cropY * ZOOM, cropW * ZOOM, cropH * ZOOM,
    );
  }

  drawGrid(ctx);
  drawCrosshair(ctx);
}

function drawGrid(ctx) {
  ctx.strokeStyle = '#ffffff1c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let offset = 0; offset <= SIZE; offset += ZOOM) {
    ctx.moveTo(offset + 0.5, 0);
    ctx.lineTo(offset + 0.5, SIZE);
    ctx.moveTo(0, offset + 0.5);
    ctx.lineTo(SIZE, offset + 0.5);
  }
  ctx.stroke();
}

function drawCrosshair(ctx) {
  const center = SIZE / 2;
  ctx.strokeStyle = '#7cff6b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(center + 0.5, 0);
  ctx.lineTo(center + 0.5, center - 7);
  ctx.moveTo(center + 0.5, center + 7);
  ctx.lineTo(center + 0.5, SIZE);
  ctx.moveTo(0, center + 0.5);
  ctx.lineTo(center - 7, center + 0.5);
  ctx.moveTo(center + 7, center + 0.5);
  ctx.lineTo(SIZE, center + 0.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(center, center, 3.5, 0, Math.PI * 2);
  ctx.stroke();
}
