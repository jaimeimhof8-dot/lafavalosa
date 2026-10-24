/* La Favolosa – Admin-DEMO (ohne Server)
   Für Vorschau-Hosts ohne PHP (GitHub Pages, Netlify): Der Admin arbeitet hier komplett im Browser.
   Gespeichert wird in localStorage; die Demo-Website (main.js) liest dieselben Daten.
   Die Änderungen sind nur in diesem Browser sichtbar – nie für andere Besucher.
   Wird von admin/index.html geladen, nicht von admin/index.php (Live-Version). */

(() => {
  const KEY = "favolosa-demo-content";
  const HIST = "favolosa-demo-history";
  const MAX_HISTORY = 20;
  const LOKALE = {
    alle: "Alle Lokale", baelliz: "Bälliz", muehleplatz: "Mühleplatz",
    gwatt: "Gwatt", bahnhof: "Bahnhof Thun", muensingen: "Münsingen",
  };
  const base = window.FAVOLOSA || {};

  const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  // sv-SE liefert JJJJ-MM-TT
  const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date());

  const editable = (src) => ({
    hinweis: src.hinweis || { aktiv: false, text: "", bis: "" },
    sorten: src.sorten || { milch: [], sorbet: [] },
    jobs: src.jobs || { saison: "", stellen: [] },
    ausnahmen: src.ausnahmen || [],
  });

  /* ---------- Bereinigung wie im PHP-Admin ---------- */
  const text = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
  const list = (arr, maxLen, maxCount) => {
    const seen = new Set();
    const out = [];
    (Array.isArray(arr) ? arr : []).forEach((x) => {
      const t = text(x, maxLen);
      if (!t || seen.has(t.toLowerCase()) || out.length >= maxCount) return;
      seen.add(t.toLowerCase());
      out.push(t);
    });
    return out;
  };
  const validDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00"));
  const validTime = (s) => typeof s === "string" && (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s) || s === "24:00");

  function normalize(d) {
    const h = d.hinweis || {};
    const now = today();
    const ausnahmen = (Array.isArray(d.ausnahmen) ? d.ausnahmen : [])
      .filter((a) => a && validDate(a.datum) && a.datum >= now && LOKALE[a.lokal])
      .map((a) => ({
        lokal: a.lokal,
        datum: a.datum,
        zeiten: Array.isArray(a.zeiten) && a.zeiten.length === 2 && validTime(a.zeiten[0]) && validTime(a.zeiten[1]) && a.zeiten[0] < a.zeiten[1] ? [a.zeiten[0], a.zeiten[1]] : null,
        text: text(a.text, 80),
      }))
      .sort((x, y) => (x.datum + x.lokal).localeCompare(y.datum + y.lokal))
      .slice(0, 100);
    return {
      hinweis: { aktiv: !!h.aktiv, text: text(h.text, 160), bis: validDate(h.bis) ? h.bis : "" },
      sorten: { milch: list((d.sorten || {}).milch, 40, 60), sorbet: list((d.sorten || {}).sorbet, 40, 60) },
      jobs: { saison: text((d.jobs || {}).saison, 20), stellen: list((d.jobs || {}).stellen, 60, 30) },
      ausnahmen,
    };
  }

  const current = () => editable(Object.assign({}, base, read(KEY, {})));
  const reply = (message) => ({ ok: true, message, data: current(), canUndo: read(HIST, []).length > 0 });

  window.AdminDemo = {
    lokale: LOKALE,
    today,
    initial() {
      return { data: current(), lokale: LOKALE, canUndo: read(HIST, []).length > 0, today: today() };
    },
    async post(body) {
      if (body.action === "save") {
        const history = read(HIST, []);
        history.push(current());
        if (!write(KEY, normalize(body.data || {}))) {
          return { ok: false, message: "Speichern im Browser nicht möglich (Speicher gesperrt oder voll)." };
        }
        write(HIST, history.slice(-MAX_HISTORY));
        return reply("Gespeichert. Öffne die Website – dort siehst du jetzt deine Änderung. (Demo: nur in deinem Browser sichtbar)");
      }
      if (body.action === "undo") {
        const history = read(HIST, []);
        if (!history.length) return { ok: false, message: "Es gibt keine frühere Version." };
        write(KEY, history.pop());
        write(HIST, history);
        return reply("Die letzte Änderung wurde rückgängig gemacht.");
      }
      return { ok: false, message: "Unbekannte Aktion." };
    },
    reset() {
      try { localStorage.removeItem(KEY); localStorage.removeItem(HIST); } catch { /* egal */ }
    },
  };
})();
