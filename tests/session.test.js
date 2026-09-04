import { describe, it, expect } from 'vitest';
import { migrateSettings } from '../src/session.js';

describe('migrateSettings', () => {
  it('zamienia nieobsługiwaną jednostkę na procenty', () => {
    // Zapis sprzed usunięcia słów kluczowych — bez tego panel pokazałby
    // pusty segment, a eksport poleciałby nieobsłużoną ścieżką.
    expect(migrateSettings({ unit: 'keyword' }).unit).toBe('pct');
    expect(migrateSettings({ unit: 'rem' }).unit).toBe('pct');
  });

  it('zostawia poprawne jednostki bez zmian', () => {
    expect(migrateSettings({ unit: 'pct' }).unit).toBe('pct');
    expect(migrateSettings({ unit: 'px' }).unit).toBe('px');
  });

  it('nie rusza pozostałych ustawień', () => {
    const settings = { unit: 'keyword', precision: 2, snap: false, template: 'x{value}' };
    expect(migrateSettings(settings)).toEqual({ ...settings, unit: 'pct' });
  });

  it('przepuszcza zapis bez jednostki', () => {
    expect(migrateSettings({ precision: 0 })).toEqual({ precision: 0 });
  });
});
