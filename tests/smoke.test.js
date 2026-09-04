/**
 * @vitest-environment jsdom
 *
 * Test dymny całego okablowania: ładuje prawdziwy index.html, uruchamia
 * main.js i sprawdza, że nic nie wybucha. Łapie to, czego testy czystych
 * funkcji nie złapią — literówki w id, brakujące eksporty, błędy w init().
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// W środowisku jsdom import.meta.url jest adresem http://, więc idziemy od cwd.
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));

let dom;
let state;
let actions;

beforeAll(async () => {
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');

  // jsdom nie ma tych API — w przeglądarce są zawsze.
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  // jsdom bez pakietu `canvas` i tak zwraca null, tylko hałasuje na stderr.
  window.HTMLCanvasElement.prototype.getContext = () => null;

  await import('../src/main.js');
  ({ dom } = await import('../src/dom.js'));
  ({ state } = await import('../src/state.js'));
  actions = await import('../src/actions.js');
});

describe('okablowanie DOM', () => {
  it('każdy element z dom.js istnieje w index.html', () => {
    const missing = Object.entries(dom)
      .filter(([, element]) => !element)
      .map(([key]) => key);
    expect(missing).toEqual([]);
  });

  it('startuje na ekranie startowym, bez obrazka', () => {
    expect(state.image).toBeNull();
    expect(dom.stage.hidden).toBe(true);
    expect(dom.panel.hidden).toBe(true);
    expect(dom.dropzone.hidden).toBe(false);
  });
});

describe('akcje na punkcie', () => {
  it('klamruje origin do rozsądnego zakresu wokół obrazu', () => {
    expect(actions.clampOrigin({ x: -3, y: 9 })).toEqual({ x: -0.5, y: 1.5 });
    expect(actions.clampOrigin({ x: 0.25, y: 1.2 })).toEqual({ x: 0.25, y: 1.2 });
  });

  it('commitOrigin zmienia stan i pozwala go cofnąć', () => {
    actions.resetHistory({ x: 0.5, y: 0.5 });
    actions.commitOrigin({ x: 0.25, y: 0.75 });
    expect(state.origin).toEqual({ x: 0.25, y: 0.75 });

    actions.undo();
    expect(state.origin).toEqual({ x: 0.5, y: 0.5 });

    actions.redo();
    expect(state.origin).toEqual({ x: 0.25, y: 0.75 });
  });

  it('seria nudge’ów to jeden krok cofnięcia, a nie dziesięć', () => {
    // Bez sklejania Cmd+Z po dociskaniu strzałkami cofałby po 0.1 px.
    state.image = { width: 1000, height: 1000, el: null, name: 't', blob: null };
    actions.commitOrigin({ x: 0.5, y: 0.5 });
    actions.resetHistory(state.origin);
    for (let i = 0; i < 10; i++) actions.nudge(1, 0, 1);

    expect(state.origin.x).toBeCloseTo(0.51, 9);
    actions.undo();
    expect(state.origin).toEqual({ x: 0.5, y: 0.5 });
    state.image = null;
  });
});

describe('eksport', () => {
  it('składa CSS z bieżącego punktu i szablonu', () => {
    state.image = { width: 800, height: 400, el: null, name: 't', blob: null };
    actions.commitOrigin({ x: 0.25, y: 0.5 });

    expect(actions.currentCss()).toBe('transform-origin: 25% 50%;');

    state.template = 'origin-[{x}_{y}]';
    expect(actions.currentCss()).toBe('origin-[25%_50%]');

    state.template = 'transform-origin: {value};';
    state.unit = 'px';
    expect(actions.currentCss()).toBe('transform-origin: 200px 200px;');

    state.unit = 'pct';
    state.image = null;
  });
});
