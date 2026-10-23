# Go-live-Checkliste La Favolosa

## 1. Platzhalter ersetzen (gelb markiert, Suche nach `todo` bzw. `BITTE-ERSETZEN`)
- [ ] `config.php`: `to` = echte Empfänger-Adresse, `from` = Adresse auf favolosa.ch (z.B. website@favolosa.ch)
- [ ] `impressum.html`: Firmenname, verantwortliche Person, UID/MWST, E-Mail, Fotograf/in, dein Name als Webdesigner
- [ ] `datenschutz.html`: Firmenname, E-Mail, Hosting-Anbieter, Log-Aufbewahrung, Bewerbungs-Löschfrist, Datum
- [ ] Bewertungen (Sarah R., Simona): Einverständnis eingeholt oder durch echte Google-Bewertungen ersetzt
- [ ] `content.js`: aktuelle Öffnungszeiten, Jobs, Sorten geprüft
- [ ] JSON-LD in `index.html` (`<script type="application/ld+json">`): Öffnungszeiten stimmen mit `content.js` überein

## 2. Hosting (empfohlen: Schweizer Anbieter mit PHP ≥ 8.1, z.B. Infomaniak oder Hostpoint)
- [ ] Hosting auf den Namen des Kunden eröffnen (Kunde ist Vertragspartner, du hast Zugriff)
- [ ] Alle Dateien aus `neues-design/` ins Web-Verzeichnis hochladen (inkl. der versteckten Datei `.htaccess`)
- [ ] SSL-Zertifikat (Let's Encrypt) aktivieren
- [ ] E-Mail-Postfächer auf dem neuen Hosting anlegen **bevor** die Domain umgezogen wird – sonst gehen Mails verloren
- [ ] SPF/DKIM für die Domain aktivieren (meist ein Klick beim Hoster), damit Formular-Mails nicht im Spam landen

## 3. Domain-Umzug
- [ ] Bei der bisherigen Agentur (renker works GmbH) Kündigungsfrist prüfen
- [ ] Auth-Code für favolosa.ch anfordern und Domain transferieren – oder nur die DNS-Einträge auf das neue Hosting zeigen lassen
- [ ] Nach dem Umzug: `curl -I https://www.favolosa.ch/lokale/` → muss `301` auf `/#lokale` liefern

## 4. Nach dem Go-live
- [ ] Jedes Formular einmal testen (Frage, Event, Gutschein, Bewerbung mit PDF) – Mail angekommen? Reply-To = Absender?
- [ ] Google Search Console: Domain bestätigen, `sitemap.xml` einreichen
- [ ] Google Unternehmensprofil (Maps): Website-Link und Öffnungszeiten prüfen
- [ ] Instagram-/Facebook-Bio: Link prüfen
- [ ] Lighthouse-Test (Chrome DevTools): Ziel ≥ 90 in allen Kategorien

## Inhalte pflegen (für dich bzw. den Kunden)
Alles Wichtige steht in **`content.js`** – mit Anleitung oben in der Datei:
- **Hinweis-Banner** (z.B. «Heute wegen Regen ab 16 Uhr zu»): `hinweis.aktiv: true`, Text und Enddatum setzen
- **Einzelne Tage** (Feiertage, Wetter, Privatanlass): Eintrag in `ausnahmen`
- **Winterpause**: `pauseBis` beim Lokal setzen
- **Sorten / Jobs**: Listen anpassen

Nach dem Hochladen sind Änderungen sofort sichtbar (`content.js` wird nicht zwischengespeichert).

## Vorschau-Version für den Kunden (Netlify)
- Ordner `neues-design/` per Drag & Drop auf app.netlify.com/drop ziehen
- `_headers` sorgt dafür, dass Google die Vorschau **nicht** indexiert
- Das Formular läuft dort im Demo-Modus (keine echte Mail, Hinweis wird angezeigt)
- Achtung: Netlify führt kein PHP aus – die Dateien `send.php`/`config.php` sind dort als Text abrufbar. Keine Passwörter in `config.php` eintragen.
