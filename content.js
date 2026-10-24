/* =========================================================
   LA FAVOLOSA – INHALTE ZUM ANPASSEN
   ---------------------------------------------------------
   Hier können Öffnungszeiten, Ausnahmen, Sorten und Jobs
   geändert werden, ohne den Rest der Website anzufassen.

   Regeln:
   - Texte immer in "Anführungszeichen".
   - Zeiten im Format "HH:MM", z.B. "09:30".
   - Ein geschlossener Tag: null  (ohne Anführungszeichen); "24:00" = Mitternacht.
   - Datum im Format "JJJJ-MM-TT", z.B. "2026-12-24".
   - Nach jedem Eintrag in einer Liste ein Komma – ausser beim letzten.
   ========================================================= */

window.FAVOLOSA = {

  /* Hinweis-Banner ganz oben (z.B. "Heute wegen Regen ab 16:00 geschlossen").
     aktiv: true = anzeigen, false = ausblenden. "bis" = letzter Tag der Anzeige. */
  hinweis: {
    aktiv: false,
    text: "Heute wegen Regen alle Lokale ab 16:00 geschlossen.",
    bis: "2026-10-13",
  },

  /* Reguläre Öffnungszeiten pro Lokal – nur NOTFALL-WERTE.
     Angezeigt werden die Zeiten aus dem Google-Unternehmensprofil (google.php bzw. google-snapshot.js).
     Diese Liste gilt nur für Lokale, bei denen Google keine Zeiten hat, oder wenn Google nicht erreichbar ist.
     Zeiten also am besten direkt in Google Maps pflegen (business.google.com). */
  lokale: {
    baelliz: {
      zeiten: { mo: ["12:30", "17:30"], di: ["12:30", "17:30"], mi: ["12:30", "17:30"], do: ["12:30", "17:30"], fr: ["12:30", "17:30"], sa: ["12:30", "17:30"], so: ["12:30", "17:30"] },
    },
    muehleplatz: {
      zeiten: { mo: ["09:00", "23:00"], di: ["09:00", "23:00"], mi: ["09:00", "23:00"], do: ["09:00", "23:00"], fr: ["09:00", "24:00"], sa: ["09:00", "24:00"], so: ["09:00", "23:00"] },
    },
    gwatt: {
      zeiten: { mo: ["12:30", "18:00"], di: ["12:30", "18:00"], mi: ["12:30", "18:00"], do: ["12:30", "18:00"], fr: ["12:30", "18:00"], sa: ["12:30", "18:00"], so: ["09:30", "18:00"] },
    },
    bahnhof: {
      zeiten: { mo: ["08:00", "21:30"], di: ["08:00", "21:30"], mi: ["08:00", "21:30"], do: ["08:00", "21:30"], fr: ["08:00", "21:30"], sa: ["08:00", "21:30"], so: ["08:00", "21:30"] },
    },
    muensingen: {
      zeiten: { mo: null, di: null, mi: null, do: null, fr: null, sa: null, so: null },
      // Saisonpause: bis zu diesem Datum wird "Winterpause" angezeigt.
      pauseBis: "2027-03-01",
      pauseText: "Winterpause",
    },
  },

  /* Ausnahmen für einzelne Tage (Feiertage, Wetter, Events).
     lokal: "baelliz" | "muehleplatz" | "gwatt" | "bahnhof" | "muensingen" | "alle"
     zeiten: null = ganzer Tag geschlossen, oder z.B. ["12:00", "16:00"]        */
  ausnahmen: [
    // { lokal: "alle",  datum: "2026-12-25", zeiten: null, text: "Weihnachten" },
    // { lokal: "gwatt", datum: "2026-10-20", zeiten: ["12:30", "16:00"], text: "Privatanlass" },
  ],

  /* Sorten-Vorgeschmack auf der Startseite. */
  sorten: {
    milch: ["Fior di Latte", "Stracciatella", "Pistacchio", "Nocciola", "Cioccolato", "Caffè", "Vaniglia", "Amarena", "Jamaica", "Joghurt", "Tiramisù", "Cookies"],
    sorbet: ["Fragola", "Mango", "Limone", "Banana", "Lampone", "Frutto della Passione", "Frutti di Bosco"],
  },

  /* Offene Stellen. Leere Liste [] = Karte zeigt "Aktuell keine offenen Stellen". */
  jobs: {
    saison: "2027",
    stellen: ["Gelato-Produktion", "Gelati-Verkauf", "Service", "Barista", "Lieferungen (Führerausweis B)"],
  },
};
