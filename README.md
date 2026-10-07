# FIA Teil 2 · Prüfungstrainer

Gamifiziertes Übungstool für die Abschlussprüfung Teil 2, Fachinformatiker·in
Anwendungsentwicklung – generiert aus `Kann-Liste Prüfung Teil 2 FIA.xlsx`.

## Starten

Einfach `webapp/index.html` im Browser öffnen (Doppelklick reicht, es wird kein
Server benötigt). Alternativ für konsistentes `localStorage`-Verhalten:

```bash
cd webapp
python -m http.server 8080
# dann http://localhost:8080 öffnen
```

## Daten

- `webapp/data.js` wird aus der Excel-Datei generiert (25 Themenbereiche,
  121 Lernziele/Checkpoints) und enthält je Checkpoint die **Gewichtung
  (Relevanz)**, die Beispielaufgabe und alle zugeordneten Prüfungsaufgaben.
- Quelle: Sheet „Kann-Liste“ (Themenbereich-Gewichtung) + Sheet
  „Beispielaufgaben“ (Checkpoints inkl. Relevanz).
- Ändert sich die Excel-Datei, kann `data.js` neu erzeugt werden (Export der
  beiden Sheets nach JSON, siehe Struktur in `data.js`).

## Funktionsweise

- **Dashboard**: Gesamt-Prüfungsreife (gewichtet über alle Checkpoints),
  Level/XP, 💰 Cash, Themenbereich-Kacheln sortierbar nach Gewichtung/
  Fortschritt/Name, Suche.
- **Themenbereich-Detail**: Klick auf eine Kachel öffnet alle Checkpoints mit
  3-Stufen-Status (Offen / In Übung / Beherrscht) sowie — darunter — alle
  Übungsaufgaben zu genau diesem Themenbereich (eigener Status-Filter: Alle /
  Fällig / Neu / Beherrscht). Die Übungsaufgaben sind damit kein globaler
  Grid mehr, sondern an ihren Lernfeld/Prüfungsbereich gekoppelt; die
  Themenbereich-Kachel zeigt vorab einen „📝 N Übungen“-Hinweis.
- **Fokus-Modus**: zieht die 10 Checkpoints mit der höchsten
  `Gewichtung × Themenbereich-Gewichtung × Lücke zur Beherrschung` – so werden
  automatisch die prüfungsrelevantesten offenen Lernziele priorisiert.
- **Übungsaufgaben** (`webapp/exercises-data.js`): 84 konstruktive Aufgaben
  (kein Multiple Choice) über alle 25 Themenbereiche verteilt (3–6 pro
  Thema). Die „Relevanz“-Badge einer Aufgabe ist der Mittelwert der Gewichte
  ihrer zugeordneten Checkpoints (0–100 %, nicht multipliziert mit der
  Themenbereich-Gewichtung — das hätte bei Mehrfach-Checkpoint-Aufgaben
  rechnerisch über 100 % ergeben können). Drei Engines:
  - **Field-Engine** (📊/🧩, z. B. Netzplan, ER-Modell, UML-Diagramme als
    Tabellen, Normalisierung): echte Werte/Dropdowns eintragen, automatischer
    Soll/Ist-Vergleich pro Feld.
  - **Token-Engine** (⌨️/🗄️/🧮, z. B. SQL, Pseudocode-Algorithmen,
    Entwurfsmuster): Freitext-Lösung wird gegen eine strukturelle Checkliste
    (Regex-Muster) geprüft, Musterlösung + Teilpunkte.
  - **Selfassess-Engine** (💭, für konzeptionelle/beschreibende Themen wie
    Stakeholder-Analyse, Risikoanalyse, Qualitätsmerkmale, Sicherheit):
    Freitext-Antwort → Musterlösung aufdecken → Selbstcheck anhand einer
    Kriterien-Checkliste, die den Score live bestimmt (Generation Effect +
    Elaborative Interrogation statt Multiple Choice).
  Nach dem Auto-Check/Selbstcheck folgt eine Selbsteinschätzung (😕/🙂/💪) wie
  im Fokus-Modus — sie setzt den Status der verknüpften Checkpoints,
  bestimmt den 💰 Cash-Multiplikator und das nächste Wiederholungsintervall
  (vereinfachtes Spaced Repetition, Karte wird nach Tagen wieder „fällig“).
  Die Übungsaufgaben-Sektion hat einen Themenbereich-Filter und Status-Chips
  (Alle / Fällig / Noch nicht versucht / Beherrscht).
- **Gamification**: XP = gewichteter Fortschritt, Level 1–25 in 5 Rängen
  (Azubi → Prüfungsmeister·in), 💰 Cash aus Übungsaufgaben (Score × Selbst-
  einschätzung), Meilenstein-Badges (Cash-Schwellen, Readiness-Stufen,
  Themenbereich gemeistert, Übungsaufgaben abgeschlossen) inkl. Toast +
  Konfetti.
- **Fortschritt**: wird automatisch lokal im Browser gespeichert
  (`localStorage`). Export/Import als JSON-Backup und Reset über den
  „⚙ Daten“-Dialog.
- **Netzplan-Tool** (`webapp/netzplan-tool/`): eigenständiges, deutlich
  mächtigeres Werkzeug zum freien Erstellen und Berechnen von Netzplänen
  nach DIN 69900 (Vorgangsknotennetz) — Vorgänge frei anlegen, automatische
  Vorwärts-/Rückwärtsrechnung (FAZ/FEZ/SAZ/SEZ/GP/FP), kritischer Pfad,
  grafischer SVG-Netzplan mit Drag & Drop, Auto-Layout, JSON-/SVG-Export,
  Drucken. Über den 📐-Button oben im Header erreichbar (öffnet in neuem
  Tab, komplett unabhängig vom restlichen Trainer — eigenes helles Theme,
  eigener State). Ursprünglich ein separates Projekt, hier als Kopie
  eingebunden, damit es ohne externe URL/Internetverbindung funktioniert.
- **Bug-Report**: roter 🐛-Button unten links, in jedem Bildschirm sichtbar.
  Erfasst beim Öffnen automatisch Kontext (aktuelle Aufgabe/Themenbereich,
  Browser, Fenstergröße, Fortschritt). Zwei Modi:
  - **Mit Relay konfiguriert** (`BUG_RELAY_URL` in `webapp/app.js` gesetzt):
    Reports landen vollautomatisch als GitHub-Issue — auch für Besucher
    **ohne eigenen GitHub-Account**. Dafür läuft ein kleiner, kostenloser
    Cloudflare-Worker-Relay (`bug-relay-worker.js`, Setup-Anleitung direkt
    in der Datei), der einen fein-skopierten Token (nur „Issues: Read and
    write“ auf genau dieses Repo) im Hintergrund hält — niemals im
    Browser-Code sichtbar. Mit Honeypot-Feld gegen simple Spam-Bots.
  - **Ohne Relay** (Standard, solange `BUG_RELAY_URL` leer ist): Fallback
    auf einen manuell zu öffnenden, vorausgefüllten GitHub-Issue-Tab —
    erfordert einen eigenen GitHub-Account des Melders.

Keine Server-Komponente, keine externen Abhängigkeiten – reines HTML/CSS/JS.
