# Transform Origin Picker

Narzędzie do **szybkiego i precyzyjnego** ustawiania CSS-owego `transform-origin` na zdjęciu.
Wrzucasz obrazek, klikasz punkt, widzisz na żywo jak obraz się wokół niego transformuje,
dociskasz co do piksela i kopiujesz gotowy CSS.

Wszystko dzieje się lokalnie w przeglądarce — żaden obrazek nigdzie nie jest wysyłany.

## Dlaczego

Ustawianie `transform-origin` „na oko" to pętla: zgadnij wartość → wklej do kodu → odśwież →
źle → powtórz. Tutaj podgląd używa dokładnie tego `transform-origin`, który skopiujesz,
więc pętla znika.

## Funkcje

- **Podgląd na żywo** — presety `pulse`, `spin`, `zoom`, `flip` albo ręczne sterowanie skalą
  i obrotem (suwak albo wpisana wartość). Opcjonalnie animacja bezpośrednio w scenie.
- **Widoczna krawędź kadru** — zdjęcia z przezroczystym tłem dostają obramowanie rysowane
  w warstwie ekranowej, więc linia jest zawsze tak samo cienka niezależnie od zoomu
  i podąża za zdjęciem także w trakcie animacji.
- **Precyzja co do piksela** — zoom do 64×, lupa z siatką pikseli, krok strzałkami
  liczony w pikselach źródła (a nie w procentach), sub-pixel na `⌥`.
- **Przyciąganie** do rogów, środków krawędzi, ćwiartek i tercji — z podświetleniem osi,
  która złapała, i chwilowym wyłączeniem na `⌥`.
- **Szybkie wejście** — drag & drop w dowolne miejsce okna, `⌘V` ze schowka,
  presety 9 punktów pod klawiszami `1`–`9`.
- **Eksport** — `%` albo `px`, precyzja 0–2 miejsc, własny szablon
  (np. `origin-[{x}_{y}]` dla Tailwinda), auto-kopiowanie przy każdej zmianie.
- **Historia i sesja** — `⌘Z`/`⌘⇧Z`, trzy przypięte punkty A/B/C do porównywania
  kandydatów, powrót do ostatniego obrazka po odświeżeniu strony.

## Skróty klawiszowe

| Klawisz | Akcja | | Klawisz | Akcja |
|---|---|---|---|---|
| klik / przeciągnij | ustaw punkt | | kółko myszy | zoom do kursora |
| strzałki | krok o 1 px obrazu | | spacja + przeciągnij | przesuń widok |
| `⇧` + strzałki | ×10 | | `⌘0` / `⌘9` | dopasuj / 100 % |
| `⌥` + strzałki | 0.1 px | | `+` / `−` | przybliż / oddal |
| `1`–`9` | presety siatki (układ numpada) | | `P` · `I` | podgląd · animacja w scenie |
| `A` / `B` / `C` | skok do przypiętego punktu | | `S` · `L` | przyciąganie · lupa |
| `⇧` + `A`/`B`/`C` | przypnij bieżący punkt | | `⌘C` · `⌘V` | kopiuj CSS · wklej obrazek |
| `⌘Z` · `⌘⇧Z` | cofnij · ponów | | `O` · `Esc` · `?` | otwórz · nowy · pomoc |

Na Windowsie/Linuksie `⌘` to `Ctrl`, a `⌥` to `Alt`.

## Uruchomienie

Repo jest prywatne. Dostęp nadaje właściciel w *Settings → Collaborators*; potem:

```bash
git clone git@github.com:<użytkownik>/transform-origin-picker.git
cd transform-origin-picker
npm install
npm run dev      # http://localhost:5173
```

Pozostałe komendy:

```bash
npm test         # testy jednostkowe + test dymny
npm run build    # dist/index.html — jeden samodzielny plik
```

Build jest w całości inline'owany, więc `dist/index.html` można otworzyć zwykłym
dwuklikiem z dysku (`file://`) i podać dalej jako pojedynczy plik — bez Node'a
i bez hostingu.

## Jak to działa

Precyzja stoi na jawnej transformacji widoku zamiast na `object-fit` i pomiarach DOM-u:

```
screen = image * scale + pan
```

Origin trzymany jest jako współrzędne znormalizowane (0..1, wartości poza zakresem są
legalne — `transform-origin` może wyjść poza box), a przeliczenia siedzą w czystych,
przetestowanych funkcjach w [`src/coords.js`](src/coords.js) i [`src/format.js`](src/format.js).

Obramowanie zdjęcia stoi na tej samej zasadzie: [`src/frame.js`](src/frame.js) liczy cztery rogi
po transformacji podglądu (`p' = o + R(θ)·S·(p − o)`) i dopiero wynik przechodzi przez widok sceny.
Dzięki temu linia nigdy nie przechodzi przez `scale()` i zachowuje stałą grubość.

| Plik | Odpowiedzialność |
|---|---|
| `src/coords.js` | przeliczenia image ↔ screen, zoom do kursora, dopasowanie |
| `src/format.js` | formatowanie `%` / `px`, szablony eksportu |
| `src/frame.js` | rogi zdjęcia po transformacji — obramowanie kadru |
| `src/viewport.js` | zoom, pan, rozmiar sceny |
| `src/picker.js` | klik, przeciąganie, przyciąganie, marker i prowadnice |
| `src/preview.js` | pętla animacji podglądu |
| `src/loupe.js` | lupa pikseli na canvasie |
| `src/actions.js` | akcje użytkownika — jedyne miejsce zapisujące historię |
| `src/session.js` | ustawienia w localStorage, ostatni obrazek w IndexedDB |

## Backlog

- Wiele obrazków naraz z filmstripem i osobnym originem dla każdego
- Trzecia oś (`transform-origin: x y z`) dla transformacji 3D
- Eksport całego `@keyframes`, nie samej linijki
- Porównanie A/B obok siebie, zamiast przełączania
- Tryb offline (PWA)

## Licencja

MIT — patrz [LICENSE](LICENSE).
