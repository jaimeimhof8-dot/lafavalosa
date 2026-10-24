# Go-live-Checkliste La Favolosa

## 1. Platzhalter ersetzen (gelb markiert, Suche nach `todo` bzw. `BITTE-ERSETZEN`)
- [ ] `config.php`: `to` = echte Empfänger-Adresse, `from` = Adresse auf favolosa.ch (z.B. website@favolosa.ch)
- [ ] `impressum.html`: Firmenname, verantwortliche Person, UID/MWST, E-Mail, Fotograf/in, dein Name als Webdesigner
- [ ] `datenschutz.html`: Firmenname, E-Mail, Hosting-Anbieter, Log-Aufbewahrung, Bewerbungs-Löschfrist, Datum
- [x] Bewertungen: kommen jetzt direkt von Google (siehe Abschnitt 1b) – keine Texte mehr von Hand
- [ ] `content.js`: Jobs und Sorten geprüft (Öffnungszeiten kommen von Google, `content.js` ist nur Notfall-Wert)
- [ ] JSON-LD in `index.html` (`<script type="application/ld+json">`): Öffnungszeiten stimmen mit Google Maps überein
- [ ] Rechtliche Adresse in `impressum.html`/`datenschutz.html` (steht noch «Bälliz 60») beim Kunden bestätigen

## 1b. Google-Anbindung (Öffnungszeiten & Bewertungen live)
Die Website liest Sterne, Rezensionen und Öffnungszeiten aus dem Google-Unternehmensprofil (`google.php`, Places API). Ohne Schlüssel zeigt sie den echten Stand vom 24.10.2026 aus `google-snapshot.js`.
- [ ] [Google Cloud Console](https://console.cloud.google.com): Projekt anlegen (auf den Namen des Kunden), Rechnungskonto hinterlegen (Google gibt ein monatliches Gratis-Kontingent; bei 6 h Cache bleiben 5 Lokale weit darunter)
- [ ] «Places API (New)» aktivieren, API-Schlüssel erstellen
- [ ] Schlüssel einschränken: Anwendungseinschränkung = IP-Adresse des Servers, API-Einschränkung = nur Places API (New)
- [ ] Schlüssel in `config.php` unter `google` → `api_key` eintragen (Place IDs werden automatisch gefunden)
- [ ] Test: `https://www.favolosa.ch/google.php` im Browser öffnen → JSON mit `"quelle":"google-places"`. Der Ordner `cache/` muss beschreibbar sein.
- [ ] Öffnungszeiten im Google-Unternehmensprofil (business.google.com) pflegen – sie erscheinen nach spätestens 6 h auf der Website. Bälliz und Münsingen stehen bei Google aktuell auf «vorübergehend geschlossen» und werden so angezeigt.
- Die API liefert pro Lokal die 5 «relevantesten» Rezensionen; Sterne und Anzahl umfassen alle.

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
