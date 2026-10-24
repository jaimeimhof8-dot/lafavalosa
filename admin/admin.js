/* La Favolosa – Admin: Inhalte bearbeiten
   Vanilla-JS ohne Abhängigkeiten. Der Zustand liegt in `state`; gerendert wird bei jeder Änderung neu.
   Gespeichert wird per fetch an index.php (Aktionen "save" und "undo"). */

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  // Demo (admin/index.html, ohne Server): demo.js liefert Daten und "speichert" im Browser
  const demo = window.AdminDemo;
  const initial = demo ? demo.initial() : JSON.parse($("#initial").textContent);
  const csrf = demo ? "" : $('meta[name="csrf"]').content;
  const LOKALE = initial.lokale;

  let state = clone(initial.data);
  let dirty = false;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function markDirty() { dirty = true; $("#status").textContent = "Ungespeicherte Änderungen"; $("#status").className = "status is-dirty"; }

  const saveBtn = $("#save");
  const undoBtn = $("#undo");
  const status = $("#status");

  function say(text, ok) {
    status.textContent = text;
    status.className = "status " + (ok ? "is-ok" : "is-error");
  }

  /* ---------- Hinweis-Banner ---------- */
  const bAktiv = $("#banner-aktiv");
  const bText = $("#banner-text");
  const bBis = $("#banner-bis");
  const bCount = $("#banner-count");

  function renderBanner() {
    const h = state.hinweis;
    bAktiv.checked = !!h.aktiv;
    bText.value = h.text || "";
    bBis.value = h.bis || "";
    bCount.textContent = `${bText.value.length}/160`;
  }
  bAktiv.addEventListener("change", () => { state.hinweis.aktiv = bAktiv.checked; markDirty(); });
  bText.addEventListener("input", () => { state.hinweis.text = bText.value; bCount.textContent = `${bText.value.length}/160`; markDirty(); });
  bBis.addEventListener("change", () => { state.hinweis.bis = bBis.value; markDirty(); });

  /* ---------- Chip-Listen (Sorten, Stellen) ---------- */
  function renderChips(container, list, { placeholder, max }) {
    container.innerHTML = "";
    const ul = document.createElement("ul");
    ul.className = "chip-list";

    list.forEach((name, i) => {
      const li = document.createElement("li");
      li.className = "chip";

      const input = document.createElement("input");
      input.type = "text";
      input.value = name;
      input.maxLength = 60;
      input.setAttribute("aria-label", "Name");
      input.size = Math.max(6, name.length + 1);
      input.addEventListener("input", () => { list[i] = input.value; input.size = Math.max(6, input.value.length + 1); markDirty(); });

      const btn = (label, title, onClick, disabled) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.title = title;
        b.setAttribute("aria-label", title);
        b.disabled = !!disabled;
        b.addEventListener("click", onClick);
        return b;
      };
      const move = (to) => () => {
        [list[i], list[to]] = [list[to], list[i]];
        markDirty();
        renderChips(container, list, { placeholder, max });
      };
      li.append(
        input,
        btn("↑", "Nach oben", move(i - 1), i === 0),
        btn("↓", "Nach unten", move(i + 1), i === list.length - 1),
        btn("×", "Löschen", () => { list.splice(i, 1); markDirty(); renderChips(container, list, { placeholder, max }); }),
      );
      ul.append(li);
    });
    container.append(ul);

    const add = document.createElement("div");
    add.className = "chip-add";
    const field = document.createElement("input");
    field.type = "text";
    field.placeholder = placeholder;
    field.maxLength = 60;
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn--ghost";
    addBtn.textContent = "Hinzufügen";
    const doAdd = () => {
      const v = field.value.trim();
      if (!v) return;
      if (list.length >= max) { say(`Mehr als ${max} Einträge sind nicht möglich.`, false); return; }
      if (list.some((x) => x.trim().toLowerCase() === v.toLowerCase())) { say(`«${v}» gibt es schon.`, false); return; }
      list.push(v);
      markDirty();
      renderChips(container, list, { placeholder, max });
      $(".chip-add input", container).focus();
    };
    addBtn.addEventListener("click", doAdd);
    field.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });
    add.append(field, addBtn);
    container.append(add);
  }

  /* ---------- Ausnahmetage ---------- */
  const exList = $("#list-ausnahmen");

  function renderExceptions() {
    exList.innerHTML = "";
    if (!state.ausnahmen.length) {
      exList.innerHTML = '<p class="empty">Keine Ausnahmetage eingetragen.</p>';
      return;
    }
    state.ausnahmen.forEach((a, i) => {
      const past = a.datum && a.datum < initial.today;
      const row = document.createElement("div");
      row.className = "ex" + (past ? " is-past" : "");
      const closed = !a.zeiten;
      row.innerHTML = `
        <label class="field ex__lokal">Lokal
          <select data-k="lokal">${Object.entries(LOKALE).map(([k, v]) => `<option value="${k}"${a.lokal === k ? " selected" : ""}>${v}</option>`).join("")}</select>
        </label>
        <label class="field ex__datum">Datum
          <input type="date" data-k="datum" value="${a.datum || ""}" min="${initial.today}" />
        </label>
        <label class="switch ex__zu"><input type="checkbox" data-k="zu"${closed ? " checked" : ""} /> <span>Ganzer Tag geschlossen</span></label>
        <label class="field ex__von">Offen von
          <input type="time" data-k="von" value="${a.zeiten ? a.zeiten[0] : "12:00"}"${closed ? " disabled" : ""} />
        </label>
        <label class="field ex__bis">Offen bis
          <input type="time" data-k="bis" value="${a.zeiten ? a.zeiten[1] : "16:00"}"${closed ? " disabled" : ""} />
        </label>
        <label class="field ex__text">Grund (wird bei Hover angezeigt)
          <input type="text" data-k="text" maxlength="80" placeholder="z.B. Weihnachten" />
        </label>
        <button type="button" class="btn btn--danger ex__del" data-k="del">Löschen</button>
        ${past ? '<p class="ex__past">Dieser Tag ist vorbei und wird beim Speichern entfernt.</p>' : ""}`;
      $('[data-k="text"]', row).value = a.text || "";

      const sync = () => {
        a.lokal = $('[data-k="lokal"]', row).value;
        a.datum = $('[data-k="datum"]', row).value;
        a.text = $('[data-k="text"]', row).value;
        const zu = $('[data-k="zu"]', row).checked;
        $('[data-k="von"]', row).disabled = zu;
        $('[data-k="bis"]', row).disabled = zu;
        a.zeiten = zu ? null : [$('[data-k="von"]', row).value, $('[data-k="bis"]', row).value];
        markDirty();
      };
      row.addEventListener("input", sync);
      row.addEventListener("change", sync);
      $('[data-k="del"]', row).addEventListener("click", () => { state.ausnahmen.splice(i, 1); markDirty(); renderExceptions(); });
      exList.append(row);
    });
  }

  $("#add-ausnahme").addEventListener("click", () => {
    state.ausnahmen.push({ lokal: "alle", datum: initial.today, zeiten: null, text: "" });
    markDirty();
    renderExceptions();
  });

  /* ---------- Jobs ---------- */
  const saison = $("#jobs-saison");
  saison.addEventListener("input", () => { state.jobs.saison = saison.value; markDirty(); });

  /* ---------- Alles zeichnen ---------- */
  function renderAll() {
    renderBanner();
    renderChips($("#list-milch"), state.sorten.milch, { placeholder: "Neue Milchsorte, z.B. Zabaione", max: 60 });
    renderChips($("#list-sorbet"), state.sorten.sorbet, { placeholder: "Neues Sorbet, z.B. Ananas", max: 60 });
    renderExceptions();
    saison.value = state.jobs.saison || "";
    renderChips($("#list-stellen"), state.jobs.stellen, { placeholder: "Neue Stelle, z.B. Küchenhilfe", max: 30 });
    undoBtn.disabled = !initial.canUndo;
  }

  /* ---------- Server ---------- */
  async function post(body) {
    if (demo) return demo.post(body);
    const res = await fetch("index.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ ok: false, message: "Unerwartete Antwort vom Server." }));
    if (data.login) { location.reload(); }
    return data;
  }

  async function run(body, button) {
    button.disabled = true;
    say("Wird gespeichert …", true);
    try {
      const res = await post(body);
      if (res.ok) {
        state = clone(res.data);
        initial.canUndo = !!res.canUndo;
        dirty = false;
        renderAll();
      }
      say(res.message, !!res.ok);
    } catch {
      say("Keine Verbindung. Bitte später nochmals versuchen.", false);
    } finally {
      saveBtn.disabled = false;
      undoBtn.disabled = !initial.canUndo;
    }
  }

  saveBtn.addEventListener("click", () => run({ action: "save", data: state }, saveBtn));
  undoBtn.addEventListener("click", () => {
    if (!confirm("Die letzte gespeicherte Änderung rückgängig machen? Nicht gespeicherte Eingaben gehen verloren.")) return;
    run({ action: "undo" }, undoBtn);
  });

  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  renderAll();
})();
