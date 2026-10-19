# O.R.I.O.N

Personlig ledningscentral för Operatör Henry. En webbapp (PWA) som fungerar på mobil och dator
och kan läggas på hemskärmen som en app.

**Öppna:** https://henryture.github.io/O.R.I.O.N/

Stilregler (färger, typsnitt, former och animationer) finns i [`CLAUDE.md`](CLAUDE.md).

## Filer

| Fil | Vad den gör |
|-----|-------------|
| `index.html` | Sidan och alla paneler |
| `config.js` | **Här slår du på kopplingar** och anger adresser |
| `css/orion.css` | Utseendet |
| `src/sources/` | En liten adapter per datakälla (`trading.js`, `weather.js`, `schedule.js`, `news.js`, `github.js` …) |
| `src/panels.js` | Ritar varje panel utifrån adapterns svar |
| `src/core.js` | Kärnan, den roterande sfären |
| `src/boot.js` | Uppstartssekvensen |
| `sw.js` | Gör att appen kan installeras och startas utan nät |

Varje adapter svarar alltid i samma form:

```js
{ status: "ok" | "off" | "error", updated: Date, data: { … } }
```

- `off`: ej kopplad. Panelen visar exempeldata märkt EXEMPEL, och lampan är en bärnstensfärgad ring.
- `ok`: kopplad. Lampan lyser grönt.
- `error`: källan svarar inte. Panelen visar "Ingen kontakt" och lampan blir röd. Resten av sidan fungerar som vanligt.

## Slå på en färdig koppling

Öppna `config.js` på GitHub (pennan uppe till höger), ändra och spara ("Commit changes").
Sidan uppdateras automatiskt efter någon minut.

- **SMHI:** sätt `weather.enabled: true`. Ingen nyckel behövs.
- **GitHub:** sätt `github.enabled: true`. Projektloggen visar dina senaste ändringar.
- **Tradingboten:** sätt `trading.enabled: true` och `trading.url: "https://din-bot.example/status"`.
  Boten ska svara med JSON:
  ```json
  { "budget": 1000, "resultatProcent": 4.2, "ordrar": 17,
    "historik": [ { "tid": "2026-10-19T09:00", "värde": 1000 }, { "tid": "2026-10-19T10:00", "värde": 1012 } ],
    "status": "simulerad" }
  ```
  Boten måste tillåta anrop från webbläsaren (CORS-huvudet `Access-Control-Allow-Origin: https://henryture.github.io`).
- **Schema** och **Underrättelse:** behöver en liten server först, se nedan. Formatet står i `config.js`.

## Koppla in en ny datakälla i tre steg

1. **Skapa adaptern.** Kopiera `src/sources/news.js` till exempel till `src/sources/hamn.js`.
   Ändra `id`, `namn` och `lamp`. Sätt `lamp` till ett namn, som `"HAMN"`, om källan ska få en lampa i sidhuvudet, annars `null`.
   Låt `load()` returnera `example(...)` när den är avstängd och `result("ok", data)` när den har hämtat.
   Fel behöver du inte hantera själv, eftersom de automatiskt blir "Ingen kontakt".
2. **Registrera den.** Lägg till `import * as hamn from "./hamn.js";` och `hamn` i listan i `src/sources/index.js`,
   och lägg till `hamn: { enabled: false, url: "", every: 300 }` under `sources` i `config.js`.
3. **Visa den.** Lägg till en panel i `index.html` (kopiera en befintlig `<section class="panel">`) och en funktion
   `hamn(r) { … }` i `src/panels.js` som skrivs in i listan `panels` längst ner. Lampan och systemloggen sköts automatiskt.

Lägg också till de nya filerna i listan i `sw.js` och höj `VERSION` där.

## Lösenord och API-nycklar

GitHub Pages är **publikt**. Allt i det här repot kan läsas av vem som helst, så **lägg aldrig lösenord,
tokens eller API-nycklar i koden eller i `config.js`.**

När en källa kräver en nyckel (Skolschema, Spotify "spelas nu", betalda nyhets- eller börs-API:er)
gör du så här:

1. Skapa en liten server (till exempel Node på Render.com, Cloudflare Workers eller Netlify Functions).
2. Lägg nyckeln som **miljövariabel** i serverns inställningar, aldrig i koden.
3. Servern hämtar datan med nyckeln, gör om den till den enkla JSON-form som adaptern väntar sig
   och svarar med CORS-huvudet `Access-Control-Allow-Origin: https://henryture.github.io`.
4. Lägg serverns adress som `url` i `config.js`. Adressen är inte hemlig, men nyckeln stannar på servern.

Ett exempel: en server med `GET /schema` som loggar in mot Skolschema, hämtar veckan för SAB2528
och svarar med `{ "lektioner": [ { "dag": 1, "start": "08:20", "slut": "09:40", "amne": "Navigation", "sal": "B12" } ] }`.

## Publicera med GitHub Pages (görs en gång)

1. Gå till repot på github.com: **henryTure/O.R.I.O.N**.
2. Klicka **Settings** (kugghjulet) och sedan **Pages** i vänstermenyn.
3. Under **Build and deployment** väljer du *Source: Deploy from a branch*.
4. Välj *Branch: `main`* och mappen */ (root)*. Klicka **Save**.
5. Vänta 1–2 minuter och ladda om sidan. Överst står adressen: https://henryture.github.io/O.R.I.O.N/

Efter det publiceras varje ändring på `main` automatiskt.

**Lägg på hemskärmen:** öppna adressen i Safari (iPhone), tryck *Dela* och sedan *Lägg till på hemskärmen*.
På Android väljer du i Chrome menyn och sedan *Installera app*.
