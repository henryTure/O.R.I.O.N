# ORION – stilregler

ORION är en personlig ledningscentral (PWA) för Operatör Henry. Den här filen gäller
alla ändringar i repot. Håll stilen exakt, även när nya paneler läggs till.

## Känsla
- Mörk taktisk ledningscentral, militär och filmisk.
- Ingen kopia av filmer, spel eller varumärken. Inga logotyper.
- Allt text i gränssnittet är på svenska.

## Färger (definieras som CSS-variabler i `css/orion.css`, använd alltid variablerna)
| Variabel     | Värde     | Användning                                     |
|--------------|-----------|------------------------------------------------|
| `--bg`       | `#05080A` | Bakgrund, nästan svart                         |
| `--panel`    | `#0A1114` | Panelernas yta                                 |
| `--line`     | `#1A2A2E` | Tunna kanter och avdelare                      |
| `--accent`   | `#46D6C6` | Turkos: accent, kopplad, aktiv, hörnmarkeringar |
| `--warn`     | `#F0B44C` | Bärnsten: varning, ej kopplad, simulerat        |
| `--alarm`    | `#E5484D` | Röd: larm, ingen kontakt                        |
| `--text`     | `#C8D3D5` | Ljusgrå brödtext                                |
| `--dim`      | `#6E8286` | Dämpad text, etiketter                          |
| `--ice`      | `#A8DCFF` | Blåvit: kärnans läge ANALYSERAR                 |

Kärnans lägen: VILA = turkos, LYSSNAR = bärnsten, ANALYSERAR = blåvit. Färgen glider mjukt mellan dem.

Bakgrunden har ett svagt rutnät och diskreta skanningslinjer. Lägg aldrig till nya färger
utan att de först läggs in här och som variabel.

## Typsnitt
- **Chakra Petch** för rubriker och stora siffror: VERSALER, brett spärrade (`letter-spacing` 0.2–0.45em).
- **IBM Plex Mono** för allt annat.
- Etiketter: små versaler, spärrade, färg `--dim`.

## Former
- Paneler: tunn kant (`1px solid var(--line)`) och hörnmarkeringar i accentfärg
  (uppe till vänster och nere till höger; kärnan har alla fyra hörn).
- **Inga rundade hörn** (`border-radius: 0` överallt). **Inga emojis.** Inga skuggor utom glöd i accentfärg.
- Knappar: rektangulära, tunn kant, versaler, ljussvep vid hover.
- Märken (badges) uppe till höger i panelen: tunn kant, liten spärrad text.

## Status
- Lampor: fylld turkos ruta = kopplad (`ok`), bärnstensfärgad ihålig ruta = ej kopplad (`off`),
  fylld röd ruta = ingen kontakt (`error`).
- Exempeldata märks alltid tydligt EXEMPEL/EXEMPELDATA. Trading märks alltid SIMULERAD.

## Animationer
- Uppstart: ORION, statusrader en i taget, laddningslinje, tonar bort.
- Panelerna glider in en i taget med ett ljust skanningssvep.
- Siffror räknar upp, grafer ritas fram, lampor blinkar svagt.
- Kärnan: 3D-sfär av ljuspunkter i canvas (`src/core.js`).
- Allt måste respektera `prefers-reduced-motion` (inga rörelser, bara slutläget).

## Data
- Varje panel hämtar via en adapter i `src/sources/`. Varje adapter returnerar
  `{ status: "ok" | "off" | "error", updated, data }`.
- Inställningar i `config.js`. **Inga lösenord eller API-nycklar i koden** – sajten är publik.
- En källa som inte svarar får aldrig påverka resten av sidan.

## Teknik
- Ren HTML/CSS/JS med ES-moduler, inget byggsteg. Relativa sökvägar (sajten ligger under en undermapp på GitHub Pages).
- Vid ändring av filer: höj `VERSION` i `sw.js` så att mobilen hämtar nya versionen.
