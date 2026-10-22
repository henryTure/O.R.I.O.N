// ORION – inställningar.
// Slå på en koppling med enabled: true och ange adressen (url).
// Lägg ALDRIG lösenord eller API-nycklar här: sajten är publik på GitHub Pages.
// Behövs en nyckel: låt en egen liten server hämta datan och peka url hit (se README).

export default {
  operator: "Henry",
  klass: "SAB2528",

  // Hur länge en källa får vara tyst innan den räknas som "Ingen kontakt" (millisekunder).
  timeout: 8000,

  sources: {
    // Skolschema. Förväntar JSON: { lektioner: [ { dag: 1-5, start: "08:20", slut: "09:20", amne: "Engelska 6", sal: "B12" } ] }
    schedule: { enabled: false, url: "", every: 300 },

    // Tradingboten. Förväntar JSON: { budget, resultatProcent, ordrar, historik: [ { tid, värde } ], status }
    trading: { enabled: false, url: "", every: 30 },

    // SMHI:s öppna prognos-API (ingen nyckel behövs). Slå på med enabled: true.
    weather: {
      enabled: true,
      every: 600,
      platser: [
        { namn: "Öckerö", lat: 57.7085, lon: 11.6516 },
        { namn: "Utpost Hållö", lat: 58.3376, lon: 11.2185 },
      ],
    },

    // Nyheter. Förväntar JSON: { nyheter: [ { kategori: "AI" | "Marknad" | "Sjö", rubrik, lank, tid } ] }
    news: { enabled: false, url: "", every: 900 },

    // GitHubs öppna API (ingen nyckel behövs för publika repon).
    github: { enabled: true, user: "henryTure", every: 600 },

    // Länkar. Räknas som kopplade så länge enheten är online.
    claude: {
      enabled: true,
      quick: "https://claude.ai/new",
      build: "https://claude.ai/code",
      board: "https://claude.ai/new?q=" + encodeURIComponent("Kör Styrelsen på: "),
    },
    spotify: { enabled: true, url: "https://open.spotify.com" },
  },

  // Skolknapparna: text som skickas till claude.ai/new?q=
  skola: [
    { namn: "Starta uppgift", text: "Jag ska börja på en skoluppgift. Ställ först några frågor om vad uppgiften går ut på, och hjälp mig sedan dela upp den i tydliga steg. Uppgiften: " },
    { namn: "Plugga prov", text: "Jag har prov snart och vill plugga. Förhör mig med en fråga i taget, rätta mina svar och förklara det jag missar. Ämne och område: " },
    { namn: "Förklara", text: "Förklara det här enkelt, steg för steg, med ett konkret exempel. Kolla sedan att jag har förstått med en kort fråga: " },
    { namn: "Granska text", text: "Granska min text. Peka ut stavning, grammatik, struktur och otydliga meningar, och föreslå förbättringar utan att skriva om allt åt mig. Texten: " },
  ],
};
