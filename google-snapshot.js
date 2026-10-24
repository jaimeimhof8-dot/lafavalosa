/* =========================================================
   LA FAVOLOSA – GOOGLE-SNAPSHOT (Fallback)
   ---------------------------------------------------------
   Echte Daten aus den Google-Maps-Einträgen der Lokale
   (Stand 24.10.2026). Sie werden nur gebraucht, wenn die
   Live-Abfrage (google.php) nicht läuft – z.B. in der
   Vorschau auf GitHub Pages/Netlify oder solange noch kein
   Google-API-Schlüssel eingetragen ist.

   Auf dem echten Server ersetzt google.php diese Daten
   automatisch durch die aktuellen Werte von Google.
   ========================================================= */

window.FAVOLOSA_GOOGLE = {
  ok: true,
  quelle: "snapshot",
  stand: "2026-10-24",

  /* Sternebewertung, Anzahl Bewertungen, Öffnungszeiten und Status je Lokal.
     zeiten: null = bei Google keine Zeiten hinterlegt (dann gelten die Zeiten aus content.js).
     status: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY"
     Zeiten nach Mitternacht: "24:00" = Mitternacht.                                          */
  lokale: {
    baelliz: {
      name: "Gelateria La Favolosa AG", rating: 4.6, count: 397, status: "CLOSED_TEMPORARILY",
      maps: "https://www.google.com/maps?cid=10109423871573241969",
      zeiten: null, ausnahmen: [],
    },
    muehleplatz: {
      name: "Gelateria Creperie Bar La Favolosa", rating: 4.5, count: 269, status: "OPERATIONAL",
      maps: "https://www.google.com/maps?cid=9364062621106215112",
      zeiten: {
        mo: [["09:00", "23:00"]], di: [["09:00", "23:00"]], mi: [["09:00", "23:00"]], do: [["09:00", "23:00"]],
        fr: [["09:00", "24:00"]], sa: [["09:00", "24:00"]], so: [["09:00", "23:00"]],
      },
      ausnahmen: [],
    },
    gwatt: {
      name: "La Favolosa", rating: 4.7, count: 233, status: "OPERATIONAL",
      maps: "https://www.google.com/maps?cid=7188131295465573532",
      zeiten: {
        mo: [["12:30", "18:00"]], di: [["12:30", "18:00"]], mi: [["12:30", "18:00"]], do: [["12:30", "18:00"]],
        fr: [["12:30", "18:00"]], sa: [["12:30", "18:00"]], so: [["09:30", "18:00"]],
      },
      ausnahmen: [],
    },
    bahnhof: {
      name: "Gelateria La Favolosa SBB", rating: 4.7, count: 14, status: "OPERATIONAL",
      maps: "https://www.google.com/maps?cid=16275741561550583362",
      zeiten: null, ausnahmen: [],
    },
    muensingen: {
      name: "Gelateria La Favolosa Münsingen", rating: 4.8, count: 19, status: "CLOSED_TEMPORARILY",
      maps: "https://www.google.com/maps?cid=3717433449721976912",
      zeiten: null, ausnahmen: [],
    },
  },

  /* Rezensionen im Wortlaut von Google Maps (Auszüge). Autor, Sterne und Zeitangabe wie bei Google. */
  bewertungen: [
    {
      lokal: "gwatt", autor: "T C", sterne: 5, zeit: "vor 3 Monaten", sprache: "de",
      text: "Die Gelateria Favolosa ist absolut einen Besuch wert! Das hausgemachte Glace ist hervorragend – man schmeckt die hohe Qualität und das echte Handwerk. Die Auswahl an Sorten ist gross und bietet für jeden Geschmack etwas. Auch der Kaffee ist ausgezeichnet, und das Frappee war ein echter Genuss. Dazu kommt ein sehr freundliches und herzliches Team, das den Besuch perfekt abrundet […]",
    },
    {
      lokal: "muehleplatz", autor: "Markus Friedli", sterne: 5, zeit: "vor 3 Monaten", sprache: "de",
      text: "[…] Das Eis wird täglich frisch hergestellt und überzeugt durch seinen natürlichen Geschmack sowie die hohe Qualität der Zutaten. Neben den klassischen Gelati gibt es auch feine Crêpes, Panini und ausgezeichneten italienischen Kaffee, wodurch sich das Angebot ideal ergänzt […]",
    },
    {
      lokal: "muehleplatz", autor: "Marco Bucher", sterne: 5, zeit: "vor 3 Monaten", sprache: "de",
      text: "Wir haben fast alle Sorten gekostet und sind begeistert von der Qualität vom Eis sowie der Waffel. Ein italienischer Hochgenuss mitten in Thun! Eine klare Weiterempfehlung […]",
    },
    {
      lokal: "gwatt", autor: "C. G.", sterne: 5, zeit: "vor 6 Monaten", sprache: "en",
      text: "I had a cup with two scoops: strawberry sorbet, which was really lovely, sweet but not overly so, and it tasted fresh and natural, not artificial at all. […] I also tried the Cremino Torinese, a hazelnut ice cream with Nutella-like swirls. […] Would absolutely recommend!",
    },
    {
      lokal: "muehleplatz", autor: "Xän Dar", sterne: 5, zeit: "vor 2 Monaten", sprache: "de",
      text: "[…] Alles war frisch zubereitet und geschmacklich wirklich sehr gut. Auch der Service war klasse. Das Personal war sehr freundlich, aufmerksam und hat sofort für eine angenehme Atmosphäre gesorgt […]",
    },
  ],
};
