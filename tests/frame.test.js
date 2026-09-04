import { describe, it, expect } from 'vitest';
import { transformPoint, frameCorners, screenPolygon, IDENTITY_FRAME } from '../src/frame.js';

const IMAGE = { width: 800, height: 400 };
const CENTER = { x: 400, y: 200 };

function close(actual, expected, digits = 9) {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
}

describe('transformPoint', () => {
  it('bez transformacji zwraca ten sam punkt', () => {
    close(transformPoint({ x: 123, y: 45 }, CENTER, IDENTITY_FRAME), { x: 123, y: 45 });
  });

  it('nie rusza samego punktu originu — niezależnie od transformacji', () => {
    // To jest istota transform-origin: punkt zaczepienia stoi w miejscu.
    for (const frame of [
      { rotate: 90, scaleX: 1, scaleY: 1 },
      { rotate: 0, scaleX: 3, scaleY: 3 },
      { rotate: -37.5, scaleX: 0.4, scaleY: 2.2 },
    ]) {
      for (const origin of [CENTER, { x: 0, y: 0 }, { x: 800, y: 400 }]) {
        close(transformPoint(origin, origin, frame), origin);
      }
    }
  });

  it('obraca o 90° zgodnie z ruchem wskazówek (oś Y w dół)', () => {
    const rotated = transformPoint({ x: 500, y: 200 }, CENTER, { rotate: 90, scaleX: 1, scaleY: 1 });
    close(rotated, { x: 400, y: 300 });
  });

  it('skaluje względem originu, nie względem zera', () => {
    const scaled = transformPoint({ x: 500, y: 200 }, CENTER, { rotate: 0, scaleX: 2, scaleY: 2 });
    close(scaled, { x: 600, y: 200 });
  });

  it('składa skalę przed obrotem, tak jak CSS', () => {
    // rotate(90) scale(2,1) na wektorze (100, 0) => skala daje (200, 0), obrót (0, 200)
    const result = transformPoint({ x: 500, y: 200 }, CENTER, { rotate: 90, scaleX: 2, scaleY: 1 });
    close(result, { x: 400, y: 400 });
  });
});

describe('frameCorners', () => {
  it('bez transformacji daje prostokąt obrazu', () => {
    const corners = frameCorners(IMAGE, CENTER, IDENTITY_FRAME);
    expect(corners).toEqual([
      { x: 0, y: 0 },
      { x: 800, y: 0 },
      { x: 800, y: 400 },
      { x: 0, y: 400 },
    ]);
  });

  it('obrót o 90° wokół środka zamienia wymiary miejscami', () => {
    const corners = frameCorners(IMAGE, CENTER, { rotate: 90, scaleX: 1, scaleY: 1 });
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(IMAGE.height, 9);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(IMAGE.width, 9);
  });

  it('obrót wokół rogu zostawia ten róg na miejscu', () => {
    const corners = frameCorners(IMAGE, { x: 0, y: 0 }, { rotate: 33, scaleX: 1.5, scaleY: 1.5 });
    close(corners[0], { x: 0, y: 0 });
  });
});

describe('screenPolygon', () => {
  it('przekłada rogi przez widok sceny', () => {
    const view = { scale: 2, panX: 50, panY: 10 };
    const points = screenPolygon(IMAGE, CENTER, IDENTITY_FRAME, view);
    expect(points).toBe('50,10 1650,10 1650,810 50,810');
  });

  it('zwraca cztery pary współrzędnych', () => {
    const points = screenPolygon(IMAGE, CENTER, { rotate: 20, scaleX: 1.3, scaleY: 1.3 }, {
      scale: 0.5, panX: 0, panY: 0,
    });
    expect(points.split(' ')).toHaveLength(4);
    for (const pair of points.split(' ')) expect(pair).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
  });
});
