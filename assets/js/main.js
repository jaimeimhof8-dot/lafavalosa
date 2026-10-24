/* La Favolosa – Interaktionen
   - Inhalte (Öffnungszeiten, Ausnahmen, Sorten, Jobs) aus content.js
   - Formular (Versand über send.php, Demo-Modus auf Vorschau-Hosts)
   - GSAP + ScrollTrigger + SplitText, Lenis Smooth Scroll
   Alle Inhalte sind ohne JS sichtbar; Animationen sind reine Verbesserung.
   Das Skript läuft auch auf den Unterseiten – jede Funktion prüft, ob ihre Elemente existieren. */

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const content = window.FAVOLOSA || {};

  // Vorschau-Hosts ohne PHP (lokal geöffnet, Netlify, GitHub Pages): Der Demo-Admin (admin/index.html)
  // speichert im Browser (localStorage). Diese Änderungen werden hier über content.js gelegt.
  const DEMO = location.protocol === "file:" || /\.(netlify\.app|github\.io|vercel\.app)$/.test(location.hostname);
  let demoEdited = false;
  if (DEMO) {
    try {
      const saved = JSON.parse(localStorage.getItem("favolosa-demo-content") || "null");
      if (saved && typeof saved === "object") {
        ["hinweis", "sorten", "jobs", "ausnahmen"].forEach((k) => { if (saved[k] !== undefined) content[k] = saved[k]; });
        demoEdited = true;
      }
    } catch { /* ohne localStorage: Standardinhalte */ }
  }

  const header = $(".header");
  const nav = $("#nav");
  const burger = $("#burger");
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  const heroGrid = $(".hero__grid");
  const showHero = () => { if (heroGrid) heroGrid.style.visibility = "visible"; };
  setTimeout(showHero, 2500); // Sicherheitsnetz, falls Fonts hängen

  /* =========================================================
     Zeit in Zürich
     ========================================================= */
  const DAY_KEYS = ["so", "mo", "di", "mi", "do", "fr", "sa"];
  const WEEK = ["mo", "di", "mi", "do", "fr", "sa", "so"];
  const DAY_LABEL = { mo: "Mo", di: "Di", mi: "Mi", do: "Do", fr: "Fr", sa: "Sa", so: "So" };

  function zurichNow() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Zurich", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      dayKey: DAY_KEYS[days[get("weekday")]],
      minutes: (+get("hour") % 24) * 60 + +get("minute"),
      date: `${get("year")}-${get("month")}-${get("day")}`,
    };
  }
  const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  // "24:00" (Mitternacht) und Zeiten nach Mitternacht ("25:30") werden als 00:00 bzw. 01:30 angezeigt
  const fmt = (s) => { const [h, m] = s.split(":").map(Number); return `${String(h % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };
  // Ein Tag ist ["12:30","18:00"] oder – mit Mittagspause – [["09:00","12:00"],["14:00","18:00"]]
  const ranges = (h) => (!h ? [] : Array.isArray(h[0]) ? h : [h]);
  const hoursText = (h) => ranges(h).map((r) => r.map(fmt).join(" – ")).join(" · ");
  const monthYear = (iso) => new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric" }).format(new Date(iso + "T12:00:00"));

  /* =========================================================
     Öffnungszeiten & Status
     Quelle: Google-Unternehmensprofil (siehe "Google-Daten" unten),
     content.js dient als Notfall-Wert und für manuelle Ausnahmen.
     ========================================================= */
  function today(id, loc, now) {
    if (loc.pauseBis && now.date < loc.pauseBis) return { pause: true, text: loc.pauseText || "Saisonpause" };
    const exc = (content.ausnahmen || []).find((a) => a.datum === now.date && (a.lokal === id || a.lokal === "alle"));
    if (exc) return { hours: ranges(exc.zeiten), text: exc.text, exception: true };
    const g = loc.google;
    if (g && g.status === "CLOSED_TEMPORARILY") return { pause: true, text: "Vorübergehend geschlossen" };
    if (g && g.status === "CLOSED_PERMANENTLY") return { pause: true, text: "Geschlossen" };
    return { hours: ranges((loc.zeiten || {})[now.dayKey]) };
  }

  // Aufeinanderfolgende Tage mit gleichen Zeiten zusammenfassen: "Mo–Sa 12:30 – 18:00"
  function groupHours(zeiten) {
    const groups = [];
    WEEK.forEach((d) => {
      const h = zeiten[d] && zeiten[d].length ? hoursText(zeiten[d]) : "geschlossen";
      const last = groups[groups.length - 1];
      if (last && last.h === h) last.to = d; else groups.push({ from: d, to: d, h });
    });
    return groups.map((g) => [g.from === g.to ? DAY_LABEL[g.from] : `${DAY_LABEL[g.from]}–${DAY_LABEL[g.to]}`, g.h]);
  }

  function renderHours() {
    const lokale = content.lokale || {};
    const now = zurichNow();
    $$("[data-loc]").forEach((card) => {
      const loc = lokale[card.dataset.loc];
      const dl = $(".loc__hours", card);
      if (!loc || !dl) return;
      const g = loc.google;
      let rows;
      if (loc.pauseBis && now.date < loc.pauseBis) rows = [["Wieder offen", `ab ${monthYear(loc.pauseBis)}`]];
      else if (g && g.status === "CLOSED_TEMPORARILY") rows = [["Aktuell", "Vorübergehend geschlossen"]];
      else if (g && g.status === "CLOSED_PERMANENTLY") rows = [["Aktuell", "Dauerhaft geschlossen"]];
      else if (loc.zeiten) rows = groupHours(loc.zeiten);
      else return;
      dl.innerHTML = rows.map(([dt, dd]) => `<dt>${dt}</dt><dd>${dd}</dd>`).join("");
    });
  }

  function updateStatus() {
    const lokale = content.lokale || {};
    const now = zurichNow();
    let openCount = 0;

    $$("[data-loc]").forEach((card) => {
      const id = card.dataset.loc;
      const loc = lokale[id];
      const badge = $(".status", card);
      if (!loc || !badge) return;
      const t = today(id, loc, now);
      badge.classList.remove("status--open", "status--closed", "status--warn");
      card.classList.toggle("loc--paused", !!t.pause);

      if (t.pause) {
        badge.textContent = t.text;
        badge.classList.add("status--closed");
      } else if (!t.hours.length) {
        badge.textContent = t.exception ? (t.text ? `Heute zu · ${t.text}` : "Heute geschlossen") : "Heute geschlossen";
        badge.classList.add(t.exception ? "status--warn" : "status--closed");
      } else {
        const current = t.hours.find(([from, to]) => now.minutes >= toMin(from) && now.minutes < toMin(to));
        const next = t.hours.find(([from]) => now.minutes < toMin(from));
        if (current) {
          badge.textContent = `Offen bis ${fmt(current[1])}`;
          badge.classList.add(t.exception ? "status--warn" : "status--open");
          openCount++;
        } else if (next) {
          badge.textContent = `Ab ${fmt(next[0])}`;
          badge.classList.add(t.exception ? "status--warn" : "status--closed");
        } else {
          badge.textContent = "Geschlossen";
          badge.classList.add("status--closed");
        }
      }
      if (t.exception && t.text) badge.title = t.text;
    });

    const dot = $("#liveDot");
    const text = $("#liveText");
    if (dot && text) {
      dot.classList.toggle("is-open", openCount > 0);
      text.textContent = openCount === 0 ? "Gelateria artigianale · Thun"
        : openCount === 1 ? "Jetzt 1 Lokal geöffnet" : `Jetzt ${openCount} Lokale geöffnet`;
    }
  }

  function renderNotice() {
    const el = $("#notice");
    const h = content.hinweis;
    if (!el || !h || !h.aktiv || !h.text) return;
    if (h.bis && zurichNow().date > h.bis) return;
    el.textContent = h.text;
    el.hidden = false;
  }

  /* =========================================================
     Sorten & Jobs
     ========================================================= */
  const FLAVOR_COLORS = {
    "fior di latte": "#F6EEDC", stracciatella: "#EDE3D3", pistacchio: "#CFE0B5", nocciola: "#E4CBAF",
    cioccolato: "#C9A58C", "caffè": "#D9BFA6", vaniglia: "#F5E7C6", amarena: "#E9BFC6", jamaica: "#E7D8C1",
    joghurt: "#F7F1EA", "tiramisù": "#DCC6AE", cookies: "#E3D4C4", fragola: "#F6B5B0", mango: "#FBD38D",
    limone: "#F3F0B8", banana: "#F6E7A6", lampone: "#F2A3B3", "frutto della passione": "#F9C98A", "frutti di bosco": "#D9A3C4",
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function renderFlavors() {
    $$("[data-flavors]").forEach((ul) => {
      const list = (content.sorten || {})[ul.dataset.flavors];
      if (Array.isArray(list) && list.length) ul.innerHTML = list.map((n) => `<li>${esc(n)}</li>`).join("");
      $$("li", ul).forEach((li) => {
        const c = FLAVOR_COLORS[li.textContent.trim().toLowerCase()];
        if (c) li.style.setProperty("--c", c);
      });
    });
  }

  function renderJobs() {
    const jobs = content.jobs;
    if (!jobs) return;
    const stellen = Array.isArray(jobs.stellen) ? jobs.stellen : [];
    $$("[data-jobs-season]").forEach((el) => { el.textContent = jobs.saison || ""; });
    $$("[data-jobs]").forEach((ul) => {
      ul.innerHTML = stellen.length ? stellen.map((s) => `<li>${esc(s)}</li>`).join("")
        : "<li>Aktuell keine offenen Stellen – Spontanbewerbungen sind willkommen</li>";
    });
    $$("[data-jobs-select]").forEach((sel) => {
      sel.innerHTML = [...stellen, "Spontanbewerbung"].map((s) => `<option>${esc(s)}</option>`).join("");
    });
  }

  /* =========================================================
     Google-Daten: Öffnungszeiten, Sterne, Rezensionen
     1. google-snapshot.js (echter Stand von Google Maps) wird sofort verwendet
     2. google.php (Live-Daten) ersetzt ihn, sobald es antwortet
     Ohne beides bleiben content.js-Zeiten, und Rezensionen werden nicht gezeigt.
     ========================================================= */
  // Auf Vorschau-Hosts (DEMO, siehe oben) gibt es kein google.php: dort gilt der Snapshot.

  const fmtRating = (n) => n.toLocaleString("de-CH", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtCount = (n) => n.toLocaleString("de-CH").replace(/[’']/g, "’");
  const MAPS_FALLBACK = "https://www.google.com/search?q=Gelateria+La+Favolosa+Thun";
  const LOC_NAME = { baelliz: "Bälliz", muehleplatz: "Mühleplatz", gwatt: "Gwatt", bahnhof: "Bahnhof", muensingen: "Münsingen" };

  // Manuelle Ausnahmen aus content.js gewinnen vor den Google-Sonderzeiten.
  const manualExceptions = content.ausnahmen || [];

  function applyGoogle(data) {
    const lokale = content.lokale || (content.lokale = {});
    const exceptions = [];
    Object.entries(data.lokale || {}).forEach(([id, g]) => {
      const loc = lokale[id] || (lokale[id] = {});
      loc.google = g;
      if (g.zeiten) loc.zeiten = g.zeiten;
      (g.ausnahmen || []).forEach((a) => exceptions.push({ ...a, lokal: id }));
    });
    content.ausnahmen = manualExceptions.concat(exceptions);
    content.googleData = data;

    renderHours();
    updateStatus();
    renderRatings(data);
    renderVoices(data);
  }

  function renderRatings(data) {
    $$("[data-loc]").forEach((card) => {
      const g = (data.lokale || {})[card.dataset.loc];
      const a = $(".loc__rating", card);
      if (!g || !a || !g.rating) return;
      a.innerHTML = `<span class="stars" aria-hidden="true">★</span> <strong>${fmtRating(g.rating)}</strong> · ${fmtCount(g.count)} Google-Bewertungen`;
      a.href = g.maps || MAPS_FALLBACK;
      a.hidden = false;
    });
  }

  function renderVoices(data) {
    const grid = $("#voices");
    const summary = $("#voicesSummary");
    const rated = Object.values(data.lokale || {}).filter((g) => g.rating && g.count);
    const total = rated.reduce((n, g) => n + g.count, 0);

    if (summary && total) {
      const avg = rated.reduce((n, g) => n + g.rating * g.count, 0) / total;
      const stand = data.quelle === "snapshot"
        ? `Stand ${new Intl.DateTimeFormat("de-CH", { dateStyle: "medium" }).format(new Date(data.stand + "T12:00:00"))}`
        : "live von Google";
      summary.innerHTML = `<span class="voices__score">${fmtRating(avg)}</span>
        <span class="stars" role="img" aria-label="${fmtRating(avg)} von 5 Sternen">${"★".repeat(Math.round(avg))}</span>
        <span class="voices__meta"><strong>${fmtCount(total)} Bewertungen</strong> auf Google · ${stand}</span>`;
      summary.hidden = false;
    }

    if (!grid) return;
    // Nur echte Rezensionen mit Text; abwechselnd aus den Lokalen, damit nicht eins dominiert
    const byLoc = {};
    (data.bewertungen || [])
      .filter((r) => r.sterne >= 4 && r.text && r.text.length >= 40 && r.autor)
      .forEach((r) => { (byLoc[r.lokal] = byLoc[r.lokal] || []).push(r); });
    const picked = [];
    for (let i = 0; picked.length < 6; i++) {
      const round = Object.values(byLoc).map((l) => l[i]).filter(Boolean);
      if (!round.length) break;
      picked.push(...round);
    }

    $$(".voice[data-google]", grid).forEach((n) => n.remove());
    const cta = $(".voice--cta", grid);
    picked.slice(0, 6).forEach((r, i) => {
      const text = r.text.length > 300 ? r.text.slice(0, 300).replace(/\s+\S*$/, "") + " …" : r.text;
      const el = document.createElement("figure");
      el.className = "voice" + (i === 1 ? " voice--pink" : "");
      el.dataset.google = "";
      const name = r.autorUri
        ? `<a href="${esc(r.autorUri)}" target="_blank" rel="noopener">${esc(r.autor)}</a>` : esc(r.autor);
      el.innerHTML = `<div class="stars" role="img" aria-label="${r.sterne} von 5 Sternen">${"★".repeat(r.sterne)}</div>
        <blockquote lang="${esc(r.sprache || "de")}">«${esc(text)}»</blockquote>
        <figcaption><strong>${name}</strong><span>${esc(r.zeit)}${LOC_NAME[r.lokal] ? ` · ${LOC_NAME[r.lokal]}` : ""} · <a href="${esc(r.uri || (data.lokale[r.lokal] || {}).maps || MAPS_FALLBACK)}" target="_blank" rel="noopener">auf Google ansehen</a></span></figcaption>`;
      grid.insertBefore(el, cta);
    });

    // "Bewerte uns": direkt zum Bewertungsformular des Hauptlokals (Gwatt), wenn Google die Place ID liefert
    const main = (data.lokale || {}).gwatt;
    if (cta && main) {
      cta.href = main.placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(main.placeId)}` : (main.maps || cta.href);
    }
  }

  renderNotice();
  renderHours();
  updateStatus();
  renderFlavors();
  renderJobs();
  setInterval(updateStatus, 60 * 1000);

  // Demo: Hinweis, dass Änderungen aus dem Demo-Admin angezeigt werden
  if (demoEdited) {
    const pill = document.createElement("div");
    pill.className = "demo-pill";
    pill.innerHTML = '<span>Demo-Ansicht mit deinen Änderungen</span> <a href="admin/">Zum Admin</a> <button type="button">Zurücksetzen</button>';
    $("button", pill).addEventListener("click", () => {
      try { localStorage.removeItem("favolosa-demo-content"); localStorage.removeItem("favolosa-demo-history"); } catch { /* egal */ }
      location.reload();
    });
    document.body.appendChild(pill);
  }

  if (window.FAVOLOSA_GOOGLE) applyGoogle(window.FAVOLOSA_GOOGLE);
  if (!DEMO) {
    fetch("google.php", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data && data.ok && data.lokale) applyGoogle(data); })
      .catch(() => {}); // bleibt beim Snapshot
  }

  /* =========================================================
     Formular
     ========================================================= */
  const form = $("#form");
  const loadedAt = Date.now();
  // DEMO (siehe oben): Der Versand wird auf Vorschau-Hosts ohne PHP simuliert.
  function setTopic(topic) {
    if (!form) return;
    const radio = $(`input[name="topic"][value="${topic}"]`, form);
    if (radio) { radio.checked = true; syncTopic(); }
  }

  function syncTopic() {
    const topic = ($('input[name="topic"]:checked', form) || {}).value || "kontakt";
    // Inaktive Bereiche deaktivieren: werden nicht validiert und nicht mitgeschickt
    $$("[data-show]", form).forEach((fs) => {
      const active = fs.dataset.show === topic;
      fs.disabled = !active;
      $$("[data-required]", fs).forEach((el) => { el.required = active; });
    });
    const msg = $('textarea[name="nachricht"]', form);
    const label = $("[data-msg-label]", form);
    msg.required = topic === "kontakt";
    label.textContent = topic === "kontakt" ? "Nachricht *" : "Nachricht (optional)";
  }

  if (form) {
    $$('input[name="topic"]', form).forEach((r) => r.addEventListener("change", syncTopic));
    $$("[data-topic]").forEach((a) => a.addEventListener("click", () => setTopic(a.dataset.topic)));
    syncTopic();

    const status = $("#formStatus");
    const submit = $('button[type="submit"]', form);
    const say = (text, ok) => { status.textContent = text; status.className = "form__status " + (ok ? "is-ok" : "is-error"); };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      form.classList.add("was-validated");
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const file = $('input[name="job_cv"]', form);
      if (file && !file.disabled && file.files[0] && file.files[0].size > 5 * 1024 * 1024) {
        say("Die Datei ist grösser als 5 MB. Bitte verkleinern oder als PDF senden.", false);
        return;
      }

      $('input[name="t"]', form).value = Math.round((Date.now() - loadedAt) / 1000);
      submit.disabled = true;
      say("Wird gesendet …", true);

      try {
        let ok = true, message = "Danke! Deine Nachricht ist bei uns angekommen. Wir melden uns bald.";
        if (DEMO) {
          await new Promise((r) => setTimeout(r, 700));
          message = "Demo-Vorschau: In der Live-Version wird diese Nachricht per E-Mail an La Favolosa gesendet.";
        } else {
          const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
          const data = await res.json().catch(() => ({}));
          ok = res.ok && data.ok;
          message = data.message || (ok ? message : "Das hat leider nicht geklappt. Bitte ruf uns an: 078 882 25 27.");
        }
        say(message, ok);
        if (ok) { form.reset(); form.classList.remove("was-validated"); syncTopic(); }
      } catch {
        say("Keine Verbindung. Bitte später nochmals versuchen oder anrufen: 078 882 25 27.", false);
      } finally {
        submit.disabled = false;
      }
    });
  }

  /* =========================================================
     Navigation & Header
     ========================================================= */
  let lenis = null;
  function setMenu(open) {
    if (!burger || !nav) return;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Menü schliessen" : "Menü öffnen");
    nav.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
    if (open) header.classList.remove("is-hidden");
    document.body.style.overflow = open ? "hidden" : "";
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  if (burger && nav) {
    burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
    $$("a", nav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  }

  let lastY = 0;
  function onScroll(y) {
    if (!header) return;
    header.classList.toggle("is-scrolled", y > 20);
    const menuOpen = nav && nav.classList.contains("is-open");
    header.classList.toggle("is-hidden", !menuOpen && y > 400 && y > lastY);
    lastY = y;
  }

  // Ohne Bibliotheken oder bei reduzierter Bewegung: nur Basisfunktionen.
  if (reduceMotion || !window.gsap || !window.ScrollTrigger || !window.Lenis) {
    window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });
    showHero();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);

  /* ---------- Lenis ---------- */
  lenis = new Lenis({ lerp: 0.1, anchors: { offset: -80 } });
  lenis.on("scroll", (e) => { ScrollTrigger.update(); onScroll(e.scroll); });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ---------- Hero Intro & Zitat ---------- */
  document.fonts.ready.then(() => {
    const title = $(".hero__title");
    if (title) {
      const tl = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.3 }, onStart: showHero });
      if (window.SplitText) {
        const split = SplitText.create(title, { type: "lines,words", mask: "lines" });
        tl.from(split.words, { yPercent: 110, stagger: 0.06 });
      } else {
        tl.from(title, { y: 40, opacity: 0 });
      }
      tl.from(".hero .eyebrow, .hero__lead, .hero__actions, .hero__facts li", { y: 24, opacity: 0, stagger: 0.08, duration: 1 }, "-=1")
        .from(".arch", { clipPath: "inset(100% 0 0 0 round 999px 999px 28px 28px)", duration: 1.6, ease: "expo.inOut" }, 0.1)
        .from(".arch img", { scale: 1.35, duration: 2 }, 0.1)
        .from(".blob", { scale: 0, rotate: -20, duration: 1.2, ease: "back.out(1.6)" }, 0.9)
        .from(".badge", { scale: 0, rotate: 90, duration: 1, ease: "back.out(1.8)" }, 1.1);
    }

    const quote = $(".quote-break p");
    if (window.SplitText && quote) {
      const qs = SplitText.create(quote, { type: "lines", mask: "lines" });
      gsap.from(qs.lines, {
        yPercent: 100, stagger: 0.12, duration: 1.2, ease: "expo.out",
        scrollTrigger: { trigger: quote, start: "top 85%" },
      });
    }
    ScrollTrigger.refresh();
  });

  /* ---------- Parallax ---------- */
  if ($(".hero")) {
    $$("[data-parallax]").forEach((el) => {
      gsap.to(el, {
        yPercent: Number(el.dataset.parallax), ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });
    });
  }
  const bg = $("[data-parallax-bg]");
  if (bg) {
    gsap.fromTo(bg, { yPercent: -8 }, {
      yPercent: 8, ease: "none",
      scrollTrigger: { trigger: ".quote-break", start: "top bottom", end: "bottom top", scrub: true },
    });
  }

  /* ---------- Manifest: Wort-für-Wort ---------- */
  const manifest = $("[data-reveal-words]");
  if (manifest) {
    manifest.innerHTML = manifest.textContent.trim().split(/\s+/)
      .map((w) => `<span class="word">${w}</span>`).join(" ");
    gsap.fromTo($$(".word", manifest), { opacity: 0.12 }, {
      opacity: 1, stagger: 0.05, ease: "none",
      scrollTrigger: { trigger: manifest, start: "top 80%", end: "bottom 45%", scrub: true },
    });
  }

  /* ---------- Generische Reveals ---------- */
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    once: true,
    onEnter: (els) => {
      // CSS-Hover-Transitions würden die GSAP-Animation verwischen
      els.forEach((el) => { el.style.transition = "none"; });
      gsap.from(els, {
        y: 60, opacity: 0, duration: 1.1, stagger: 0.1, ease: "expo.out", clearProps: "transform,opacity",
        onComplete: () => els.forEach((el) => { el.style.transition = ""; }),
      });
    },
  });

  gsap.utils.toArray(".quality__img img, .events__img img, .flavor-photo img").forEach((img) => {
    gsap.fromTo(img, { scale: 1.15 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: img.closest("figure"), start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  /* ---------- Marquee: reagiert auf Scrollgeschwindigkeit ---------- */
  const track = $(".marquee__track");
  if (track) {
    track.style.animation = "none"; // JS übernimmt (zwei identische Gruppen = nahtlose Schleife)
    let x = 0, speed = 1;
    lenis.on("scroll", (e) => { speed = 1 + Math.min(Math.abs(e.velocity) * 0.15, 6); });
    gsap.ticker.add(() => {
      x -= 0.6 * speed;
      speed += (1 - speed) * 0.05;
      const half = track.scrollWidth / 2;
      if (-x >= half) x += half;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  /* ---------- Zähler ---------- */
  $$("[data-count]").forEach((el) => {
    const obj = { v: 0 };
    gsap.to(obj, {
      v: Number(el.dataset.count), duration: 1.8, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => { el.textContent = Math.round(obj.v); },
    });
  });

  /* ---------- Magnetische Buttons (Desktop) ---------- */
  if (window.matchMedia("(hover: hover)").matches) {
    $$(".btn").forEach((btn) => {
      const xTo = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3" });
      const yTo = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3" });
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      btn.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }
})();
