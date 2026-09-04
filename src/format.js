// Zamiana originu (znormalizowanego) na tekst CSS. Czyste funkcje — testowane.

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

/**
 * @param {{x:number,y:number}} origin  znormalizowany (0..1, może wyjść poza)
 * @param {{width:number,height:number}} imageSize
 * @param {{unit?: 'pct'|'px', precision?: number}} options
 * @returns {{x:string, y:string, value:string, unit:string}}
 */
export function formatOrigin(origin, imageSize, options = {}) {
  const { unit = 'pct', precision = 1 } = options;

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
