// Jawna transformacja widoku: image-space (piksele źródła) <-> screen-space (piksele sceny).
// Wszystko tutaj jest czystą funkcją — to fundament precyzji całej appki, więc jest testowane.
//
// Widok (`view`) opisuje odwzorowanie:  screen = image * scale + pan

export function imageToScreen(point, view) {
  return {
    x: point.x * view.scale + view.panX,
    y: point.y * view.scale + view.panY,
  };
}

export function screenToImage(point, view) {
  return {
    x: (point.x - view.panX) / view.scale,
    y: (point.y - view.panY) / view.scale,
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Zoom "do kursora": zmienia skalę tak, by punkt obrazu znajdujący się pod
 * `anchor` (we współrzędnych sceny) został dokładnie w tym samym miejscu ekranu.
 */
export function zoomAt(view, anchor, nextScale) {
  const pivot = screenToImage(anchor, view);
  return {
    scale: nextScale,
    panX: anchor.x - pivot.x * nextScale,
    panY: anchor.y - pivot.y * nextScale,
  };
}

/**
 * Skala, przy której obraz mieści się w całości w scenie (z marginesem).
 * Nigdy nie powiększa ponad 1:1 — małe obrazki zostają w naturalnym rozmiarze.
 */
export function fitScale(imageSize, stageSize, padding = 24) {
  const availableW = Math.max(1, stageSize.width - padding * 2);
  const availableH = Math.max(1, stageSize.height - padding * 2);
  return Math.min(availableW / imageSize.width, availableH / imageSize.height, 1);
}

/** Widok, w którym obraz jest wyśrodkowany i dopasowany do sceny. */
export function fitView(imageSize, stageSize, padding = 24) {
  const scale = fitScale(imageSize, stageSize, padding);
  return centerView(imageSize, stageSize, scale);
}

/** Widok o zadanej skali, wyśrodkowany w scenie. */
export function centerView(imageSize, stageSize, scale) {
  return {
    scale,
    panX: (stageSize.width - imageSize.width * scale) / 2,
    panY: (stageSize.height - imageSize.height * scale) / 2,
  };
}

// --- znormalizowane współrzędne (0..1) <-> piksele obrazu -------------------
// Origin trzymamy znormalizowany, bo `transform-origin` w % jest znormalizowany
// i niezależny od rozmiaru obrazu. Wartości poza 0..1 są legalne.

export function toNormalized(pixelPoint, imageSize) {
  return { x: pixelPoint.x / imageSize.width, y: pixelPoint.y / imageSize.height };
}

export function toPixels(normalizedPoint, imageSize) {
  return { x: normalizedPoint.x * imageSize.width, y: normalizedPoint.y * imageSize.height };
}
