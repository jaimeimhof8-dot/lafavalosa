# Analyse: favolosa.ch (Stand 13.10.2026)

## Kurzfazit
Die Marke ist stark: echte Fotos, sympathischer Ton, klare Botschaft («täglich frisch, ohne Zusatzstoffe»), gutes Logo. Die Website setzt das aber nicht um. Das Layout wirkt wie ein Baukasten von ~2019, Inhalte sind doppelt vorhanden, wichtige Infos (Öffnungszeiten, Standorte) stehen erst ganz unten, und technisch fehlen Grundlagen für SEO und Barrierefreiheit.

---

## 1. Inhalt & Struktur
| Befund | Wirkung |
|---|---|
| Fast jeder Textblock steht **zweimal** im HTML (je eine Desktop- und eine Mobile-Version) | Duplicate Content, schwerere Seite, Pflegeaufwand doppelt |
| «Gutschein bestellen» erscheint 3× auf der Startseite, ohne Kontext | wirkt aufdringlich, verwässert den Call-to-Action |
| Öffnungszeiten & Standorte nur im Footer | die häufigste Frage («Hat es jetzt offen?») wird zuletzt beantwortet |
| Sortenangebot nur auf der Unterseite «Produktion», nicht auf der Startseite | das eigentliche Produkt fehlt auf der Startseite |
| «Offene Stellen» und Gutschein als **runde PNG-Bilder mit Text** | Text ist für Google & Screenreader unsichtbar |
| Jobs-Seite sucht für «Saison 2025», Footer zeigt «© 2024» | wirkt veraltet |
| Mobile Coolbox / Catering versteckt unter «Events» | wichtige Einnahmequelle zu wenig sichtbar |

**Tippfehler im Live-Text:** «italinienischer», «Vollmich», «Enkaufsspass», «Fior die Latte», «Caffe'», «POZETTI», «Glace aus» (zusammengeschrieben), «Eure Gelati ist».

## 2. Design
- **Farben:** Kakao-Braun `#59463D`, Rosa `#F2B4AE`, Mint `#C9D8D1`. Die Basis passt zum Logo, wird aber blass und ohne klare Hierarchie eingesetzt.
- **Typografie:** Grossbuchstaben-Headlines in Standardschriften, kaum Kontrast zwischen Titel und Fliesstext, keine Eigenständigkeit.
- **Layout:** Viele zentrierte Text-Bild-Blöcke im gleichen Rhythmus. Kein Hero mit klarer Aussage, keine visuelle Führung.
- **Bilder:** Die Fotos sind hochwertig, werden aber als CSS-Hintergründe eingebunden. Dadurch fehlen Alt-Texte, und es gibt Unschärfe durch Zuschnitt.
- **Bewegung/Interaktion:** keine. Die Seite wirkt statisch.

## 3. Technik, SEO & Performance
| Punkt | Ist | Soll |
|---|---|---|
| `<h1>` | **fehlt** | genau 1 aussagekräftige H1 |
| Strukturierte Daten (LocalBusiness/IceCreamShop) | **fehlen** | Standorte + Öffnungszeiten als Schema.org → Google-Maps-/Rich-Results |
| Open Graph | nur Titel/Beschreibung, **kein Bild** | `og:image` für schöne Vorschauen auf WhatsApp/Instagram |
| Bildgrössen | bis **2,2 MB** pro JPG (2126×3187 px) | max. ~300 KB, 1600 px |
| Lazy Loading | 0 Bilder | alle Bilder unterhalb des Sichtbereichs |
| E-Mail | per JavaScript verschleiert (`…@nospam`) | sichtbare Kontaktmöglichkeit |
| CMS | inCMS 5 (Agentur-CMS) | ok, aber Inhalte nur über Agentur pflegbar |
| Server-Antwort | TTFB ~0,24 s | gut |

## 4. Barrierefreiheit
- Text in Bildern (Jobs-/Gutschein-Badges, Logo-Grafiken)
- Hintergrundbilder ohne Alternativtext
- Kontrast: helles Rosa auf Weiss bei Buttons/Badges teils zu schwach
- Cookie-Banner überdeckt die ganze Seite (Maske, Theme «dark»)

---

## 5. Umsetzung im Redesign (`neues-design/`)
| Problem | Lösung |
|---|---|
| Keine klare Botschaft oben | Hero mit H1 «Gelato, wie in Italia. Gemacht in Thun.» + 2 klare CTAs + Kennzahlen |
| Öffnungszeiten versteckt | eigene Sektion «Fünf Lokale. Ein Gelato.» mit **Live-Status** (offen bis / ab / geschlossen, Zeitzone Zürich) und Google-Maps-Links; Hinweis im Hero «Jetzt X Lokale geöffnet» |
| Sorten fehlen auf Startseite | Sorten als farbige «Chips» (Milchsorten/Sorbets) + Herkunft der Zutaten |
| Pozzetti-Story kaum sichtbar | dunkle Qualitäts-Sektion mit Erklärung und 3 Schritten |
| Catering/Coolbox versteckt | eigene Event-Sektion mit Coolbox-Kennzahlen |
| Text in Bildern | Jobs & Gutschein als echte HTML-Karten |
| SEO | 1 H1, saubere H2-Struktur, Schema.org `IceCreamShop` mit allen Standorten, `og:image`, Alt-Texte |
| Performance | Bilder auf max. 1600 px / ≤ 300 KB komprimiert, `loading="lazy"`, `width`/`height` gegen Layout-Sprünge |
| Statisch | GSAP (Text-Reveal, Parallax, Scroll-Reveals, Zähler, magnetische Buttons) + Lenis Smooth Scroll; Marquee reagiert auf Scrolltempo; `prefers-reduced-motion` wird respektiert |
| Tippfehler | alle korrigiert |

**Design-System:** Fraunces (Serif, weich, italienisch-elegant) + DM Sans (Text). Farben vom Logo abgeleitet, aber kräftiger: Crème `#FBF5EE`, Kakao `#3A2A22`, Rosa `#F4C3BC`, Fragola-Rot `#D9473F` als Akzent, Pistazie `#A9C79A`, Menta `#DCE8DF`. Die Bogenform im Hero zitiert klassische Gelateria-Schaufenster, die Rosa-Streifen beim Gutschein das Logo.
