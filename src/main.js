import './styles.css';

import { state, set, subscribe } from './state.js';
import { loadSettings, saveSettings } from './session.js';
import * as viewport from './viewport.js';
import * as picker from './picker.js';
import * as preview from './preview.js';
import * as loupe from './loupe.js';
import * as panel from './ui/panel.js';
import * as shortcuts from './ui/shortcuts.js';
import * as imageSource from './imageSource.js';

// Ustawienia z poprzedniej sesji wchodzą przed pierwszym renderem,
// żeby panel od razu pokazał właściwe wartości.
set(loadSettings());

viewport.init();
picker.init();
preview.init();
panel.init();
shortcuts.init();
imageSource.init();

let persistTimer = null;
// Zapis jest odroczony, więc zbieramy klucze ze wszystkich zmian z okna
// debounce'u — inaczej szybka zmiana po przesunięciu punktu gubiłaby origin.
const pendingChanges = new Set();

subscribe((s, changed) => {
  viewport.render(s);
  picker.render(s);
  preview.render(s);
  loupe.render(s);
  panel.render(s);

  for (const key of changed) pendingChanges.add(key);
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    saveSettings(s);
    if (pendingChanges.has('origin') || pendingChanges.has('image')) imageSource.persistOrigin();
    pendingChanges.clear();
  }, 400);
});

// Pierwszy render — bez obrazka pokazuje tylko ekran startowy.
panel.render(state);
