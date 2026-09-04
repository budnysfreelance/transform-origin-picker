// Zamiana originu (znormalizowanego) na tekst CSS. Czyste funkcje — testowane.

const X_KEYWORDS = [[0, 'left'], [0.5, 'center'], [1, 'right']];
const Y_KEYWORDS = [[0, 'top'], [0.5, 'center'], [1, 'bottom']];
const EPSILON = 1e-9;

/**
 * Zaokrągla i obcina zbędne zera: 50.00 -> "50", 33.333 -> "33.33".
 * Świadomie przez toFixed, a nie Math.round: Math.round zaokrągla połówki
 * w stronę +∞, więc 25.55 i -25.55 poszłyby w przeciwne strony. toFixed
 * działa na module liczby, więc znak nie zmienia wyniku. parseFloat zdejmuje
 * końcowe zera i "-0".
 */
export function formatNumber(value, precision) {
  return String(Number.parseFloat(value.toFixed(precision)));
}

function keywordFor(value, table) {
  for (const [target, name] of table) {
    if (Math.abs(value - target) < EPSILON) return name;
  }
  return null;
}

/**
 * Słowa kluczowe CSS — tylko gdy punkt trafia dokładnie w jeden z 9 węzłów.
 * Zwraca null, jeśli nie trafia (wtedy trzeba użyć wartości liczbowej).
 */
export function toKeywords(origin) {
  const x = keywordFor(origin.x, X_KEYWORDS);
  const y = keywordFor(origin.y, Y_KEYWORDS);
  if (x === null || y === null) return null;
  return { x, y, value: x === 'center' && y === 'center' ? 'center' : `${x} ${y}` };
}

/**
 * @param {{x:number,y:number}} origin  znormalizowany (0..1, może wyjść poza)
 * @param {{width:number,height:number}} imageSize
 * @param {{unit?: 'pct'|'px'|'keyword', precision?: number}} options
 * @returns {{x:string, y:string, value:string, unit:string}}
 */
export function formatOrigin(origin, imageSize, options = {}) {
  const { unit = 'pct', precision = 1 } = options;

  if (unit === 'keyword') {
    const keywords = toKeywords(origin);
    if (keywords) return { ...keywords, unit: 'keyword' };
    // Punkt nie leży na węźle — spadamy do procentów zamiast kłamać.
  }

  if (unit === 'px') {
    const x = `${formatNumber(origin.x * imageSize.width, precision)}px`;
    const y = `${formatNumber(origin.y * imageSize.height, precision)}px`;
    return { x, y, value: `${x} ${y}`, unit: 'px' };
  }

  const x = `${formatNumber(origin.x * 100, precision)}%`;
  const y = `${formatNumber(origin.y * 100, precision)}%`;
  return { x, y, value: `${x} ${y}`, unit: 'pct' };
}

/** Podstawia {value} / {x} / {y} w szablonie użytkownika. */
export function applyTemplate(template, formatted) {
  return template
    .split('{value}').join(formatted.value)
    .split('{x}').join(formatted.x)
    .split('{y}').join(formatted.y);
}
