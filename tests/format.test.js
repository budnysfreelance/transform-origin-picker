import { describe, it, expect } from 'vitest';
import { formatNumber, formatOrigin, applyTemplate } from '../src/format.js';

const IMAGE = { width: 1920, height: 1080 };

describe('formatNumber', () => {
  it('obcina zbędne zera', () => {
    expect(formatNumber(50, 2)).toBe('50');
    expect(formatNumber(33.3333, 1)).toBe('33.3');
    expect(formatNumber(33.3333, 2)).toBe('33.33');
    expect(formatNumber(33.3333, 0)).toBe('33');
  });

  it('nie produkuje "-0"', () => {
    expect(formatNumber(-0.004, 1)).toBe('0');
  });

  it('radzi sobie z wartościami ujemnymi i > 100', () => {
    expect(formatNumber(-25.56, 1)).toBe('-25.6');
    expect(formatNumber(142.05, 1)).toBe('142.1');
  });

  it('zaokrągla symetrycznie względem znaku', () => {
    // Bez tego 25.55 i -25.55 lądowały po przeciwnych stronach (Math.round
    // zaokrągla połówki w stronę +∞), co dawało niespójny origin poza obrazem.
    for (const value of [25.55, 0.15, 142.05, 7.125]) {
      expect(formatNumber(-value, 1)).toBe(`-${formatNumber(value, 1)}`);
    }
  });
});

describe('formatOrigin — procenty', () => {
  it('domyślnie zwraca procenty', () => {
    expect(formatOrigin({ x: 0.5, y: 1 / 3 }, IMAGE)).toMatchObject({
      x: '50%',
      y: '33.3%',
      value: '50% 33.3%',
    });
  });

  it('respektuje precyzję', () => {
    const origin = { x: 1 / 3, y: 2 / 3 };
    expect(formatOrigin(origin, IMAGE, { precision: 0 }).value).toBe('33% 67%');
    expect(formatOrigin(origin, IMAGE, { precision: 2 }).value).toBe('33.33% 66.67%');
  });

  it('przepuszcza origin poza obrazem', () => {
    expect(formatOrigin({ x: -0.25, y: 1.5 }, IMAGE).value).toBe('-25% 150%');
  });
});

describe('formatOrigin — piksele', () => {
  it('przelicza na piksele źródła', () => {
    expect(formatOrigin({ x: 0.5, y: 0.5 }, IMAGE, { unit: 'px' }).value).toBe('960px 540px');
  });

  it('zachowuje część ułamkową przy większej precyzji', () => {
    const origin = { x: 1 / 3, y: 0 };
    expect(formatOrigin(origin, IMAGE, { unit: 'px', precision: 0 }).x).toBe('640px');
    expect(formatOrigin({ x: 0.1234, y: 0 }, IMAGE, { unit: 'px', precision: 2 }).x).toBe('236.93px');
  });
});

describe('applyTemplate', () => {
  const formatted = formatOrigin({ x: 0.5, y: 1 / 3 }, IMAGE);

  it('podstawia {value}', () => {
    expect(applyTemplate('transform-origin: {value};', formatted))
      .toBe('transform-origin: 50% 33.3%;');
  });

  it('podstawia {x} i {y} osobno', () => {
    expect(applyTemplate('origin-[{x}_{y}]', formatted)).toBe('origin-[50%_33.3%]');
  });

  it('podstawia wszystkie wystąpienia', () => {
    expect(applyTemplate('{x} {x} {y}', formatted)).toBe('50% 50% 33.3%');
  });
});
