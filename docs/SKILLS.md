# Project skills

- Datenquelle: `Kann-Liste Prüfung Teil 2 FIA.xlsx`, Sheets „Kann-Liste“
  (Themenbereich-Gewichtung) und „Beispielaufgaben“ (121 Checkpoints inkl.
  Relevanz/Gewichtung, Beispielaufgabe-Referenz).
- Datenaufbereitung erfolgt mit Python (`py`, `openpyxl`) → `webapp/data.js`
  (als `const EXAM_DATA = [...]`, damit die App ohne Server per `file://`
  oder lokalem HTTP-Server läuft, ohne fetch/CORS-Probleme).
- Keine Build-Tools nötig: reines HTML/CSS/Vanilla-JS in `webapp/`.
- Fortschritt wird NICHT in die Excel zurückgeschrieben, sondern in
  `localStorage` des Browsers gehalten (Export/Import als JSON-Backup über
  den „⚙ Daten“-Dialog in der App).
