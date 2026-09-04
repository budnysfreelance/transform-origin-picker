import { describe, it, expect } from 'vitest';
import {
  imageToScreen,
  screenToImage,
  zoomAt,
  fitScale,
  fitView,
  centerView,
  toNormalized,
  toPixels,
} from '../src/coords.js';

const VIEWS = [
  { scale: 1, panX: 0, panY: 0 },
  { scale: 0.137, panX: -420.5, panY: 88 },
  { scale: 12.5, panX: 1000, panY: -3000 },
  { scale: 64, panX: 0.25, panY: 0.75 },
];

describe('imageToScreen / screenToImage', () => {
  it('są swoimi odwrotnościami dla dowolnego widoku', () => {
    for (const view of VIEWS) {
      for (const point of [{ x: 0, y: 0 }, { x: 1234.5, y: 6.25 }, { x: -80, y: 4000 }]) {
        const roundTrip = screenToImage(imageToScreen(point, view), view);
        expect(roundTrip.x).toBeCloseTo(point.x, 9);
        expect(roundTrip.y).toBeCloseTo(point.y, 9);
      }
    }
  });

  it('mapuje lewy górny róg obrazu na pan', () => {
    const view = { scale: 3, panX: 20, panY: 50 };
    expect(imageToScreen({ x: 0, y: 0 }, view)).toEqual({ x: 20, y: 50 });
  });
});

describe('zoomAt', () => {
  it('zostawia punkt pod kursorem dokładnie w miejscu', () => {
    const view = { scale: 2, panX: 130, panY: -40 };
    const anchor = { x: 517, y: 288 };
    const before = screenToImage(anchor, view);

    for (const nextScale of [0.5, 1, 4, 37.25, 64]) {
      const zoomed = zoomAt(view, anchor, nextScale);
      const after = screenToImage(anchor, zoomed);
      expect(after.x).toBeCloseTo(before.x, 9);
      expect(after.y).toBeCloseTo(before.y, 9);
      expect(zoomed.scale).toBe(nextScale);
    }
  });

  it('kolejne zoomy wokół tego samego punktu nie kumulują dryfu', () => {
    let view = { scale: 1, panX: 0, panY: 0 };
    const anchor = { x: 640, y: 360 };
    const pivot = screenToImage(anchor, view);

    for (let i = 0; i < 50; i++) view = zoomAt(view, anchor, view.scale * 1.12);
    for (let i = 0; i < 50; i++) view = zoomAt(view, anchor, view.scale / 1.12);

    const after = screenToImage(anchor, view);
    expect(after.x).toBeCloseTo(pivot.x, 6);
    expect(after.y).toBeCloseTo(pivot.y, 6);
  });
});

describe('fitScale / fitView', () => {
  const stage = { width: 1000, height: 600 };

  it('dla obrazu wysokiego i wąskiego ogranicza go wysokością', () => {
    // To jest regresja na bug prototypu: przy `object-fit: contain` obraz był
    // ograniczany wysokością, a marker liczony tak, jakby wypełniał szerokość.
    const image = { width: 800, height: 3000 };
    const scale = fitScale(image, stage, 24);
    expect(scale).toBeCloseTo((600 - 48) / 3000, 9);
    expect(image.height * scale).toBeLessThanOrEqual(600 - 48 + 1e-9);
    expect(image.width * scale).toBeLessThanOrEqual(1000 - 48);
  });

  it('dla obrazu szerokiego ogranicza go szerokością', () => {
    const image = { width: 6000, height: 400 };
    const scale = fitScale(image, stage, 24);
    expect(scale).toBeCloseTo((1000 - 48) / 6000, 9);
  });

  it('nie powiększa małych obrazów ponad 1:1', () => {
    expect(fitScale({ width: 32, height: 32 }, stage, 24)).toBe(1);
  });

  it('centruje obraz w scenie', () => {
    const image = { width: 800, height: 3000 };
    const view = fitView(image, stage, 24);
    const left = view.panX;
    const right = stage.width - (view.panX + image.width * view.scale);
    expect(left).toBeCloseTo(right, 9);
  });

  it('centerView respektuje narzuconą skalę', () => {
    const view = centerView({ width: 100, height: 100 }, stage, 2);
    expect(view.scale).toBe(2);
    expect(view.panX).toBe((1000 - 200) / 2);
    expect(view.panY).toBe((600 - 200) / 2);
  });
});

describe('normalizacja', () => {
  it('round-trip przez piksele obrazu', () => {
    const size = { width: 1920, height: 1080 };
    const normalized = { x: 0.3333, y: 0.75 };
    const back = toNormalized(toPixels(normalized, size), size);
    expect(back.x).toBeCloseTo(normalized.x, 12);
    expect(back.y).toBeCloseTo(normalized.y, 12);
  });

  it('dopuszcza wartości poza obrazem', () => {
    const size = { width: 200, height: 100 };
    expect(toPixels({ x: -0.5, y: 1.5 }, size)).toEqual({ x: -100, y: 150 });
  });
});
