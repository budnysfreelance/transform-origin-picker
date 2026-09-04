// Lupa: okolica wybranego punktu w powiększeniu, bez interpolacji.
// Zaparkowana w rogu sceny (nie lata za kursorem, żeby nie zasłaniać obrazu)
// i pokazuje zawsze bieżący origin — służy do weryfikacji, czy punkt siedzi
// dokładnie na tym pikselu, o który chodziło.

import { dom } from './dom.js';
import { imageSize } from './state.js';
import { imageToScreen, toPixels } from './coords.js';
import { cachedStageSize } from './viewport.js';

const SIZE = 164;      // px na ekranie
const ZOOM = 8;        // ile pikseli ekranu na piksel obrazu
const MARGIN = 28;
const LABEL_H = 22;

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
  const stageWidth = cachedStageSize().width;
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

  ctx.fillStyle = '#1a1c2b';
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
  drawLabel(ctx);
}

function drawGrid(ctx) {
  ctx.strokeStyle = 'rgba(233, 233, 237, .09)';
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

  ctx.strokeStyle = 'rgba(210, 206, 253, .5)';
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

  // Pierścień w środku to właściwy wskaźnik punktu — pełna krycie.
  ctx.strokeStyle = '#e7e5fe';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(center, center, 4.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLabel(ctx) {
  ctx.fillStyle = 'rgba(15, 16, 26, .7)';
  ctx.fillRect(0, SIZE - LABEL_H, SIZE, LABEL_H);

  ctx.fillStyle = '#b2b6ca';
  ctx.font = '500 10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LUPA · ${ZOOM * 100}%`, SIZE / 2, SIZE - LABEL_H / 2 + 0.5);
}
