// Obramowanie zdjęcia. Zdjęcia z przezroczystym tłem nie mają widocznej
// krawędzi, więc rysujemy ją sami — w warstwie ekranowej, nie wewnątrz
// skalowanej warstwy obrazu. Dzięki temu linia ma zawsze tę samą grubość,
// niezależnie od zoomu (obrys rysowany wewnątrz `scale()` przy 8× miałby
// 0.125 px i po prostu znikał).

import { imageToScreen } from './coords.js';

export const IDENTITY_FRAME = { rotate: 0, scaleX: 1, scaleY: 1 };

/**
 * Punkt przekształcony dokładnie tak, jak robi to CSS
 * `transform: rotate(θ) scale(sx, sy)` wokół `transform-origin`:
 *
 *     p' = o + R(θ) · S · (p − o)
 *
 * Kolejność ma znaczenie — CSS składa transformacje od lewej, więc skala
 * działa przed obrotem.
 */
export function transformPoint(point, origin, frame) {
  const dx = (point.x - origin.x) * frame.scaleX;
  const dy = (point.y - origin.y) * frame.scaleY;
  const radians = (frame.rotate * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/** Cztery rogi obrazu po transformacji podglądu, we współrzędnych obrazu. */
export function frameCorners(imageSize, origin, frame) {
  return [
    { x: 0, y: 0 },
    { x: imageSize.width, y: 0 },
    { x: imageSize.width, y: imageSize.height },
    { x: 0, y: imageSize.height },
  ].map((corner) => transformPoint(corner, origin, frame));
}

/** Te same rogi we współrzędnych ekranu, gotowe pod atrybut `points` SVG. */
export function screenPolygon(imageSize, origin, frame, view) {
  return frameCorners(imageSize, origin, frame)
    .map((corner) => imageToScreen(corner, view))
    .map((point) => `${round(point.x)},${round(point.y)}`)
    .join(' ');
}

function round(value) {
  return Math.round(value * 100) / 100;
}
