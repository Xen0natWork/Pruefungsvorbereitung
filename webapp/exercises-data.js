/* ===========================================================
   Übungsaufgaben-Daten: Netzplan, SQL, ER-Modell, Algorithmus
   Jede Aufgabe mischt Variante B (strukturierter Auto-Check)
   mit Variante C (Selbsteinschätzung + Spaced-Repetition + Cash).
   =========================================================== */

function computeCPM(activities) {
  const byId = Object.fromEntries(activities.map(a => [a.id, { ...a, preds: [...a.preds] }]));
  const list = Object.values(byId);
  list.forEach(a => a.succs = []);
  list.forEach(a => a.preds.forEach(p => byId[p].succs.push(a.id)));
  list.forEach(a => {
    a.FAZ = a.preds.length ? Math.max(...a.preds.map(p => byId[p].FEZ)) : 0;
    a.FEZ = a.FAZ + a.duration;
  });
  const projectEnd = Math.max(...list.map(a => a.FEZ));
  [...list].reverse().forEach(a => {
    a.SEZ = a.succs.length ? Math.min(...a.succs.map(s => byId[s].SAZ)) : projectEnd;
    a.SAZ = a.SEZ - a.duration;
  });
  list.forEach(a => {
    a.GP = a.SAZ - a.FAZ;
    a.FP = a.succs.length ? Math.min(...a.succs.map(s => byId[s].FAZ)) - a.FEZ : a.GP;
    a.critical = a.GP === 0;
  });
  return { byId, projectEnd };
}

const NETZPLAN_ACTIVITIES = [
  { id: 'A', name: 'Konzept', duration: 3, preds: [] },
  { id: 'B', name: 'Design', duration: 4, preds: ['A'] },
  { id: 'C', name: 'Content-Erstellung', duration: 2, preds: ['A'] },
  { id: 'D', name: 'Bildbearbeitung', duration: 3, preds: ['C'] },
  { id: 'E', name: 'Entwicklung', duration: 8, preds: ['B'] },
  { id: 'F', name: 'Go-Live', duration: 2, preds: ['D', 'E'] },
];

const EXERCISES = [
  {
    id: 'netzplan-1',
    title: 'Netzplan berechnen',
    icon: '📅',
    engine: 'field',
    topicId: 2,
    checkpointNrs: ['2.4', '2.5'],
    baseReward: 180,
    intro: 'Projekt „Website-Relaunch“ — berechne FAZ, FEZ, SAZ, SEZ, Gesamtpuffer (GP) und freien Puffer (FP) für jeden Vorgang und markiere den kritischen Pfad.',
    hints: [
      'FAZ = größte FEZ aller Vorgänger (Start = 0)',
      'FEZ = FAZ + Dauer',
      'SEZ = kleinste SAZ aller Nachfolger (Projektende = letztes FEZ)',
      'SAZ = SEZ − Dauer',
      'GP (Gesamtpuffer) = SAZ − FAZ',
      'FP (freier Puffer) = kleinste FAZ aller Nachfolger − FEZ',
    ],
    build() {
      const { byId, projectEnd } = computeCPM(NETZPLAN_ACTIVITIES);
      const rows = NETZPLAN_ACTIVITIES.map(a => ({
        id: a.id,
        label: `${a.id} – ${a.name} (${a.duration}d)`,
        fields: [
          { key: 'FAZ', type: 'number', expected: byId[a.id].FAZ },
          { key: 'FEZ', type: 'number', expected: byId[a.id].FEZ },
          { key: 'SAZ', type: 'number', expected: byId[a.id].SAZ },
          { key: 'SEZ', type: 'number', expected: byId[a.id].SEZ },
          { key: 'GP', type: 'number', expected: byId[a.id].GP },
          { key: 'FP', type: 'number', expected: byId[a.id].FP },
          { key: 'kritisch', type: 'checkbox', expected: byId[a.id].critical },
        ],
      }));
      return {
        columns: ['FAZ', 'FEZ', 'SAZ', 'SEZ', 'GP', 'FP', 'kritisch'],
        tableData: [
          ['Vorgang', 'Bezeichnung', 'Dauer', 'Vorgänger'],
          ...NETZPLAN_ACTIVITIES.map(a => [a.id, a.name, String(a.duration), a.preds.join(', ') || '—']),
        ],
        rows,
        explanation: `Projektende: ${projectEnd} Tage. Kritischer Pfad: ${NETZPLAN_ACTIVITIES.filter(a => byId[a.id].critical).map(a => a.id).join(' → ')}. ` +
          `Vorgang C hat einen Gesamtpuffer von ${byId['C'].GP} Tagen (darf insgesamt verschoben werden, ohne das Projektende zu gefährden), ` +
          `aber nur ${byId['C'].FP} Tage freien Puffer, weil sich sonst der früheste Start des direkten Nachfolgers D sofort verschiebt. ` +
          `GP bezieht sich auf das gesamte Projektende, FP nur auf den direkt folgenden Vorgang — deshalb können beide Werte stark voneinander abweichen.`,
      };
    },
  },

  {
    id: 'sql-1',
    title: 'SQL-Abfrage schreiben',
    icon: '🗄️',
    engine: 'token',
    topicId: 25,
    checkpointNrs: ['25.2', '25.3'],
    baseReward: 160,
    intro: 'Tabellen: <code>Kunden(KundenID, Name, Ort)</code> und <code>Bestellungen(BestellID, KundenID, Datum, Betrag)</code>.<br><br>' +
      'Aufgabe: Gib für jeden Kunden aus Hamburg den Namen, die Anzahl seiner Bestellungen und die Summe seines Bestellbetrags aus. ' +
      'Zeige nur Kunden mit mehr als 2 Bestellungen. Sortiere absteigend nach Bestellsumme.',
    placeholder: 'SELECT ...\nFROM ...\nJOIN ...\nWHERE ...\nGROUP BY ...\nHAVING ...\nORDER BY ...',
    tokens: [
      { label: 'SELECT-Klausel vorhanden', regex: /select/i },
      { label: 'FROM Kunden', regex: /from\s+kunden/i },
      { label: 'JOIN mit Bestellungen über KundenID', regex: /join\s+bestellungen.*on.*kundenid/is },
      { label: "WHERE ... Ort = 'Hamburg'", regex: /where.*ort\s*=\s*'?hamburg'?/is },
      { label: 'GROUP BY (Name oder KundenID)', regex: /group\s+by\s+(name|kundenid|k\.\w+)/i },
      { label: 'COUNT(*) für Bestellanzahl', regex: /count\s*\(/i },
      { label: 'SUM(Betrag) für Bestellsumme', regex: /sum\s*\(\s*(\w+\.)?betrag\s*\)/i },
      { label: 'HAVING COUNT(...) > 2', regex: /having\s+count\s*\([^)]*\)\s*>\s*2/i },
      { label: 'ORDER BY ... DESC', regex: /order\s+by\s+.*desc/i },
    ],
    modelAnswer:
      'SELECT k.Name, COUNT(b.BestellID) AS AnzahlBestellungen, SUM(b.Betrag) AS Bestellsumme\n' +
      'FROM Kunden k\n' +
      'JOIN Bestellungen b ON b.KundenID = k.KundenID\n' +
      "WHERE k.Ort = 'Hamburg'\n" +
      'GROUP BY k.Name\n' +
      'HAVING COUNT(b.BestellID) > 2\n' +
      'ORDER BY Bestellsumme DESC;',
  },

  {
    id: 'er-1',
    title: 'ER-Modell entwerfen',
    icon: '🧩',
    engine: 'field',
    topicId: 22,
    checkpointNrs: ['22.1', '22.2'],
    baseReward: 170,
    intro: 'Szenario „Fahrradverleih“: Kunden mieten Fahrräder (Vermietung mit Datum). Jedes Fahrrad steht an genau einer Station, ' +
      'aber an einer Station können mehrere Fahrräder stehen. ' +
      'Ein Fahrrad kann mehreren Kategorien zugeordnet sein (z. B. „E-Bike“, „Lastenrad“), eine Kategorie gilt für viele Fahrräder.<br><br>' +
      'Bestimme für jede Beziehung die Kardinalität, ob eine Zwischentabelle nötig ist, und wo der Fremdschlüssel steht.',
    hints: [
      'Kardinalität 1:N: Fremdschlüssel steht auf der „N“-Seite',
      'Kardinalität N:M: braucht immer eine Zwischentabelle mit zwei Fremdschlüsseln',
      'Frage dich: kann ein Fahrrad mehrere Kategorien UND eine Kategorie mehrere Fahrräder haben? → N:M',
    ],
    build() {
      return {
        columns: ['kardinalitaet', 'zwischentabelle', 'fremdschluessel'],
        tableData: [
          ['Beziehung'],
          ['Kunde — Vermietung'],
          ['Fahrrad — Vermietung'],
          ['Fahrrad — Kategorie'],
          ['Fahrrad — Station'],
        ],
        rows: [
          {
            id: 'r1', label: 'Kunde — Vermietung',
            fields: [
              { key: 'kardinalitaet', type: 'select', options: ['1:1', '1:N', 'N:M'], expected: '1:N' },
              { key: 'zwischentabelle', type: 'select', options: ['-', 'Fahrrad_Kategorie'], expected: '-' },
              { key: 'fremdschluessel', type: 'select', options: ['Vermietung.KundenID', 'Vermietung.FahrradID', 'Fahrrad.StationID', 'FahrradID, KategorieID'], expected: 'Vermietung.KundenID' },
            ],
          },
          {
            id: 'r2', label: 'Fahrrad — Vermietung',
            fields: [
              { key: 'kardinalitaet', type: 'select', options: ['1:1', '1:N', 'N:M'], expected: '1:N' },
              { key: 'zwischentabelle', type: 'select', options: ['-', 'Fahrrad_Kategorie'], expected: '-' },
              { key: 'fremdschluessel', type: 'select', options: ['Vermietung.KundenID', 'Vermietung.FahrradID', 'Fahrrad.StationID', 'FahrradID, KategorieID'], expected: 'Vermietung.FahrradID' },
            ],
          },
          {
            id: 'r3', label: 'Fahrrad — Kategorie',
            fields: [
              { key: 'kardinalitaet', type: 'select', options: ['1:1', '1:N', 'N:M'], expected: 'N:M' },
              { key: 'zwischentabelle', type: 'select', options: ['-', 'Fahrrad_Kategorie'], expected: 'Fahrrad_Kategorie' },
              { key: 'fremdschluessel', type: 'select', options: ['Vermietung.KundenID', 'Vermietung.FahrradID', 'Fahrrad.StationID', 'FahrradID, KategorieID'], expected: 'FahrradID, KategorieID' },
            ],
          },
          {
            id: 'r4', label: 'Fahrrad — Station',
            fields: [
              { key: 'kardinalitaet', type: 'select', options: ['1:1', '1:N', 'N:M'], expected: '1:N' },
              { key: 'zwischentabelle', type: 'select', options: ['-', 'Fahrrad_Kategorie'], expected: '-' },
              { key: 'fremdschluessel', type: 'select', options: ['Vermietung.KundenID', 'Vermietung.FahrradID', 'Fahrrad.StationID', 'FahrradID, KategorieID'], expected: 'Fahrrad.StationID' },
            ],
          },
        ],
        explanation: 'Kunde–Vermietung und Fahrrad–Vermietung sind je 1:N (Fremdschlüssel auf der Vermietung). ' +
          'Fahrrad–Station ist 1:N (Fremdschlüssel StationID auf Fahrrad). Fahrrad–Kategorie ist N:M, da beide Seiten mehrfach ' +
          'zugeordnet sein können — das erfordert eine Zwischentabelle (z. B. Fahrrad_Kategorie) mit beiden IDs als zusammengesetztem Schlüssel.',
      };
    },
  },

  {
    id: 'algo-1',
    title: 'Algorithmus in Pseudocode',
    icon: '🧮',
    engine: 'token',
    topicId: 10,
    checkpointNrs: ['10.2'],
    baseReward: 150,
    intro: 'Gegeben ist eine Liste von Bestellungen, jede mit den Attributen <code>betrag</code> (Zahl) und <code>bezahlt</code> (true/false). ' +
      'Entwickle einen Algorithmus in Pseudocode, der (1) zählt, wie viele Bestellungen NICHT bezahlt sind, und (2) die Summe der Beträge ' +
      'dieser unbezahlten Bestellungen berechnet. Gib am Ende beide Werte zurück.',
    placeholder: 'anzahl = 0\nsumme = 0\nFÜR JEDE bestellung IN bestellungen\n  WENN ...\n    ...\nRÜCKGABE anzahl, summe',
    tokens: [
      { label: 'Zähler initialisieren (z. B. anzahl = 0)', regex: /(z[äa]hler|anzahl|count)\s*(=|:=|<-)\s*0/i },
      { label: 'Summe initialisieren (z. B. summe = 0)', regex: /(summe|sum)\s*(=|:=|<-)\s*0/i },
      { label: 'Schleife über die Liste', regex: /(für\s+jed|for\s+each|foreach|für\s+\w+\s+(in|von)|while)/i },
      { label: 'Bedingung: bezahlt ist falsch', regex: /(nicht|not|!)\s*[\w.]*bezahlt|bezahlt\s*(==|=)\s*(false|falsch)/i },
      { label: 'Zähler erhöhen (+1)', regex: /(z[äa]hler|anzahl|count)\s*(=|:=|<-)\s*(z[äa]hler|anzahl|count)\s*\+\s*1|(z[äa]hler|anzahl|count)\s*\+\+/i },
      { label: 'Summe erhöhen (+ betrag)', regex: /(summe|sum)\s*(=|:=|<-)\s*(summe|sum)\s*\+/i },
      { label: 'Rückgabe beider Werte', regex: /(rückgabe|return|gib\s+zurück|ausgabe)/i },
    ],
    modelAnswer:
      'anzahl = 0\nsumme = 0\nFÜR JEDE bestellung IN bestellungen\n  WENN NICHT bestellung.bezahlt\n' +
      '    anzahl = anzahl + 1\n    summe = summe + bestellung.betrag\nRÜCKGABE anzahl, summe',
  },
];


/* ---------- Zusätzliche Übungsaufgaben (Methode B + C) ---------- */

EXERCISES.push(
{
  "id": "1a",
  "title": "Stakeholder & Befürchtungen",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 1,
  "checkpointNrs": [
    "1.1",
    "1.2"
  ],
  "baseReward": 130,
  "intro": "Die Stadtverwaltung Musterstadt plant die Einführung einer neuen Fachsoftware zur digitalen Bearbeitung von Bauanträgen. Bisher erfolgte die Bearbeitung papierbasiert über mehrere Ämter hinweg. Nenne mindestens vier Stakeholder dieses Projekts und beschreibe jeweils deren Interessen, Erwartungen und mögliche Befürchtungen.",
  "modelAnswer": "<strong>Amtsleitung/Auftraggeber:</strong> Interesse an schnellerer Antragsbearbeitung und Kosteneinsparung; Erwartung: Projekt im Budget- und Zeitrahmen; Befürchtung: Image-Schaden bei Fehlschlag.<br><strong>Sachbearbeiter/innen:</strong> Interesse an Arbeitserleichterung; Erwartung: intuitive Bedienung und Schulung; Befürchtung: Arbeitsplatzverlust durch Automatisierung.<br><strong>IT-Abteilung:</strong> Interesse an stabiler, wartbarer Lösung; Erwartung: klare Spezifikationen; Befürchtung: zusätzlicher Supportaufwand.<br><strong>Bürger/innen:</strong> Interesse an schnelleren Verfahren; Erwartung: einfache Online-Antragstellung; Befürchtung: Datenschutzprobleme.<br><strong>Betriebsrat:</strong> Interesse am Mitarbeiterschutz; Erwartung: Einbindung; Befürchtung: Stellenabbau.",
  "checklist": [
    "Mindestens vier unterschiedliche Stakeholder genannt",
    "Für jeden Stakeholder Interessen, Erwartungen UND Befürchtungen beschrieben",
    "Interne und externe Stakeholder unterschieden",
    "Bezug zum Szenario erkennbar",
    "Realistische, nachvollziehbare Begründungen gegeben"
  ]
},
{
  "id": "1b",
  "title": "Konflikt & Workshop-Ziele",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 1,
  "checkpointNrs": [
    "1.3",
    "1.4"
  ],
  "baseReward": 120,
  "intro": "Mehrere Sachbearbeiter/innen äußern die Befürchtung, durch Automatisierung ihren Arbeitsplatz zu verlieren. Beschreibe, wie das Projektteam diesen Konflikt schrittweise bewältigen kann, und erläutere Ziele eines gemeinsamen Einführungs-Workshops mit dem Kunden.",
  "modelAnswer": "<strong>Konfliktbewältigung:</strong> 1) Ängste offen ansprechen statt ignorieren. 2) Ursachenanalyse (worauf beruht die Angst konkret?). 3) Transparente Information über tatsächliche Auswirkungen. 4) Beteiligung der Mitarbeiter an der Prozessgestaltung. 5) Schulungsangebote zur Qualifizierung. 6) Verbindliche Zusagen (z. B. mit Betriebsrat). 7) Regelmäßiges Nachhalten per Feedback.<br><strong>Workshop-Ziele:</strong> gemeinsames Verständnis von Nutzen schaffen, Erwartungen abgleichen, praktische Einweisung geben, offene Fragen klären, Akzeptanz fördern, Feedback zur Benutzerfreundlichkeit einholen, Vertrauen aufbauen.",
  "checklist": [
    "Mindestens 4 nachvollziehbare Schritte zur Konfliktbewältigung genannt",
    "Konkreter Bezug zur Angst vor Arbeitsplatzverlust",
    "Mindestens 3 Workshop-Ziele erläutert",
    "Unterscheidung Information/Beteiligung/Qualifizierung erkennbar"
  ]
},
{
  "id": "1c",
  "title": "Umfeldanalyse & Green IT",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 1,
  "checkpointNrs": [
    "1.5",
    "1.6",
    "1.7"
  ],
  "baseReward": 130,
  "intro": "Vor Projektbeginn soll eine Umfeldanalyse durchgeführt werden. Zusätzlich sollen Probleme des aktuellen papierbasierten Prozesses und der Digitalisierungsnutzen betrachtet werden, sowie das Thema Green IT. Beschreibe a) technisches/rechtliches Umfeld, b) Probleme des bestehenden Prozesses und Digitalisierungsnutzen, c) Green IT und seine Ziele.",
  "modelAnswer": "<strong>a) Technisches Umfeld:</strong> bestehende IT-Infrastruktur, Schnittstellen, Hard-/Software-Standards. <strong>Rechtliches Umfeld:</strong> DSGVO, Verwaltungsvorschriften, E-Government-Gesetz, Barrierefreiheit.<br><strong>b) Probleme:</strong> lange Bearbeitungszeiten, Medienbrüche, hoher Ablageaufwand, fehlende Transparenz, Fehleranfälligkeit. <strong>Nutzen:</strong> schnellere Bearbeitung, weniger Fehler, orts-/zeitunabhängiger Zugriff, Kosteneinsparung, höhere Transparenz.<br><strong>c) Green IT:</strong> ressourcen- und umweltschonender IT-Einsatz über den gesamten Lebenszyklus. <strong>Ziele:</strong> weniger Energieverbrauch, weniger Elektroschrott, Papiereinsparung, Kostensenkung, Klimaschutz.",
  "checklist": [
    "Mindestens 2 technische und 2 rechtliche Umfeldaspekte genannt",
    "Mindestens 3 Probleme des bestehenden Prozesses benannt",
    "Mindestens 3 Digitalisierungsnutzen erläutert",
    "Green IT korrekt definiert mit mind. 3 Zielen"
  ]
},
{
  "id": "2b",
  "title": "Vorgehensmodelle & Scrum",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 2,
  "checkpointNrs": [
    "2.1",
    "2.2",
    "2.3"
  ],
  "baseReward": 130,
  "intro": "Das Projektteam muss entscheiden, nach welchem Vorgehensmodell entwickelt wird. Beschreibe klassische und agile Vorgehensmodelle, vergleiche beide, und beschreibe Scrum inkl. Rollen, Artefakten und Ereignissen.",
  "modelAnswer": "<strong>Klassisch:</strong> sequenziell, phasenorientiert (Wasserfall, V-Modell), Anforderungen zu Beginn festgelegt.<br><strong>Agil:</strong> iterativ, inkrementell (Scrum, Kanban), Anforderungen ändern sich, enge Kundenzusammenarbeit.<br><strong>Vergleich:</strong> klassisch = Planungssicherheit, geringe Flexibilität; agil = hohe Flexibilität, mehr Selbstorganisation nötig.<br><strong>Scrum-Rollen:</strong> Product Owner (Backlog, Priorisierung), Scrum Master (Prozess, Hindernisse), Entwicklungsteam (Umsetzung).<br><strong>Artefakte:</strong> Product Backlog, Sprint Backlog, Increment.<br><strong>Ereignisse:</strong> Sprint, Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospektive.",
  "checklist": [
    "Klassisches Modell korrekt beschrieben",
    "Agiles Modell korrekt beschrieben",
    "Mind. 2 Unterschiede im Vergleich",
    "Alle drei Scrum-Rollen genannt",
    "Artefakte und Ereignisse korrekt zugeordnet"
  ]
},
{
  "id": "2c",
  "title": "Change Request & Abschluss",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 2,
  "checkpointNrs": [
    "2.6",
    "2.7"
  ],
  "baseReward": 130,
  "intro": "Kurz vor Fertigstellung äußert der Kunde einen Änderungswunsch, das Projekt nähert sich einem Meilenstein und dem Abschluss. Erläutere Change Request Management, Meilenstein, Stakeholder und Lessons Learned. Beschreibe die Vorbereitung des Abschlussprotokolls und die Prüfung des Projekterfolgs.",
  "modelAnswer": "<strong>Change Request Management:</strong> strukturierter Prozess zur Erfassung, Bewertung und formalen Freigabe von Änderungswünschen.<br><strong>Meilenstein:</strong> terminierter, bedeutsamer Zwischenpunkt im Projektplan.<br><strong>Stakeholder:</strong> Personen/Gruppen mit Interesse am Projekt.<br><strong>Lessons Learned:</strong> dokumentierte Erfahrungen für zukünftige Projekte.<br><strong>Abschlussprotokoll:</strong> Projektunterlagen sammeln, Soll-Ist-Vergleich (Ziele, Termine, Kosten), Feedback einholen, offene Punkte festhalten.<br><strong>Erfolgsprüfung:</strong> Abgleich mit Lastenheft, Termine/Budget/Qualität prüfen, Kundenzufriedenheit, formale Abnahme.",
  "checklist": [
    "Alle vier Begriffe korrekt erläutert",
    "Mind. 3 Vorbereitungsschritte für Abschlussprotokoll",
    "Soll-Ist-Vergleich als Erfolgskriterium erkannt",
    "Bezug auf Termine, Kosten UND Qualität"
  ]
},
{
  "id": "3a",
  "title": "Machbarkeitsanalyse",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 3,
  "checkpointNrs": [
    "3.1"
  ],
  "baseReward": 120,
  "intro": "Ein Unternehmen plant die Einführung eines CRM-Systems. Beschreibe die Kriterien einer Machbarkeitsanalyse und wende sie auf das CRM-Projekt an.",
  "modelAnswer": "<strong>Technisch:</strong> Prüfung ob IT-Infrastruktur und Schnittstellen das CRM unterstützen.<br><strong>Wirtschaftlich:</strong> Kosten-Nutzen-Analyse, ROI-Betrachtung.<br><strong>Zeitlich:</strong> Realisierbarkeit im geforderten Zeitrahmen mit vorhandenen Ressourcen.<br><strong>Rechtlich/organisatorisch:</strong> Datenschutz (DSGVO), Vertragsbedingungen, Betriebsrat.<br><strong>Fazit:</strong> erst bei positiver Bewertung aller vier Kriterien gilt das Projekt als machbar.",
  "checklist": [
    "Alle vier Kriterien genannt und erläutert",
    "Jedes Kriterium mit Bezug zum CRM-Szenario",
    "Wirtschaftliche Machbarkeit inkl. Kosten-Nutzen",
    "Rechtliche Machbarkeit inkl. Datenschutz",
    "Abschließendes Fazit gezogen"
  ]
},
{
  "id": "3b",
  "title": "Risikoanalyse",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 3,
  "checkpointNrs": [
    "3.2"
  ],
  "baseReward": 130,
  "intro": "In einem Softwareprojekt mit knappem Zeitplan arbeitet ein externer Dienstleister mit. Erstelle eine Risikoanalyse: mind. drei Risiken nach Ursache→Risiko→Auswirkung, mit Gegenmaßnahme.",
  "modelAnswer": "<strong>Risiko 1 – Lieferverzug:</strong> Ursache: Dienstleister parallel in mehreren Projekten. Risiko: Teilleistungen verspätet. Auswirkung: Zeitplanverzug. Gegenmaßnahme: vertragliche Meilensteine mit Pönale.<br><strong>Risiko 2 – Unklare Anforderungen:</strong> Ursache: verkürzte Analyse durch Zeitdruck. Risiko: missverständliche Doku. Auswirkung: teure Nachbesserung. Gegenmaßnahme: User Stories, frühe Abstimmung.<br><strong>Risiko 3 – Kommunikationsprobleme:</strong> Ursache: räumliche Trennung, andere Tools. Risiko: Informationsverlust. Auswirkung: Doppelarbeit. Gegenmaßnahme: gemeinsames Ticketsystem, Jour-fixe.",
  "checklist": [
    "Mind. drei Risiken nach Ursache→Risiko→Auswirkung",
    "Bezug zu Zeitplan und/oder Dienstleister",
    "Zu jedem Risiko eine passende Gegenmaßnahme",
    "Strukturierte, nachvollziehbare Darstellung"
  ]
},
{
  "id": "3c",
  "title": "Kostenarten & Fremdvergabe",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 3,
  "checkpointNrs": [
    "3.3",
    "3.4"
  ],
  "baseReward": 110,
  "intro": "Beschreibe die wichtigsten Kostenarten eines Softwareprojekts und erläutere Vor-/Nachteile der Fremdvergabe (Outsourcing).",
  "modelAnswer": "<strong>Personalkosten:</strong> Gehälter der Entwickler/Projektleiter – größter Kostenblock.<br><strong>Hardwarekosten:</strong> Server, Entwicklungsrechner, Testumgebungen.<br><strong>Lizenzkosten:</strong> Entwicklungswerkzeuge, DB-Systeme, Drittkomponenten.<br><strong>Schulungskosten:</strong> Einarbeitung, Anwenderschulung.<br><strong>Wartungskosten:</strong> Fehlerbehebung, Updates nach Projektende.<br><strong>Fremdvergabe Vorteile:</strong> Spezialwissen ohne eigenen Aufbau, flexible Kapazitäten.<br><strong>Nachteile:</strong> Abhängigkeit, Koordinationsaufwand, Qualitäts-/Sicherheitsrisiken.",
  "checklist": [
    "Mind. 4 der 5 Kostenarten korrekt beschrieben",
    "Zu jeder Kostenart ein Beispiel/kurze Erklärung",
    "Mind. 1 Vorteil der Fremdvergabe begründet",
    "Mind. 1 Nachteil der Fremdvergabe begründet"
  ]
},
{
  "id": "4a",
  "title": "Schwachstellen & Anforderungen",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 4,
  "checkpointNrs": [
    "4.1",
    "4.2"
  ],
  "baseReward": 120,
  "intro": "Für ein telefonisches Terminvergabesystem einer Arztpraxis soll ein Online-Buchungssystem entwickelt werden. Nenne mind. drei Schwachstellen der bestehenden Lösung und erläutere den Unterschied zwischen funktionalen und nichtfunktionalen Anforderungen je an einem Beispiel.",
  "modelAnswer": "<strong>Schwachstellen:</strong> nur zu Öffnungszeiten erreichbar; manueller, fehleranfälliger Eintrag (Doppelbuchungen); lange Wartezeiten am Telefon; keine automatische Erinnerung (No-Shows).<br><strong>Funktionale Anforderung:</strong> beschreibt WAS das System tun muss, z. B. 'Patient kann einen freien Termin auswählen und buchen.'<br><strong>Nichtfunktionale Anforderung:</strong> beschreibt WIE gut/unter welchen Rahmenbedingungen, z. B. 'Terminübersicht lädt in max. 2 Sekunden' (Performance) oder 'Datenübertragung verschlüsselt' (Sicherheit).",
  "checklist": [
    "Mind. drei plausible Schwachstellen genannt",
    "Funktionale Anforderung korrekt definiert und mit Beispiel belegt",
    "Nichtfunktionale Anforderung korrekt definiert und mit Beispiel belegt",
    "Beispiele passen zum Online-Buchungssystem"
  ]
},
{
  "id": "4b",
  "title": "User Story & INVEST",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 4,
  "checkpointNrs": [
    "4.3"
  ],
  "baseReward": 110,
  "intro": "Beschreibe den Aufbau einer User Story ('Als [Rolle] möchte ich [Ziel], damit [Nutzen]') und erläutere ein INVEST-Kriterium ausführlich an einem Beispiel.",
  "modelAnswer": "<strong>Aufbau:</strong> 'Als [Rolle] möchte ich [Ziel/Funktion], damit [Nutzen]' – Rolle, Ziel, Nutzen fokussieren auf Kundennutzen statt Technik.<br><strong>Beispiel:</strong> 'Als Patient möchte ich meinen Arzttermin online stornieren können, damit ich keinen unnötigen Weg mache.'<br><strong>INVEST – Testable:</strong> eine gute Story muss überprüfbar sein, meist durch Akzeptanzkriterien, z. B. 'Nach Stornierung erhält der Patient eine Bestätigungs-E-Mail und der Termin wird frei markiert.'",
  "checklist": [
    "Schema 'Als...möchte ich...damit' korrekt erklärt",
    "Eigenes passendes Beispiel formuliert",
    "Ein INVEST-Kriterium korrekt benannt und erklärt",
    "Kriterium an konkretem Beispiel veranschaulicht"
  ]
},
{
  "id": "4c",
  "title": "User Stories formulieren",
  "icon": "⌨️",
  "engine": "token",
  "topicId": 4,
  "checkpointNrs": [
    "4.4"
  ],
  "baseReward": 110,
  "intro": "Szenario: Ein Patient möchte online einen Arzttermin buchen und bei Bedarf wieder absagen können. Formuliere 2-3 User Stories im Format 'Als [Rolle] möchte ich [Ziel], damit [Nutzen]'.",
  "placeholder": "Als ... möchte ich ..., damit ...",
  "tokens": [
    {
      "label": "Rollen-Formulierung (Als ...)",
      "pattern": "als\\s+\\w+"
    },
    {
      "label": "Ziel-Formulierung (möchte ich ...)",
      "pattern": "möchte\\s+ich"
    },
    {
      "label": "Nutzen-Formulierung (damit ...)",
      "pattern": "damit\\b"
    }
  ],
  "modelAnswer": "Als Patient möchte ich online einen freien Arzttermin buchen können, damit ich keinen Anruf während der Öffnungszeiten tätigen muss.\nAls Patient möchte ich meine gebuchten Termine einsehen können, damit ich den Überblick behalte.\nAls Patient möchte ich einen gebuchten Termin online stornieren können, damit der Termin für andere freigegeben wird und ich keinen unnötigen Weg machen muss."
},
{
  "id": "5a",
  "title": "Anwendungsfalldiagramm",
  "icon": "🧩",
  "engine": "field",
  "topicId": 5,
  "checkpointNrs": [
    "5.1"
  ],
  "baseReward": 150,
  "intro": "Modelliere die Beziehungen für ein UML-Anwendungsfalldiagramm eines Online-Shops. Akteure: Kunde, Zahlungsdienstleister. Use Cases: Bestellen, Bezahlen (include von Bestellen), Gastbestellung (extend von Bestellen), Konto erstellen (Basis einer Generalisierung mit 'Mit Social-Login registrieren').",
  "build": {
    "columns": [
      "beziehungstyp",
      "beteiligte"
    ],
    "tableData": [
      [
        "Beziehung"
      ],
      [
        "Beziehung 1"
      ],
      [
        "Beziehung 2"
      ],
      [
        "Beziehung 3"
      ],
      [
        "Beziehung 4"
      ],
      [
        "Beziehung 5"
      ]
    ],
    "rows": [
      {
        "id": "r1",
        "label": "Beziehung 1",
        "fields": [
          {
            "key": "beziehungstyp",
            "type": "select",
            "options": [
              "Akteur-UseCase",
              "include",
              "extend",
              "Generalisierung"
            ],
            "expected": "Akteur-UseCase"
          },
          {
            "key": "beteiligte",
            "type": "select",
            "options": [
              "Kunde → Bestellen",
              "Zahlungsdienstleister → Bezahlen",
              "Bestellen → Bezahlen",
              "Gastbestellung → Bestellen",
              "Mit Social-Login registrieren → Konto erstellen"
            ],
            "expected": "Kunde → Bestellen"
          }
        ]
      },
      {
        "id": "r2",
        "label": "Beziehung 2",
        "fields": [
          {
            "key": "beziehungstyp",
            "type": "select",
            "options": [
              "Akteur-UseCase",
              "include",
              "extend",
              "Generalisierung"
            ],
            "expected": "Akteur-UseCase"
          },
          {
            "key": "beteiligte",
            "type": "select",
            "options": [
              "Kunde → Bestellen",
              "Zahlungsdienstleister → Bezahlen",
              "Bestellen → Bezahlen",
              "Gastbestellung → Bestellen",
              "Mit Social-Login registrieren → Konto erstellen"
            ],
            "expected": "Zahlungsdienstleister → Bezahlen"
          }
        ]
      },
      {
        "id": "r3",
        "label": "Beziehung 3",
        "fields": [
          {
            "key": "beziehungstyp",
            "type": "select",
            "options": [
              "Akteur-UseCase",
              "include",
              "extend",
              "Generalisierung"
            ],
            "expected": "include"
          },
          {
            "key": "beteiligte",
            "type": "select",
            "options": [
              "Kunde → Bestellen",
              "Zahlungsdienstleister → Bezahlen",
              "Bestellen → Bezahlen",
              "Gastbestellung → Bestellen",
              "Mit Social-Login registrieren → Konto erstellen"
            ],
            "expected": "Bestellen → Bezahlen"
          }
        ]
      },
      {
        "id": "r4",
        "label": "Beziehung 4",
        "fields": [
          {
            "key": "beziehungstyp",
            "type": "select",
            "options": [
              "Akteur-UseCase",
              "include",
              "extend",
              "Generalisierung"
            ],
            "expected": "extend"
          },
          {
            "key": "beteiligte",
            "type": "select",
            "options": [
              "Kunde → Bestellen",
              "Zahlungsdienstleister → Bezahlen",
              "Bestellen → Bezahlen",
              "Gastbestellung → Bestellen",
              "Mit Social-Login registrieren → Konto erstellen"
            ],
            "expected": "Gastbestellung → Bestellen"
          }
        ]
      },
      {
        "id": "r5",
        "label": "Beziehung 5",
        "fields": [
          {
            "key": "beziehungstyp",
            "type": "select",
            "options": [
              "Akteur-UseCase",
              "include",
              "extend",
              "Generalisierung"
            ],
            "expected": "Generalisierung"
          },
          {
            "key": "beteiligte",
            "type": "select",
            "options": [
              "Kunde → Bestellen",
              "Zahlungsdienstleister → Bezahlen",
              "Bestellen → Bezahlen",
              "Gastbestellung → Bestellen",
              "Mit Social-Login registrieren → Konto erstellen"
            ],
            "expected": "Mit Social-Login registrieren → Konto erstellen"
          }
        ]
      }
    ],
    "explanation": "Kunde/Zahlungsdienstleister sind per Assoziation mit ihren Use Cases verbunden. 'Bestellen' benötigt zwingend 'Bezahlen' (include). 'Gastbestellung' ist ein optionaler Spezialfall von 'Bestellen' (extend). 'Mit Social-Login registrieren' ist eine spezialisierte Variante von 'Konto erstellen' (Generalisierung, Pfeil zum allgemeineren Use Case)."
  }
},
{
  "id": "5b",
  "title": "Aktivitätsdiagramm mit Schwimmbahnen",
  "icon": "🧩",
  "engine": "field",
  "topicId": 5,
  "checkpointNrs": [
    "5.2",
    "5.3"
  ],
  "baseReward": 150,
  "intro": "Urlaubsantrag-Prozess mit Schwimmbahnen 'Mitarbeiter', 'Vorgesetzter', 'HR-Abteilung'. Ordne jedem Aktivitätsschritt die Schwimmbahn zu und ob es eine Verzweigung ist.",
  "build": {
    "columns": [
      "schwimmbahn",
      "verzweigung"
    ],
    "tableData": [
      [
        "Schritt"
      ],
      [
        "1. Urlaubsantrag stellen"
      ],
      [
        "2. Antrag prüfen"
      ],
      [
        "3. Entscheidung genehmigt/abgelehnt?"
      ],
      [
        "4. Urlaub im System buchen"
      ],
      [
        "5. Bestätigung erhalten"
      ],
      [
        "6. Ablehnung erhalten"
      ]
    ],
    "rows": [
      {
        "id": "s1",
        "label": "1. Urlaubsantrag stellen",
        "fields": [
          {
            "key": "schwimmbahn",
            "type": "select",
            "options": [
              "Mitarbeiter",
              "Vorgesetzter",
              "HR-Abteilung"
            ],
            "expected": "Mitarbeiter"
          },
          {
            "key": "verzweigung",
            "type": "select",
            "options": [
              "Ja",
              "Nein"
            ],
            "expected": "Nein"
          }
        ]
      },
      {
        "id": "s2",
        "label": "2. Antrag prüfen",
        "fields": [
          {
            "key": "schwimmbahn",
            "type": "select",
            "options": [
              "Mitarbeiter",
              "Vorgesetzter",
              "HR-Abteilung"
            ],
            "expected": "Vorgesetzter"
          },
          {
            "key": "verzweigung",
            "type": "select",
            "options": [
              "Ja",
              "Nein"
            ],
            "expected": "Nein"
          }
        ]
      },
      {
        "id": "s3",
        "label": "3. Entscheidung genehmigt/abgelehnt?",
        "fields": [
          {
            "key": "schwimmbahn",
            "type": "select",
            "options": [
              "Mitarbeiter",
              "Vorgesetzter",
              "HR-Abteilung"
            ],
            "expected": "Vorgesetzter"
          },
          {
            "key": "verzweigung",
            "type": "select",
            "options": [
              "Ja",
              "Nein"
            ],
            "expected": "Ja"
          }
        ]
      },
      {
        "id": "s4",
        "label": "4. Urlaub im System buchen",
        "fields": [
          {
            "key": "schwimmbahn",
            "type": "select",
            "options": [
              "Mitarbeiter",
              "Vorgesetzter",
              "HR-Abteilung"
            ],
            "expected": "HR-Abteilung"
          },
          {
            "key": "verzweigung",
            "type": "select",
            "options": [
              "Ja",
              "Nein"
            ],
            "expected": "Nein"
          }
        ]
      },
      {
        "id": "s5",
        "label": "5. Bestätigung erhalten",
        "fields": [
          {
            "key": "schwimmbahn",
            "type": "select",
            "options": [
              "Mitarbeiter",
              "Vorgesetzter",
              "HR-Abteilung"
            ],
            "expected": "Mitarbeiter"
          },
          {
            "key": "verzweigung",
            "type": "select",
            "options": [
              "Ja",
              "Nein"
            ],
            "expected": "Nein"
          }
        ]
      },
      {
        "id": "s6",
        "label": "6. Ablehnung erhalten",
        "fields": [
          {
            "key": "schwimmbahn",
            "type": "select",
            "options": [
              "Mitarbeiter",
              "Vorgesetzter",
              "HR-Abteilung"
            ],
            "expected": "Mitarbeiter"
          },
          {
            "key": "verzweigung",
            "type": "select",
            "options": [
              "Ja",
              "Nein"
            ],
            "expected": "Nein"
          }
        ]
      }
    ],
    "explanation": "Der Prozess beginnt beim Mitarbeiter, wird vom Vorgesetzten geprüft und endet in einer Entscheidungsraute (Verzweigung) mit zwei Pfaden: bei Genehmigung bucht die HR-Abteilung den Urlaub und der Mitarbeiter erhält eine Bestätigung, bei Ablehnung endet der Prozess direkt beim Mitarbeiter. Nur Schritt 3 ist eine echte Verzweigung."
  }
},
{
  "id": "5c",
  "title": "Ablaufvarianten vergleichen",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 5,
  "checkpointNrs": [
    "5.4"
  ],
  "baseReward": 110,
  "intro": "Ein neuer Online-Shop ohne Bestandskunden plant seinen Bestellprozess. Variante A: Zahlung vor Versand. Variante B: Zahlung nach Lieferung. Vergleiche beide hinsichtlich Praxistauglichkeit und entscheide dich begründet.",
  "modelAnswer": "<strong>Variante A (Vorkasse):</strong> minimiert Zahlungsausfallrisiko bei unbekannten Kunden, kann aber Konversionsrate senken.<br><strong>Variante B (Rechnungskauf):</strong> erhöht Vertrauen/Kaufbereitschaft, aber hohes Ausfall-/Betrugsrisiko bei Neukunden ohne Bonitätsprüfung.<br><strong>Entscheidung:</strong> Für einen neuen Shop mit unbekannten Kunden ist Variante A praxistauglicher, da das wirtschaftliche Risiko schwerer wiegt. Alternativ: Kombination mit Bonitätsprüfung durch Payment-Provider.",
  "checklist": [
    "Risiko von Zahlungsausfällen für beide Varianten bewertet",
    "Auswirkung auf Konversionsrate/Vertrauen thematisiert",
    "Klare begründete Entscheidung getroffen",
    "Praxisbezug zum Szenario hergestellt"
  ]
},
{
  "id": "6a",
  "title": "Zustandsdiagramm Bestellung",
  "icon": "🧩",
  "engine": "field",
  "topicId": 6,
  "checkpointNrs": [
    "6.1"
  ],
  "baseReward": 140,
  "intro": "Zustandsdiagramm für eine Bestellung mit Zuständen Neu/Bezahlt/Versendet/Storniert/Abgeschlossen. Trage für jeden Übergang Von-Zustand, Nach-Zustand und Ereignis ein.",
  "build": {
    "columns": [
      "von",
      "nach",
      "ereignis"
    ],
    "tableData": [
      [
        "Übergang"
      ],
      [
        "1"
      ],
      [
        "2"
      ],
      [
        "3"
      ],
      [
        "4"
      ],
      [
        "5"
      ]
    ],
    "rows": [
      {
        "id": "t1",
        "label": "Übergang 1",
        "fields": [
          {
            "key": "von",
            "type": "select",
            "options": ["Neu", "Bezahlt", "Versendet", "Storniert", "Abgeschlossen"],
            "expected": "Neu"
          },
          {
            "key": "nach",
            "type": "select",
            "options": ["Neu", "Bezahlt", "Versendet", "Storniert", "Abgeschlossen"],
            "expected": "Bezahlt"
          },
          {
            "key": "ereignis",
            "type": "select",
            "options": ["Zahlung eingegangen", "Kunde storniert", "Paket verschickt", "Zahlung zurückgebucht", "Lieferung bestätigt"],
            "expected": "Zahlung eingegangen"
          }
        ]
      },
      {
        "id": "t2",
        "label": "Übergang 2",
        "fields": [
          {
            "key": "von",
            "type": "select",
            "options": ["Neu", "Bezahlt", "Versendet", "Storniert", "Abgeschlossen"],
            "expected": "Neu"
          },
          {
            "key": "nach",
            "type": "select",
            "options": ["Neu", "Bezahlt", "Versendet", "Storniert", "Abgeschlossen"],
            "expected": "Storniert"
          },
          {
            "key": "ereignis",
            "type": "select",
            "options": ["Zahlung eingegangen", "Kunde storniert", "Paket verschickt", "Zahlung zurückgebucht", "Lieferung bestätigt"],
            "expected": "Kunde storniert"
          }
        ]
      },
      {
        "id": "t3",
        "label": "Übergang 3",
        "fields": [
          {
            "key": "von",
            "type": "select",
            "options": ["Neu", "Bezahlt", "Versendet", "Storniert", "Abgeschlossen"],
            "expected": "Bezahlt"
          },
          {
            "key": "nach",
            "type": "select",
            "options": ["Neu", "Bezahlt", "Versendet", "Storniert", "Abgeschlossen"],
            "expected": "Versendet"
          },
          {
            "key": "ereignis",
            "type": "select",
            "options": ["Zahlung eingegangen", "Kunde storniert", "Paket verschickt", "Zahlung zurückgebucht", "Lieferung bestätigt"],
            "expected": "Paket verschickt"
          }
        ]
      },
      {
        "id": "t4",
        "label": "Übergang 4",
        "fields": [
          {
            "key": "von",
            "type": "select",
            "options": ["Neu", "Bezahlt", "Versendet", "Storniert", "Abgeschlossen"],
            "expected": "Bezahlt"
          },
          {
            "key": "nach",
            "type": "select",
            "options": ["Neu", "Bezahlt", "Versendet", "Storniert", "Abgeschlossen"],
            "expected": "Storniert"
          },
          {
            "key": "ereignis",
            "type": "select",
            "options": ["Zahlung eingegangen", "Kunde storniert", "Paket verschickt", "Zahlung zurückgebucht", "Lieferung bestätigt"],
            "expected": "Zahlung zurückgebucht"
          }
        ]
      },
      {
        "id": "t5",
        "label": "Übergang 5",
        "fields": [
          {
            "key": "von",
            "type": "select",
            "options": ["Neu", "Bezahlt", "Versendet", "Storniert", "Abgeschlossen"],
            "expected": "Versendet"
          },
          {
            "key": "nach",
            "type": "select",
            "options": ["Neu", "Bezahlt", "Versendet", "Storniert", "Abgeschlossen"],
            "expected": "Abgeschlossen"
          },
          {
            "key": "ereignis",
            "type": "select",
            "options": ["Zahlung eingegangen", "Kunde storniert", "Paket verschickt", "Zahlung zurückgebucht", "Lieferung bestätigt"],
            "expected": "Lieferung bestätigt"
          }
        ]
      }
    ],
    "explanation": "'Neu' ist Startzustand mit zwei Übergängen (Zahlung oder Stornierung). 'Bezahlt' führt regulär zu 'Versendet' oder bei Rückbuchung zu 'Storniert'. 'Versendet' führt bei bestätigter Lieferung in den Endzustand 'Abgeschlossen'. Jeder Übergang wird durch genau ein Ereignis ausgelöst."
  }
},
{
  "id": "6b",
  "title": "Sequenzdiagramm Login",
  "icon": "🧩",
  "engine": "field",
  "topicId": 6,
  "checkpointNrs": [
    "6.2"
  ],
  "baseReward": 140,
  "intro": "Login-Ablauf zwischen Client, Server, Datenbank. Trage für jede Nachricht Sender, Empfänger und Inhalt ein.",
  "build": {
    "columns": [
      "sender",
      "empfaenger",
      "nachricht"
    ],
    "tableData": [
      [
        "Nachricht"
      ],
      [
        "1"
      ],
      [
        "2"
      ],
      [
        "3"
      ],
      [
        "4"
      ]
    ],
    "rows": [
      {
        "id": "m1",
        "label": "Nachricht 1",
        "fields": [
          {
            "key": "sender",
            "type": "select",
            "options": [
              "Client",
              "Server",
              "Datenbank"
            ],
            "expected": "Client"
          },
          {
            "key": "empfaenger",
            "type": "select",
            "options": [
              "Client",
              "Server",
              "Datenbank"
            ],
            "expected": "Server"
          },
          {
            "key": "nachricht",
            "type": "select",
            "options": [
              "Login-Daten senden",
              "Benutzerdaten abfragen",
              "Benutzerdatensatz zurückliefern",
              "Passwort prüfen und Bestätigung senden"
            ],
            "expected": "Login-Daten senden"
          }
        ]
      },
      {
        "id": "m2",
        "label": "Nachricht 2",
        "fields": [
          {
            "key": "sender",
            "type": "select",
            "options": [
              "Client",
              "Server",
              "Datenbank"
            ],
            "expected": "Server"
          },
          {
            "key": "empfaenger",
            "type": "select",
            "options": [
              "Client",
              "Server",
              "Datenbank"
            ],
            "expected": "Datenbank"
          },
          {
            "key": "nachricht",
            "type": "select",
            "options": [
              "Login-Daten senden",
              "Benutzerdaten abfragen",
              "Benutzerdatensatz zurückliefern",
              "Passwort prüfen und Bestätigung senden"
            ],
            "expected": "Benutzerdaten abfragen"
          }
        ]
      },
      {
        "id": "m3",
        "label": "Nachricht 3",
        "fields": [
          {
            "key": "sender",
            "type": "select",
            "options": [
              "Client",
              "Server",
              "Datenbank"
            ],
            "expected": "Datenbank"
          },
          {
            "key": "empfaenger",
            "type": "select",
            "options": [
              "Client",
              "Server",
              "Datenbank"
            ],
            "expected": "Server"
          },
          {
            "key": "nachricht",
            "type": "select",
            "options": [
              "Login-Daten senden",
              "Benutzerdaten abfragen",
              "Benutzerdatensatz zurückliefern",
              "Passwort prüfen und Bestätigung senden"
            ],
            "expected": "Benutzerdatensatz zurückliefern"
          }
        ]
      },
      {
        "id": "m4",
        "label": "Nachricht 4",
        "fields": [
          {
            "key": "sender",
            "type": "select",
            "options": [
              "Client",
              "Server",
              "Datenbank"
            ],
            "expected": "Server"
          },
          {
            "key": "empfaenger",
            "type": "select",
            "options": [
              "Client",
              "Server",
              "Datenbank"
            ],
            "expected": "Client"
          },
          {
            "key": "nachricht",
            "type": "select",
            "options": [
              "Login-Daten senden",
              "Benutzerdaten abfragen",
              "Benutzerdatensatz zurückliefern",
              "Passwort prüfen und Bestätigung senden"
            ],
            "expected": "Passwort prüfen und Bestätigung senden"
          }
        ]
      }
    ],
    "explanation": "Client sendet Login-Daten an Server (1), Server fragt Benutzerdaten bei der Datenbank ab (2), Datenbank liefert den Datensatz zurück (3, gestrichelte Rückantwort), Server prüft das Passwort und sendet die Bestätigung an den Client zurück (4)."
  }
},
{
  "id": "6c",
  "title": "Zustands- vs. Sequenzdiagramm",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 6,
  "checkpointNrs": [
    "6.1",
    "6.2"
  ],
  "baseReward": 100,
  "intro": "Erläutere, wann ein Zustandsdiagramm und wann ein Sequenzdiagramm eingesetzt wird, mit Beispielen.",
  "modelAnswer": "<strong>Zustandsdiagramm:</strong> Fokus auf ein einzelnes Objekt und seine Zustände/Übergänge über die Zeit. Beispiel: Bestellung durchläuft Neu→Bezahlt→Versendet→Abgeschlossen.<br><strong>Sequenzdiagramm:</strong> Fokus auf zeitlichen Nachrichtenaustausch zwischen mehreren Objekten. Beispiel: Login-Ablauf zwischen Client/Server/Datenbank.<br><strong>Unterschied:</strong> Zustandsdiagramm betrachtet ein Objekt isoliert über die Lebensdauer; Sequenzdiagramm betrachtet einen konkreten Ablauf mehrerer Objekte. Beide ergänzen sich.",
  "checklist": [
    "Fokus des Zustandsdiagramms korrekt erläutert",
    "Fokus des Sequenzdiagramms korrekt erläutert",
    "Je ein passendes Beispiel genannt",
    "Unterschied klar herausgearbeitet"
  ]
},
{
  "id": "7a",
  "title": "Klassendiagramm Fahrzeug",
  "icon": "🧩",
  "engine": "field",
  "topicId": 7,
  "checkpointNrs": [
    "7.1"
  ],
  "baseReward": 130,
  "intro": "Klasse 'Fahrzeug' mit Attributen kennzeichen/baujahr/hersteller (alle privat) und Methoden beschleunigen()/getKennzeichen() (public). Trage Sichtbarkeit und Datentyp/Rückgabetyp ein.",
  "build": {
    "columns": [
      "sichtbarkeit",
      "typ"
    ],
    "tableData": [
      [
        "Mitglied"
      ],
      [
        "kennzeichen"
      ],
      [
        "baujahr"
      ],
      [
        "hersteller"
      ],
      [
        "beschleunigen()"
      ],
      [
        "getKennzeichen()"
      ]
    ],
    "rows": [
      {
        "id": "m1",
        "label": "kennzeichen",
        "fields": [
          {
            "key": "sichtbarkeit",
            "type": "select",
            "options": [
              "+",
              "-",
              "#"
            ],
            "expected": "-"
          },
          {
            "key": "typ",
            "type": "select",
            "options": ["String", "int", "void", "boolean"],
            "expected": "String"
          }
        ]
      },
      {
        "id": "m2",
        "label": "baujahr",
        "fields": [
          {
            "key": "sichtbarkeit",
            "type": "select",
            "options": [
              "+",
              "-",
              "#"
            ],
            "expected": "-"
          },
          {
            "key": "typ",
            "type": "select",
            "options": ["String", "int", "void", "boolean"],
            "expected": "int"
          }
        ]
      },
      {
        "id": "m3",
        "label": "hersteller",
        "fields": [
          {
            "key": "sichtbarkeit",
            "type": "select",
            "options": [
              "+",
              "-",
              "#"
            ],
            "expected": "-"
          },
          {
            "key": "typ",
            "type": "select",
            "options": ["String", "int", "void", "boolean"],
            "expected": "String"
          }
        ]
      },
      {
        "id": "m4",
        "label": "beschleunigen()",
        "fields": [
          {
            "key": "sichtbarkeit",
            "type": "select",
            "options": [
              "+",
              "-",
              "#"
            ],
            "expected": "+"
          },
          {
            "key": "typ",
            "type": "select",
            "options": ["String", "int", "void", "boolean"],
            "expected": "void"
          }
        ]
      },
      {
        "id": "m5",
        "label": "getKennzeichen()",
        "fields": [
          {
            "key": "sichtbarkeit",
            "type": "select",
            "options": [
              "+",
              "-",
              "#"
            ],
            "expected": "+"
          },
          {
            "key": "typ",
            "type": "select",
            "options": ["String", "int", "void", "boolean"],
            "expected": "String"
          }
        ]
      }
    ],
    "explanation": "Attribute sind privat (-) gekapselt, Zugriff nur über öffentliche Methoden. beschleunigen() verändert nur den Zustand (void). getKennzeichen() ist ein Getter: public, Rückgabetyp = Typ des Attributs (String)."
  }
},
{
  "id": "7b",
  "title": "Vererbung & Aggregation",
  "icon": "🧩",
  "engine": "field",
  "topicId": 7,
  "checkpointNrs": [
    "7.2"
  ],
  "baseReward": 130,
  "intro": "'Fahrzeug' ist Oberklasse von 'PKW'/'LKW'. 'Bestellung' besteht aus 'Bestellposition' (ohne Bestellung sinnlos). 'Auto' hat ein 'Radio' (unabhängig existenzfähig). Bestimme Beziehungstyp und Multiplizität.",
  "build": {
    "columns": [
      "typ",
      "multiplizitaet"
    ],
    "tableData": [
      [
        "Beziehung"
      ],
      [
        "Fahrzeug–PKW/LKW"
      ],
      [
        "Bestellung–Bestellposition"
      ],
      [
        "Auto–Radio"
      ]
    ],
    "rows": [
      {
        "id": "b1",
        "label": "Fahrzeug–PKW/LKW",
        "fields": [
          {
            "key": "typ",
            "type": "select",
            "options": [
              "Vererbung",
              "Aggregation",
              "Komposition"
            ],
            "expected": "Vererbung"
          },
          {
            "key": "multiplizitaet",
            "type": "select",
            "options": ["-", "0..1", "1", "1..*", "*", "0..*"],
            "expected": "-"
          }
        ]
      },
      {
        "id": "b2",
        "label": "Bestellung–Bestellposition",
        "fields": [
          {
            "key": "typ",
            "type": "select",
            "options": [
              "Vererbung",
              "Aggregation",
              "Komposition"
            ],
            "expected": "Komposition"
          },
          {
            "key": "multiplizitaet",
            "type": "select",
            "options": ["-", "0..1", "1", "1..*", "*", "0..*"],
            "expected": "1..*"
          }
        ]
      },
      {
        "id": "b3",
        "label": "Auto–Radio",
        "fields": [
          {
            "key": "typ",
            "type": "select",
            "options": [
              "Vererbung",
              "Aggregation",
              "Komposition"
            ],
            "expected": "Aggregation"
          },
          {
            "key": "multiplizitaet",
            "type": "select",
            "options": ["-", "0..1", "1", "1..*", "*", "0..*"],
            "expected": "0..1"
          }
        ]
      }
    ],
    "explanation": "Fahrzeug–PKW/LKW ist Vererbung (ist-ein, keine Multiplizität). Bestellung–Bestellposition ist Komposition, da die Position ohne Bestellung keinen Sinn ergibt (1 zu 1..*). Auto–Radio ist Aggregation, da das Radio unabhängig existieren kann (1 zu 0..1)."
  }
},
{
  "id": "7c",
  "title": "Aggregation vs. Komposition",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 7,
  "checkpointNrs": [
    "7.3"
  ],
  "baseReward": 110,
  "intro": "Erläutere den Unterschied zwischen Aggregation und Komposition anhand der Beispiele 'Universität–Fachbereich' und 'Fachbereich–Professor'. Gehe auf die Multiplizitäten 1..* und * ein.",
  "modelAnswer": "<strong>Komposition:</strong> starke Lebenszyklus-Abhängigkeit – Teil kann ohne Ganzes nicht existieren (ausgefüllter Diamant). Beispiel: Universität–Fachbereich.<br><strong>Aggregation:</strong> schwache Beziehung – Teil existiert unabhängig weiter (offener Diamant). Beispiel: Fachbereich–Professor.<br><strong>1..*</strong> bedeutet mindestens eins, beliebig viele. <strong>*</strong> (=0..*) bedeutet null bis beliebig viele.",
  "checklist": [
    "Komposition korrekt als starke Abhängigkeit erklärt",
    "Aggregation korrekt als schwache Beziehung erklärt",
    "Beide Beispiele korrekt zugeordnet",
    "Bedeutung von 1..* und * korrekt erläutert"
  ]
},
{
  "id": "8a",
  "title": "Polymorphie: Form-Hierarchie",
  "icon": "⌨️",
  "engine": "token",
  "topicId": 8,
  "checkpointNrs": [
    "8.1",
    "8.2"
  ],
  "baseReward": 150,
  "intro": "Basisklasse 'Form' mit berechneFlaeche(), abgeleitete Klassen 'Kreis' und 'Rechteck' überschreiben die Methode. Funktion gesamtFlaeche(formenListe) iteriert polymorph und summiert die Flächen. Vervollständige den Pseudocode.",
  "placeholder": "KLASSE Kreis ___ Form ... FUNKTION gesamtFlaeche(formenListe) ...",
  "tokens": [
    {
      "label": "Vererbungsschlüsselwort (ERBT VON)",
      "pattern": "erbt\\s+von"
    },
    {
      "label": "Überschriebene Methode berechneFlaeche",
      "pattern": "berechneflaeche"
    },
    {
      "label": "Schleife über Liste (FOR/FÜR)",
      "pattern": "f[üu]r"
    },
    {
      "label": "Polymorpher Aufruf form.berechneFlaeche()",
      "pattern": "form\\.berechneflaeche\\(\\)"
    },
    {
      "label": "Summenbildung summe = summe +",
      "pattern": "summe\\s*=\\s*summe\\s*\\+"
    }
  ],
  "modelAnswer": "KLASSE Form\n    METHODE berechneFlaeche()\n    ENDMETHODE\nENDKLASSE\n\nKLASSE Kreis ERBT VON Form\n    ATTRIBUT radius\n    METHODE berechneFlaeche()\n        RÜCKGABE 3.14159 * radius * radius\n    ENDMETHODE\nENDKLASSE\n\nKLASSE Rechteck ERBT VON Form\n    ATTRIBUT breite\n    ATTRIBUT hoehe\n    METHODE berechneFlaeche()\n        RÜCKGABE breite * hoehe\n    ENDMETHODE\nENDKLASSE\n\nFUNKTION gesamtFlaeche(formenListe)\n    summe = 0\n    FÜR jedes form IN formenListe\n        summe = summe + form.berechneFlaeche()\n    ENDFÜR\n    RÜCKGABE summe\nENDFUNKTION"
},
{
  "id": "8b",
  "title": "Abstrakte Klasse vs. Interface",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 8,
  "checkpointNrs": [
    "8.3"
  ],
  "baseReward": 110,
  "intro": "Vergleiche abstrakte Klassen, Interfaces und gewöhnliche Klassen bzgl. Instanziierbarkeit, Methodenimplementierung und Mehrfachvererbung/-realisierung.",
  "modelAnswer": "<strong>Gewöhnliche Klasse:</strong> instanziierbar, alle Methoden implementiert, nur Einfachvererbung.<br><strong>Abstrakte Klasse:</strong> nicht instanziierbar, Mix aus konkreten und abstrakten Methoden, Einfachvererbung.<br><strong>Interface:</strong> nicht instanziierbar, nur Methodensignaturen (Vertrag), aber Mehrfachrealisierung möglich – Vorteil gegenüber Mehrfachvererbung ohne Diamond-Problem.",
  "checklist": [
    "Instanziierbarkeit für alle drei korrekt benannt",
    "Methodenimplementierung korrekt unterschieden",
    "Mehrfachvererbung bei Klassen vs. Mehrfachrealisierung bei Interfaces erkannt",
    "Vorteil der Mehrfachrealisierung begründet"
  ]
},
{
  "id": "8c",
  "title": "Interface-Realisierung & Generics",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 8,
  "checkpointNrs": [
    "8.4",
    "8.5"
  ],
  "baseReward": 110,
  "intro": "Erläutere, wie Interface-Realisierung im UML-Klassendiagramm dargestellt wird, und erkläre den Begriff generische Klasse (z. B. Liste<T>) inkl. Typsicherheit und Wiederverwendbarkeit.",
  "modelAnswer": "<strong>Interface-Realisierung:</strong> gestrichelter Pfeil mit offener Dreiecksspitze, von der Klasse zum Interface (Unterschied zu durchgezogenem Vererbungspfeil).<br><strong>Generische Klasse:</strong> Klasse mit Typparameter (z. B. T), nutzbar für unterschiedliche Typen wie Liste&lt;Integer&gt; oder Liste&lt;String&gt;.<br><strong>Typsicherheit:</strong> Compiler prüft bereits zur Übersetzungszeit korrekte Typen, keine fehleranfälligen Casts.<br><strong>Wiederverwendbarkeit:</strong> derselbe Code für beliebige Typen nutzbar, kein redundanter typspezifischer Code.",
  "checklist": [
    "Interface-Realisierung korrekt als gestrichelter Pfeil mit offener Spitze beschrieben",
    "Pfeilrichtung korrekt (Klasse zu Interface)",
    "Generische Klasse mit Typparameter korrekt erläutert",
    "Vorteile Typsicherheit und Wiederverwendbarkeit erklärt"
  ]
},
{
  "id": "9a",
  "title": "Entwurfsmuster-Übersicht",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 9,
  "checkpointNrs": [
    "9.1",
    "9.2"
  ],
  "baseReward": 120,
  "intro": "Erläutere Vorteile von Entwurfsmustern, nenne je zwei Beispiele für Erzeugungs- und Verhaltensmuster. Ordne dem Szenario 'mehrere Anzeige-Widgets bei Datenänderung benachrichtigen' das passende Muster zu und begründe.",
  "modelAnswer": "<strong>Vorteile:</strong> erprobte Lösungsansätze, einheitliche Fachsprache, höhere Wartbarkeit, weniger Entwurfsfehler.<br><strong>Erzeugungsmuster:</strong> Factory Method (Objekterzeugung an Unterklassen delegiert), Singleton (genau eine Instanz).<br><strong>Verhaltensmuster:</strong> Observer (1:n-Benachrichtigung), Strategy (austauschbare Algorithmen).<br><strong>Zuordnung:</strong> Observer-Muster passt, da die Datenquelle die Anzahl/Art der Widgets nicht kennen muss – lose Kopplung durch Registrierung und automatische Benachrichtigung.",
  "checklist": [
    "Mind. 2 Vorteile von Entwurfsmustern genannt",
    "Je zwei Beispiele für Erzeugungs- und Verhaltensmuster",
    "Observer als passendes Muster erkannt",
    "Begründung mit loser Kopplung/Benachrichtigung"
  ]
},
{
  "id": "9b",
  "title": "Observer-Muster: Wetterstation",
  "icon": "⌨️",
  "engine": "token",
  "topicId": 9,
  "checkpointNrs": [
    "9.3"
  ],
  "baseReward": 140,
  "intro": "Wetterstation (Subject) mit mehreren Display-Observern. Implementiere registerObserver, removeObserver, notifyObservers im Pseudocode.",
  "placeholder": "KLASSE Wetterstation ... METHODE notifyObservers() ...",
  "tokens": [
    {
      "label": "Observer-Liste initialisieren",
      "pattern": "(leere\\s*)?(liste|list)"
    },
    {
      "label": "registerObserver fügt hinzu",
      "pattern": "observerliste\\.(add|hinzufuegen)\\(o\\)"
    },
    {
      "label": "removeObserver entfernt",
      "pattern": "observerliste\\.(remove|entfernen)\\(o\\)"
    },
    {
      "label": "notifyObservers ruft update auf",
      "pattern": "o\\.update\\("
    },
    {
      "label": "Nach Aktualisierung notifyObservers aufrufen",
      "pattern": "notifyobservers\\(\\)"
    }
  ],
  "modelAnswer": "KLASSE Wetterstation\n    observerListe = leere Liste\n    METHODE registerObserver(o)\n        observerListe.add(o)\n    ENDMETHODE\n    METHODE removeObserver(o)\n        observerListe.remove(o)\n    ENDMETHODE\n    METHODE notifyObservers()\n        FÜR JEDES o IN observerListe\n            o.update(temperatur, feuchtigkeit, druck)\n        ENDFÜR\n    ENDMETHODE\n    METHODE messungAktualisiert(temp, feuchte, druck)\n        temperatur = temp\n        feuchtigkeit = feuchte\n        druck = druck\n        notifyObservers()\n    ENDMETHODE\nENDKLASSE"
},
{
  "id": "9c",
  "title": "Factory Method: Fahrzeuge",
  "icon": "⌨️",
  "engine": "token",
  "topicId": 9,
  "checkpointNrs": [
    "9.4"
  ],
  "baseReward": 130,
  "intro": "Fabrikmethode erzeugeFahrzeug(typ) soll je nach Parameter 'PKW' oder 'LKW' das passende Objekt zurückgeben. Vervollständige den Pseudocode.",
  "placeholder": "METHODE erzeugeFahrzeug(typ) ...",
  "tokens": [
    {
      "label": "Bedingung typ == PKW",
      "pattern": "typ\\s*==?\\s*[\\\"']pkw[\\\"']"
    },
    {
      "label": "Neues PKW-Objekt erzeugen",
      "pattern": "(neu|new)\\s*pkw\\(\\)"
    },
    {
      "label": "Bedingung typ == LKW",
      "pattern": "typ\\s*==?\\s*[\\\"']lkw[\\\"']"
    },
    {
      "label": "Neues LKW-Objekt erzeugen",
      "pattern": "(neu|new)\\s*lkw\\(\\)"
    },
    {
      "label": "Fehlerbehandlung für unbekannten Typ",
      "pattern": "(fehler|throw).*unbekannt"
    }
  ],
  "modelAnswer": "METHODE erzeugeFahrzeug(typ)\n    WENN typ == \"PKW\" DANN\n        RÜCKGABE neu PKW()\n    SONST WENN typ == \"LKW\" DANN\n        RÜCKGABE neu LKW()\n    SONST\n        FEHLER \"Unbekannter Fahrzeugtyp: \" + typ\n    ENDWENN\nENDMETHODE"
},
{
  "id": "10b",
  "title": "2D-Array auswerten",
  "icon": "🧮",
  "engine": "token",
  "topicId": 10,
  "checkpointNrs": [
    "10.1"
  ],
  "baseReward": 130,
  "intro": "Zweidimensionales Array Verkaufszahlen[Monat][Filiale]. Finde Minimum, Maximum und zähle Werte über einem Schwellwert.",
  "placeholder": "ALGORITHMUS analysiereVerkaufszahlen(Verkaufszahlen, Schwellwert) ...",
  "tokens": [
    {
      "label": "Verschachtelte Schleife über Monate und Filialen",
      "pattern": "f[üu]r.*monat"
    },
    {
      "label": "Vergleich kleiner als Minimum",
      "pattern": "wert\\s*<\\s*minimum"
    },
    {
      "label": "Vergleich größer als Maximum",
      "pattern": "wert\\s*>\\s*maximum"
    },
    {
      "label": "Vergleich größer als Schwellwert",
      "pattern": "wert\\s*>\\s*schwellwert"
    },
    {
      "label": "Zähler erhöhen",
      "pattern": "anzahlueberschwelle\\s*=\\s*anzahlueberschwelle\\s*\\+\\s*1"
    }
  ],
  "modelAnswer": "ALGORITHMUS analysiereVerkaufszahlen(Verkaufszahlen, Schwellwert)\n    minimum = Verkaufszahlen[0][0]\n    maximum = Verkaufszahlen[0][0]\n    anzahlUeberSchwelle = 0\n    FÜR monat VON 0 BIS anzahlMonate - 1\n        FÜR filiale VON 0 BIS anzahlFilialen - 1\n            wert = Verkaufszahlen[monat][filiale]\n            WENN wert < minimum DANN minimum = wert ENDWENN\n            WENN wert > maximum DANN maximum = wert ENDWENN\n            WENN wert > Schwellwert DANN anzahlUeberSchwelle = anzahlUeberSchwelle + 1 ENDWENN\n        ENDFÜR\n    ENDFÜR\n    RÜCKGABE minimum, maximum, anzahlUeberSchwelle\nENDALGORITHMUS"
},
{
  "id": "10c",
  "title": "Generischer Bubble Sort",
  "icon": "🧮",
  "engine": "token",
  "topicId": 10,
  "checkpointNrs": [
    "10.6"
  ],
  "baseReward": 130,
  "intro": "Bubble-Sort für Personen nach Alter, umgestellt auf generische Vergleichsfunktion (Comparator) als Parameter.",
  "placeholder": "ALGORITHMUS bubbleSort(liste, ___) ...",
  "tokens": [
    {
      "label": "Comparator-Parameter in Funktionssignatur",
      "pattern": "bubblesort\\(liste,\\s*comparator\\)"
    },
    {
      "label": "Aufruf des Comparators im Vergleich",
      "pattern": "comparator\\(liste\\[j\\],\\s*liste\\[j\\s*\\+\\s*1\\]\\)"
    },
    {
      "label": "Vergleichsfunktion gibt Differenz zurück",
      "pattern": "persona\\.alter\\s*-\\s*personb\\.alter"
    },
    {
      "label": "Aufruf mit konkreter Vergleichsfunktion",
      "pattern": "vergleichenachalter"
    }
  ],
  "modelAnswer": "ALGORITHMUS bubbleSort(liste, comparator)\n    n = liste.laenge\n    FÜR i VON 0 BIS n - 2\n        FÜR j VON 0 BIS n - 2 - i\n            WENN comparator(liste[j], liste[j + 1]) > 0 DANN\n                temp = liste[j]\n                liste[j] = liste[j + 1]\n                liste[j + 1] = temp\n            ENDWENN\n        ENDFÜR\n    ENDFÜR\n    RÜCKGABE liste\nENDALGORITHMUS\n\nFUNKTION vergleicheNachAlter(personA, personB)\n    RÜCKGABE personA.alter - personB.alter\nENDFUNKTION\n\nsortierteListe = bubbleSort(personenListe, vergleicheNachAlter)"
},
{
  "id": "11a",
  "title": "Schreibtischtest istVolljaehrig",
  "icon": "📊",
  "engine": "field",
  "topicId": 11,
  "checkpointNrs": [
    "11.2",
    "11.4"
  ],
  "baseReward": 130,
  "intro": "Schreibtischtest für FUNKTION istVolljaehrig(alter): WENN alter > 18 RÜCKGABE true SONST false (Fehler: sollte >= 18 sein). Trage für jeden Testfall erwartetes und tatsächliches Ergebnis ein.",
  "build": {
    "columns": [
      "erwartet",
      "tatsaechlich"
    ],
    "tableData": [
      [
        "alter"
      ],
      [
        "17"
      ],
      [
        "18"
      ],
      [
        "19"
      ],
      [
        "0"
      ]
    ],
    "rows": [
      {
        "id": "t1",
        "label": "alter = 17",
        "fields": [
          {
            "key": "erwartet",
            "type": "select",
            "options": [
              "true",
              "false"
            ],
            "expected": "false"
          },
          {
            "key": "tatsaechlich",
            "type": "select",
            "options": [
              "true",
              "false"
            ],
            "expected": "false"
          }
        ]
      },
      {
        "id": "t2",
        "label": "alter = 18",
        "fields": [
          {
            "key": "erwartet",
            "type": "select",
            "options": [
              "true",
              "false"
            ],
            "expected": "true"
          },
          {
            "key": "tatsaechlich",
            "type": "select",
            "options": [
              "true",
              "false"
            ],
            "expected": "false"
          }
        ]
      },
      {
        "id": "t3",
        "label": "alter = 19",
        "fields": [
          {
            "key": "erwartet",
            "type": "select",
            "options": [
              "true",
              "false"
            ],
            "expected": "true"
          },
          {
            "key": "tatsaechlich",
            "type": "select",
            "options": [
              "true",
              "false"
            ],
            "expected": "true"
          }
        ]
      },
      {
        "id": "t4",
        "label": "alter = 0",
        "fields": [
          {
            "key": "erwartet",
            "type": "select",
            "options": [
              "true",
              "false"
            ],
            "expected": "false"
          },
          {
            "key": "tatsaechlich",
            "type": "select",
            "options": [
              "true",
              "false"
            ],
            "expected": "false"
          }
        ]
      }
    ],
    "explanation": "Der Code prüft 'alter > 18' statt 'alter >= 18'. Bei alter=18 (bereits volljährig) liefert die Funktion fälschlich false – ein klassischer Off-by-one-Fehler an der Bereichsgrenze, der durch Grenzwertanalyse aufgedeckt wird."
  }
},
{
  "id": "11b",
  "title": "Unit-Tests & Testarten",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 11,
  "checkpointNrs": [
    "11.1",
    "11.7",
    "11.8"
  ],
  "baseReward": 130,
  "intro": "Erläutere was ein Unit-Test ist und seine Eigenschaften. Grenze Black-Box von White-Box-Tests ab, nenne Vorteile von White-Box. Erläutere Zweck von Regressionstests und Inhalte eines Testkonzepts.",
  "modelAnswer": "<strong>Unit-Test:</strong> prüft kleinste testbare Einheit isoliert; Eigenschaften: isoliert, automatisiert, wiederholbar, schnell.<br><strong>Black-Box:</strong> Testfälle nur aus Spezifikation, ohne Codekenntnis.<br><strong>White-Box:</strong> Testfälle mit Kenntnis der internen Struktur – Vorteile: gezielte Zweig-/Pfadabdeckung, Aufdeckung toten Codes, präzisere Fehlerlokalisierung.<br><strong>Regressionstests:</strong> stellen sicher, dass Änderungen keine bestehende Funktionalität beschädigen.<br><strong>Testkonzept-Inhalte:</strong> Testziele/-umfang, Teststrategie, Testumgebung/-daten, Verantwortlichkeiten, Zeitplan, Erfolgskriterien.",
  "checklist": [
    "Unit-Test mit mind. 3 Eigenschaften korrekt definiert",
    "Black-Box und White-Box klar abgegrenzt",
    "Mind. 2 Vorteile von White-Box genannt",
    "Zweck von Regressionstests korrekt erläutert",
    "Mind. 4 Inhalte eines Testkonzepts genannt"
  ]
},
{
  "id": "11c",
  "title": "Äquivalenzklassen Alter",
  "icon": "📊",
  "engine": "field",
  "topicId": 11,
  "checkpointNrs": [
    "11.3",
    "11.6"
  ],
  "baseReward": 120,
  "intro": "Bilde Äquivalenzklassen für Eingabe 'Alter' (gültig: 0-120). Ordne Beispielwerten die Klasse zu und beschreibe den Umgang mit einer Eingabe aus nur Leerzeichen.",
  "build": {
    "columns": [
      "klasse",
      "leerzeichen"
    ],
    "tableData": [
      [
        "Wert"
      ],
      [
        "-5"
      ],
      [
        "0"
      ],
      [
        "45"
      ],
      [
        "150"
      ]
    ],
    "rows": [
      {
        "id": "e1",
        "label": "-5",
        "fields": [
          {
            "key": "klasse",
            "type": "select",
            "options": [
              "gültig",
              "ungültig"
            ],
            "expected": "ungültig"
          },
          {
            "key": "leerzeichen",
            "type": "select",
            "options": ["Als ungültige Eingabe behandeln und Fehlermeldung anzeigen", "Als 0 interpretieren und akzeptieren"],
            "expected": "Als ungültige Eingabe behandeln und Fehlermeldung anzeigen"
          }
        ]
      },
      {
        "id": "e2",
        "label": "0",
        "fields": [
          {
            "key": "klasse",
            "type": "select",
            "options": [
              "gültig",
              "ungültig"
            ],
            "expected": "gültig"
          },
          {
            "key": "leerzeichen",
            "type": "select",
            "options": ["Als ungültige Eingabe behandeln und Fehlermeldung anzeigen", "Als 0 interpretieren und akzeptieren"],
            "expected": "Als ungültige Eingabe behandeln und Fehlermeldung anzeigen"
          }
        ]
      },
      {
        "id": "e3",
        "label": "45",
        "fields": [
          {
            "key": "klasse",
            "type": "select",
            "options": [
              "gültig",
              "ungültig"
            ],
            "expected": "gültig"
          },
          {
            "key": "leerzeichen",
            "type": "select",
            "options": ["Als ungültige Eingabe behandeln und Fehlermeldung anzeigen", "Als 0 interpretieren und akzeptieren"],
            "expected": "Als ungültige Eingabe behandeln und Fehlermeldung anzeigen"
          }
        ]
      },
      {
        "id": "e4",
        "label": "150",
        "fields": [
          {
            "key": "klasse",
            "type": "select",
            "options": [
              "gültig",
              "ungültig"
            ],
            "expected": "ungültig"
          },
          {
            "key": "leerzeichen",
            "type": "select",
            "options": ["Als ungültige Eingabe behandeln und Fehlermeldung anzeigen", "Als 0 interpretieren und akzeptieren"],
            "expected": "Als ungültige Eingabe behandeln und Fehlermeldung anzeigen"
          }
        ]
      }
    ],
    "explanation": "Es gibt zwei ungültige Klassen (negativ, über 120) und eine gültige Klasse (0-120), wobei 0 ein wichtiger Randfall ist. Eine Eingabe aus nur Leerzeichen enthält keine gültige Zahl und muss unabhängig von der Klasse als ungültige Eingabe mit Fehlermeldung abgewiesen werden."
  }
},
{
  "id": "12a",
  "title": "Überdeckungsarten",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 12,
  "checkpointNrs": [
    "12.1"
  ],
  "baseReward": 120,
  "intro": "Erläutere Anweisungs-, Zweig- und Pfadüberdeckung. Wähle für eine sicherheitskritische Funktion mit drei verschachtelten If-Bedingungen (jede Kombination kann kritisch sein) eine geeignete Überdeckungsart begründet aus.",
  "modelAnswer": "<strong>Anweisungsüberdeckung:</strong> jede Anweisung mind. einmal ausgeführt – schwächste Form.<br><strong>Zweigüberdeckung:</strong> jeder Wahr-/Falsch-Zweig jeder Bedingung mind. einmal durchlaufen.<br><strong>Pfadüberdeckung:</strong> alle Kombinationen von Pfaden getestet – stärkste, aufwändigste Form.<br><strong>Entscheidung:</strong> Pfadüberdeckung, da bei 3 Bedingungen 2³=8 Kombinationen sicherheitsrelevant sein können – Anweisungs-/Zweigüberdeckung könnten gefährliche Kombinationen übersehen.",
  "checklist": [
    "Alle drei Überdeckungsarten korrekt definiert",
    "Pfadüberdeckung als stärkste Form erkannt",
    "Entscheidung für Pfadüberdeckung begründet",
    "Bezug zur Sicherheitskritikalität hergestellt"
  ]
},
{
  "id": "12b",
  "title": "Anweisungsüberdeckung klassifiziere",
  "icon": "📊",
  "engine": "field",
  "topicId": 12,
  "checkpointNrs": [
    "12.2"
  ],
  "baseReward": 120,
  "intro": "FUNKTION klassifiziere(punkte): >=90→A, >=70→B, sonst C. Testfall1 punkte=95 (A-Zweig), Testfall2 punkte=50 (C-Zweig). Welche Anweisung wurde nicht durchlaufen? Mindestanzahl zusätzlicher Testfälle für volle Anweisungsüberdeckung?",
  "build": {
    "columns": [
      "anweisung",
      "anzahl"
    ],
    "tableData": [
      [
        "Ergebnis"
      ],
      [
        "Analyse"
      ]
    ],
    "rows": [
      {
        "id": "r1",
        "label": "Analyse",
        "fields": [
          {
            "key": "anweisung",
            "type": "select",
            "options": ["ausgabe = A", "ausgabe = B", "ausgabe = C"],
            "expected": "ausgabe = B"
          },
          {
            "key": "anzahl",
            "type": "number",
            "expected": 1
          }
        ]
      }
    ],
    "explanation": "Testfall 1 (95) nutzt nur den A-Zweig, Testfall 2 (50) nur den C-Zweig – die Anweisung ausgabe='B' (Bereich 70-89) wurde nie ausgeführt. Ein zusätzlicher Testfall (z. B. punkte=80) reicht für vollständige Anweisungsüberdeckung (C0)."
  }
},
{
  "id": "12c",
  "title": "Pfadüberdeckung verschachtelte Ifs",
  "icon": "📊",
  "engine": "field",
  "topicId": 12,
  "checkpointNrs": [
    "12.3"
  ],
  "baseReward": 120,
  "intro": "Verschachtelte Bedingungen A und B mit 4 Aktionen. Liste alle Pfade für vollständige Pfadüberdeckung auf.",
  "build": {
    "columns": [
      "pfad"
    ],
    "tableData": [
      [
        "Pfad"
      ],
      [
        "1"
      ],
      [
        "2"
      ],
      [
        "3"
      ],
      [
        "4"
      ]
    ],
    "rows": [
      {
        "id": "p1",
        "label": "Pfad 1",
        "fields": [
          {
            "key": "pfad",
            "type": "select",
            "options": ["A=wahr, B=wahr → Aktion1", "A=wahr, B=falsch → Aktion2", "A=falsch, B=wahr → Aktion3", "A=falsch, B=falsch → Aktion4"],
            "expected": "A=wahr, B=wahr → Aktion1"
          }
        ]
      },
      {
        "id": "p2",
        "label": "Pfad 2",
        "fields": [
          {
            "key": "pfad",
            "type": "select",
            "options": ["A=wahr, B=wahr → Aktion1", "A=wahr, B=falsch → Aktion2", "A=falsch, B=wahr → Aktion3", "A=falsch, B=falsch → Aktion4"],
            "expected": "A=wahr, B=falsch → Aktion2"
          }
        ]
      },
      {
        "id": "p3",
        "label": "Pfad 3",
        "fields": [
          {
            "key": "pfad",
            "type": "select",
            "options": ["A=wahr, B=wahr → Aktion1", "A=wahr, B=falsch → Aktion2", "A=falsch, B=wahr → Aktion3", "A=falsch, B=falsch → Aktion4"],
            "expected": "A=falsch, B=wahr → Aktion3"
          }
        ]
      },
      {
        "id": "p4",
        "label": "Pfad 4",
        "fields": [
          {
            "key": "pfad",
            "type": "select",
            "options": ["A=wahr, B=wahr → Aktion1", "A=wahr, B=falsch → Aktion2", "A=falsch, B=wahr → Aktion3", "A=falsch, B=falsch → Aktion4"],
            "expected": "A=falsch, B=falsch → Aktion4"
          }
        ]
      }
    ],
    "explanation": "Zwei unabhängige boolesche Bedingungen ergeben 2×2=4 mögliche Pfade. Vollständige Pfadüberdeckung (C2) erfordert, dass jeder der vier Pfade mindestens einmal getestet wird, sonst können Fehler in einzelnen Kombinationen unentdeckt bleiben."
  }
},
{
  "id": "13a",
  "title": "ISO/IEC 25010 Qualitätsmerkmale",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 13,
  "checkpointNrs": [
    "13.1"
  ],
  "baseReward": 120,
  "intro": "Nenne die Qualitätsmerkmale nach ISO/IEC 25010 und erläutere mind. drei davon an einem selbst gewählten Software-Beispiel.",
  "modelAnswer": "Die acht Merkmale: <strong>Funktionalität</strong> (korrekte Funktionen), <strong>Zuverlässigkeit</strong> (stabil bei Fehlern/Last), <strong>Effizienz/Performanz</strong> (sparsamer Ressourceneinsatz), <strong>Benutzbarkeit</strong> (erlernbar, bedienbar), <strong>Änderbarkeit/Wartbarkeit</strong> (anpassbar, erweiterbar), <strong>Portabilität</strong> (übertragbar auf andere Umgebungen), <strong>Sicherheit</strong> (Schutz vor unbefugtem Zugriff), <strong>Kompatibilität</strong> (Zusammenarbeit mit anderen Systemen). Beispiel Online-Shop: Performanz = Suche liefert in &lt;1s Ergebnisse; Sicherheit = HTTPS-Verschlüsselung; Wartbarkeit = Zahlungsmodul leicht erweiterbar.",
  "checklist": [
    "Mind. drei Merkmale korrekt benannt",
    "Für jedes Merkmal eine zutreffende Definition",
    "Konkretes, durchgängiges Software-Beispiel gewählt",
    "Merkmale nicht verwechselt (z. B. Sicherheit vs. Zuverlässigkeit)"
  ]
},
{
  "id": "13b",
  "title": "QS-Maßnahmen & Grenzen",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 13,
  "checkpointNrs": [
    "13.2",
    "13.3"
  ],
  "baseReward": 120,
  "intro": "Beschreibe qualitätssichernde Maßnahmen in der Softwareentwicklung und nimm Stellung zum ausschließlichen Einsatz automatischer Code-Reviews und Unit-Tests.",
  "modelAnswer": "<strong>Maßnahmen:</strong> Code-Reviews, Pair Programming, Unit-Tests, statische Codeanalyse, Styleguides, Continuous Integration.<br><strong>Stellungnahme:</strong> ausschließlich automatisiert ist nicht ausreichend – logische/fachliche Fehler, Architekturprobleme und UX-Probleme werden nicht erkannt, da Tools nur prüfen, was explizit implementiert/getestet wurde. Ergänzung durch manuelle Reviews und Usability-Tests nötig.",
  "checklist": [
    "Mind. 4 QS-Maßnahmen genannt und erklärt",
    "Automatisiert vs. manuell unterschieden",
    "Grenzen automatischer Prüfung konkret benannt",
    "Begründete Stellungnahme mit Argumenten"
  ]
},
{
  "id": "13c",
  "title": "Konformität & Prototyping",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 13,
  "checkpointNrs": [
    "13.4",
    "13.5"
  ],
  "baseReward": 110,
  "intro": "Nenne Möglichkeiten zur Sicherstellung der Konformität mit einer Spezifikation, beurteile Online-Validatoren und erläutere den Nutzen von Prototyping.",
  "modelAnswer": "<strong>Möglichkeiten:</strong> Reviews (manueller Abgleich), Tests (aus Spezifikation abgeleitet), Validatoren (automatische Schemaprüfung).<br><strong>Online-Validatoren:</strong> Vorteil schnelle Syntaxprüfung; Grenze: nur formale, keine fachliche Prüfung, ggf. Datenschutzbedenken.<br><strong>Prototyping:</strong> frühzeitige Machbarkeits- und Aufwandsabschätzung, Klärung von Anforderungen mit dem Kunden, Vermeidung von Fehlentwicklungen.",
  "checklist": [
    "Drei Möglichkeiten genannt und erklärt",
    "Vorteile und Grenzen von Online-Validatoren genannt",
    "Begründetes Fazit zur alleinigen Nutzung",
    "Nutzen von Prototyping erläutert"
  ]
},
{
  "id": "14a",
  "title": "Versionsverwaltung begründen",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 14,
  "checkpointNrs": [
    "14.1"
  ],
  "baseReward": 100,
  "intro": "Ein Team arbeitet ohne Versionsverwaltung (Austausch per E-Mail/Netzlaufwerk). Begründe fachlich den Einsatz einer Versionsverwaltung wie Git.",
  "modelAnswer": "<strong>Nachvollziehbarkeit:</strong> jede Änderung mit Autor/Zeitpunkt/Kommentar dokumentiert.<br><strong>Parallelarbeit/Branching:</strong> mehrere Entwickler arbeiten unabhängig, kontrolliertes Zusammenführen.<br><strong>Rücksetzbarkeit:</strong> fehlerhafte Änderungen jederzeit rückgängig machbar.<br><strong>Konfliktvermeidung:</strong> Merge-Mechanismen verhindern unbemerktes Überschreiben.",
  "checklist": [
    "Begriff Versionsverwaltung korrekt definiert",
    "Nachvollziehbarkeit als Argument",
    "Parallelarbeit/Branching als Argument",
    "Rücksetzbarkeit und Konfliktvermeidung genannt"
  ]
},
{
  "id": "14b",
  "title": "Bibliotheken & Open Source",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 14,
  "checkpointNrs": [
    "14.2",
    "14.3"
  ],
  "baseReward": 110,
  "intro": "Erläutere Vor-/Nachteile einer Klassenbibliothek, Dokumentationsaspekte bei Erweiterung, und den Begriff Open Source inkl. Lizenzaspekten.",
  "modelAnswer": "<strong>Vorteile Bibliothek:</strong> getestete Funktionalität spart Zeit, einheitliche API, Community-Pflege.<br><strong>Nachteile:</strong> Abhängigkeit von Drittpflege, unnötiger Overhead, Sicherheitsrisiken.<br><strong>Dokumentation bei Erweiterung:</strong> neue/geänderte Methoden dokumentieren, Basisversion und Abhängigkeiten festhalten.<br><strong>Open Source:</strong> Quellcode öffentlich einsehbar/veränderbar, Rechte/Pflichten durch Lizenz (GPL, MIT, Apache) geregelt. Vorteile: kostenlos, transparent; Nachteile: kein garantierter Support, Lizenzprüfung nötig.",
  "checklist": [
    "Mind. 2 Vorteile und 2 Nachteile der Bibliothek genannt",
    "Dokumentationsaspekte bei Erweiterung beschrieben",
    "Open Source korrekt erläutert",
    "Bezug zu Lizenzbedingungen hergestellt"
  ]
},
{
  "id": "14c",
  "title": "CI/CD & Code-Signing",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 14,
  "checkpointNrs": [
    "14.4",
    "14.5"
  ],
  "baseReward": 110,
  "intro": "Beschreibe automatisierte Kompilierung/Bereitstellung (CI/CD) mit Vorteilen. Ein Nutzer meldet die Warnung 'Herausgeber nicht verifiziert' bei signierter Software – erläutere Ursache und Behebung.",
  "modelAnswer": "<strong>CI:</strong> jede Änderung wird automatisch integriert, kompiliert und getestet.<br><strong>CD:</strong> nach erfolgreichem Build automatische Bereitstellung ohne manuelle Schritte.<br><strong>Vorteile:</strong> schnellere, fehlerärmere Releases, frühes Fehler-Feedback.<br><strong>Warnung-Ursache:</strong> Zertifikat nicht vertrauenswürdig (selbstsigniert, abgelaufen, nicht von anerkannter CA).<br><strong>Behebung:</strong> gültiges Code-Signing-Zertifikat einer vertrauenswürdigen CA in den Build-Prozess einbinden, rechtzeitig erneuern.",
  "checklist": [
    "CI und CD begrifflich unterschieden",
    "Mind. 2 Vorteile von CI/CD genannt",
    "Ursache der Warnung korrekt erklärt",
    "Konkrete Behebung über Zertifikat genannt"
  ]
},
{
  "id": "15a",
  "title": "Usability & UX",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 15,
  "checkpointNrs": [
    "15.1",
    "15.2"
  ],
  "baseReward": 120,
  "intro": "Erläutere Usability und User Experience inkl. Testmöglichkeiten, ordne Gestaltungselemente ihrem Zweck zu und beschreibe Mängel eines überladenen, nicht gruppierten Formulars.",
  "modelAnswer": "<strong>Usability:</strong> wie effektiv/effizient ein Ziel erreicht werden kann.<br><strong>UX:</strong> gesamtes subjektives Erleben (Emotionen, Vertrauen, Freude) – umfassender als Usability.<br><strong>Testmethoden:</strong> Thinking-Aloud-Test, A/B-Test, Expertenreview.<br><strong>Gestaltungselemente:</strong> Buttons (Aktion auslösen), Formularfelder (strukturierte Eingabe), Navigation (Orientierung).<br><strong>Mängel überladenes Formular:</strong> hoher kognitiver Aufwand, Fehleranfälligkeit, Frustration – Verbesserung durch Gruppierung/Wizard.",
  "checklist": [
    "Usability und UX klar unterschieden",
    "Mind. 2 Testmethoden beschrieben",
    "Mind. 3 Gestaltungselemente zugeordnet",
    "Konkrete Formular-Mängel mit Verbesserungsvorschlag"
  ]
},
{
  "id": "15b",
  "title": "Barrierefreiheit Mockup-Check",
  "icon": "📊",
  "engine": "field",
  "topicId": 15,
  "checkpointNrs": [
    "15.3",
    "15.4"
  ],
  "baseReward": 120,
  "intro": "Login-Formular-Mockup auf Barrierefreiheits-Mängel prüfen. Ordne jedem Element das zutreffende Problem zu.",
  "build": {
    "columns": [
      "problem"
    ],
    "tableData": [
      [
        "Element"
      ],
      [
        "Hellgrauer Button-Text auf Weiß"
      ],
      [
        "Eingabefeld ohne Label, nur Platzhalter"
      ],
      [
        "Fehlermeldung nur durch rote Farbe"
      ],
      [
        "Schriftgröße 10px Fließtext"
      ]
    ],
    "rows": [
      {
        "id": "p1",
        "label": "Hellgrauer Button-Text auf Weiß",
        "fields": [
          {
            "key": "problem",
            "type": "select",
            "options": [
              "Kontrastproblem",
              "Fehlendes-Label",
              "Nur-Farbcodierung",
              "Zu-kleine-Schrift"
            ],
            "expected": "Kontrastproblem"
          }
        ]
      },
      {
        "id": "p2",
        "label": "Eingabefeld ohne Label, nur Platzhalter",
        "fields": [
          {
            "key": "problem",
            "type": "select",
            "options": [
              "Kontrastproblem",
              "Fehlendes-Label",
              "Nur-Farbcodierung",
              "Zu-kleine-Schrift"
            ],
            "expected": "Fehlendes-Label"
          }
        ]
      },
      {
        "id": "p3",
        "label": "Fehlermeldung nur durch rote Farbe",
        "fields": [
          {
            "key": "problem",
            "type": "select",
            "options": [
              "Kontrastproblem",
              "Fehlendes-Label",
              "Nur-Farbcodierung",
              "Zu-kleine-Schrift"
            ],
            "expected": "Nur-Farbcodierung"
          }
        ]
      },
      {
        "id": "p4",
        "label": "Schriftgröße 10px Fließtext",
        "fields": [
          {
            "key": "problem",
            "type": "select",
            "options": [
              "Kontrastproblem",
              "Fehlendes-Label",
              "Nur-Farbcodierung",
              "Zu-kleine-Schrift"
            ],
            "expected": "Zu-kleine-Schrift"
          }
        ]
      }
    ],
    "explanation": "Nach WCAG: ausreichender Farbkontrast nötig (1); Platzhalter ersetzt kein echtes Label, verschwindet beim Fokus (2); Informationen dürfen nicht ausschließlich über Farbe vermittelt werden (3); zu kleine Schrift erschwert sehbeeinträchtigten Nutzern das Lesen (4)."
  }
},
{
  "id": "15c",
  "title": "Datendarstellung wählen",
  "icon": "📊",
  "engine": "field",
  "topicId": 15,
  "checkpointNrs": [
    "15.5"
  ],
  "baseReward": 100,
  "intro": "Ordne jeder Datenart die passende Darstellungsform zu.",
  "build": {
    "columns": [
      "form"
    ],
    "tableData": [
      [
        "Datenart"
      ],
      [
        "Verkaufsentwicklung über 12 Monate"
      ],
      [
        "Marktanteile von 5 Konkurrenten"
      ],
      [
        "Exakte Einzelwerte von 20 Messungen"
      ],
      [
        "Vergleich Jahresumsätze zweier Filialen"
      ]
    ],
    "rows": [
      {
        "id": "d1",
        "label": "Verkaufsentwicklung über 12 Monate",
        "fields": [
          {
            "key": "form",
            "type": "select",
            "options": [
              "Liniendiagramm",
              "Kreisdiagramm",
              "Tabelle",
              "Balkendiagramm"
            ],
            "expected": "Liniendiagramm"
          }
        ]
      },
      {
        "id": "d2",
        "label": "Marktanteile von 5 Konkurrenten",
        "fields": [
          {
            "key": "form",
            "type": "select",
            "options": [
              "Liniendiagramm",
              "Kreisdiagramm",
              "Tabelle",
              "Balkendiagramm"
            ],
            "expected": "Kreisdiagramm"
          }
        ]
      },
      {
        "id": "d3",
        "label": "Exakte Einzelwerte von 20 Messungen",
        "fields": [
          {
            "key": "form",
            "type": "select",
            "options": [
              "Liniendiagramm",
              "Kreisdiagramm",
              "Tabelle",
              "Balkendiagramm"
            ],
            "expected": "Tabelle"
          }
        ]
      },
      {
        "id": "d4",
        "label": "Vergleich Jahresumsätze zweier Filialen",
        "fields": [
          {
            "key": "form",
            "type": "select",
            "options": [
              "Liniendiagramm",
              "Kreisdiagramm",
              "Tabelle",
              "Balkendiagramm"
            ],
            "expected": "Balkendiagramm"
          }
        ]
      }
    ],
    "explanation": "Liniendiagramm für zeitliche Entwicklungen, Kreisdiagramm für Anteile an einem Gesamten, Tabelle für exakte Einzelwerte zum Nachschlagen, Balkendiagramm für den direkten Vergleich einzelner Kategorien."
  }
},
{
  "id": "16a",
  "title": "3-Schichten-Architektur & REST",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 16,
  "checkpointNrs": [
    "16.1",
    "16.2"
  ],
  "baseReward": 120,
  "intro": "Beschreibe die 3-Schichten-Architektur einer Webanwendung und das REST-API-Konzept. Erläutere Pfad- und Query-Parameter am Beispiel 'GET /kunden/42?sortierung=name'.",
  "modelAnswer": "<strong>Präsentationsschicht:</strong> UI/Darstellung. <strong>Logikschicht:</strong> Geschäftslogik/API. <strong>Datenschicht:</strong> persistente Speicherung.<br><strong>REST:</strong> Ressourcen über URLs adressiert, zustandslos, Zugriff über HTTP-Verben (GET/POST/PUT/DELETE).<br><strong>Beispiel:</strong> '42' ist Pfad-Parameter (identifiziert Ressource), 'sortierung=name' ist Query-Parameter (optionale Zusatzinfo nach '?').",
  "checklist": [
    "Alle drei Schichten korrekt benannt und erläutert",
    "Zustandslosigkeit als REST-Merkmal erklärt",
    "Mind. 3 HTTP-Verben den CRUD-Operationen zugeordnet",
    "Pfad- vs. Query-Parameter am Beispiel erklärt"
  ]
},
{
  "id": "16b",
  "title": "CRUD zu HTTP-Methoden",
  "icon": "📊",
  "engine": "field",
  "topicId": 16,
  "checkpointNrs": [
    "16.3"
  ],
  "baseReward": 110,
  "intro": "Ordne den CRUD-Operationen die passende HTTP-Methode zu.",
  "build": {
    "columns": [
      "methode"
    ],
    "tableData": [
      [
        "Operation"
      ],
      [
        "Create"
      ],
      [
        "Read"
      ],
      [
        "Update"
      ],
      [
        "Delete"
      ]
    ],
    "rows": [
      {
        "id": "c1",
        "label": "Create",
        "fields": [
          {
            "key": "methode",
            "type": "select",
            "options": [
              "GET",
              "POST",
              "PUT",
              "DELETE",
              "PATCH"
            ],
            "expected": "POST"
          }
        ]
      },
      {
        "id": "c2",
        "label": "Read",
        "fields": [
          {
            "key": "methode",
            "type": "select",
            "options": [
              "GET",
              "POST",
              "PUT",
              "DELETE",
              "PATCH"
            ],
            "expected": "GET"
          }
        ]
      },
      {
        "id": "c3",
        "label": "Update",
        "fields": [
          {
            "key": "methode",
            "type": "select",
            "options": [
              "GET",
              "POST",
              "PUT",
              "DELETE",
              "PATCH"
            ],
            "expected": "PUT"
          }
        ]
      },
      {
        "id": "c4",
        "label": "Delete",
        "fields": [
          {
            "key": "methode",
            "type": "select",
            "options": [
              "GET",
              "POST",
              "PUT",
              "DELETE",
              "PATCH"
            ],
            "expected": "DELETE"
          }
        ]
      }
    ],
    "explanation": "Eine HTTP-Anfrage besteht aus Methode, URL, Headern und optional Body. GET/DELETE haben meist keinen Body, POST/PUT/PATCH übertragen Daten meist als JSON im Body."
  }
},
{
  "id": "16c",
  "title": "HTTP-Statuscodes deuten",
  "icon": "📊",
  "engine": "field",
  "topicId": 16,
  "checkpointNrs": [
    "16.4"
  ],
  "baseReward": 110,
  "intro": "Gib zu jedem Statuscode die Bedeutung an.",
  "build": {
    "columns": [
      "bedeutung"
    ],
    "tableData": [
      [
        "Code"
      ],
      [
        "200"
      ],
      [
        "201"
      ],
      [
        "400"
      ],
      [
        "404"
      ],
      [
        "500"
      ]
    ],
    "rows": [
      {
        "id": "s1",
        "label": "200",
        "fields": [
          {
            "key": "bedeutung",
            "type": "select",
            "options": ["OK / Erfolg", "Created / Ressource erstellt", "Bad Request / Fehlerhafte Anfrage", "Not Found / Ressource nicht gefunden", "Internal Server Error / Serverfehler"],
            "expected": "OK / Erfolg"
          }
        ]
      },
      {
        "id": "s2",
        "label": "201",
        "fields": [
          {
            "key": "bedeutung",
            "type": "select",
            "options": ["OK / Erfolg", "Created / Ressource erstellt", "Bad Request / Fehlerhafte Anfrage", "Not Found / Ressource nicht gefunden", "Internal Server Error / Serverfehler"],
            "expected": "Created / Ressource erstellt"
          }
        ]
      },
      {
        "id": "s3",
        "label": "400",
        "fields": [
          {
            "key": "bedeutung",
            "type": "select",
            "options": ["OK / Erfolg", "Created / Ressource erstellt", "Bad Request / Fehlerhafte Anfrage", "Not Found / Ressource nicht gefunden", "Internal Server Error / Serverfehler"],
            "expected": "Bad Request / Fehlerhafte Anfrage"
          }
        ]
      },
      {
        "id": "s4",
        "label": "404",
        "fields": [
          {
            "key": "bedeutung",
            "type": "select",
            "options": ["OK / Erfolg", "Created / Ressource erstellt", "Bad Request / Fehlerhafte Anfrage", "Not Found / Ressource nicht gefunden", "Internal Server Error / Serverfehler"],
            "expected": "Not Found / Ressource nicht gefunden"
          }
        ]
      },
      {
        "id": "s5",
        "label": "500",
        "fields": [
          {
            "key": "bedeutung",
            "type": "select",
            "options": ["OK / Erfolg", "Created / Ressource erstellt", "Bad Request / Fehlerhafte Anfrage", "Not Found / Ressource nicht gefunden", "Internal Server Error / Serverfehler"],
            "expected": "Internal Server Error / Serverfehler"
          }
        ]
      }
    ],
    "explanation": "404 tritt auf, wenn die URL falsch ist oder die Ressource gelöscht wurde. 400 deutet auf einen Fehler in der Anfrage selbst hin, 500 auf einen unerwarteten Serverfehler."
  }
},
{
  "id": "16d",
  "title": "REST-Endpunkt mit Fehlerbehandlung",
  "icon": "⌨️",
  "engine": "token",
  "topicId": 16,
  "checkpointNrs": [
    "16.5"
  ],
  "baseReward": 130,
  "intro": "Pseudocode für REST-Endpunkt der eine Ressource per ID abruft: Erfolg = JSON mit Status 200, Fehler (nicht gefunden) = Status 404 mit strukturierter Fehlermeldung.",
  "placeholder": "FUNKTION getRessource(id): ...",
  "tokens": [
    {
      "label": "Suche der Ressource nach ID",
      "pattern": "(datenbank|db).*(sucheNachId|find).*id"
    },
    {
      "label": "Prüfung ob gefunden",
      "pattern": "ressource\\s*==\\s*null"
    },
    {
      "label": "Erfolgsantwort Status 200 mit Daten",
      "pattern": "status\\s*=\\s*200"
    },
    {
      "label": "Fehlerantwort Status 404",
      "pattern": "status\\s*=\\s*404"
    }
  ],
  "modelAnswer": "FUNKTION getRessource(id):\n    ressource = Datenbank.sucheNachId(id)\n    WENN ressource == null DANN\n        RETURN Antwort(status=404, body={ \"fehler\": \"Ressource nicht gefunden\" })\n    SONST\n        RETURN Antwort(status=200, body=ressource.toJSON())\n    ENDWENN\nENDFUNKTION"
},
{
  "id": "17a",
  "title": "DTD & wohlgeformt/gültig",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 17,
  "checkpointNrs": [
    "17.1"
  ],
  "baseReward": 100,
  "intro": "Erläutere den Zweck einer DTD und den Unterschied zwischen wohlgeformt und gültig bei XML.",
  "modelAnswer": "<strong>DTD:</strong> beschreibt formal erlaubte Elemente/Attribute, Reihenfolge und Pflichtfelder eines XML-Dokuments.<br><strong>Wohlgeformt:</strong> rein syntaktisch korrekt (Tags geschlossen, korrekt verschachtelt, ein Wurzelelement).<br><strong>Gültig:</strong> zusätzlich konform zu einer DTD/einem Schema. Ein Dokument kann wohlgeformt aber ungültig sein, nie aber gültig ohne wohlgeformt zu sein.",
  "checklist": [
    "Zweck der DTD korrekt erklärt",
    "Wohlgeformtheit korrekt definiert",
    "Gültigkeit korrekt definiert",
    "Zusammenhang beider Begriffe verdeutlicht"
  ]
},
{
  "id": "17b",
  "title": "XML-Fehlersuche",
  "icon": "📊",
  "engine": "field",
  "topicId": 17,
  "checkpointNrs": [
    "17.2"
  ],
  "baseReward": 120,
  "intro": "Fehlerhaftes XML: <kunde><name>Max</name><alter>-5</alter><email>max@test.de</kunde> (email nicht geschlossen). Finde Syntaxfehler und einen logischen Fehler, der auch bei gültiger XSD nicht erkannt würde.",
  "build": {
    "columns": [
      "syntax",
      "logisch"
    ],
    "tableData": [
      [
        "Analyse"
      ],
      [
        "Fehler"
      ]
    ],
    "rows": [
      {
        "id": "f1",
        "label": "Fehler",
        "fields": [
          {
            "key": "syntax",
            "type": "select",
            "options": ["Email-Tag wird nicht geschlossen", "Fehlendes Wurzelelement", "Mehrere Wurzelelemente", "Attributwert ohne Anführungszeichen"],
            "expected": "Email-Tag wird nicht geschlossen"
          },
          {
            "key": "logisch",
            "type": "select",
            "options": ["Alter=-5 ist negativ und damit fachlich unsinnig, aber syntaktisch gültig", "Name enthält Sonderzeichen", "E-Mail-Format ist ungültig", "Datum liegt in der Zukunft"],
            "expected": "Alter=-5 ist negativ und damit fachlich unsinnig, aber syntaktisch gültig"
          }
        ]
      }
    ],
    "explanation": "Das fehlende schließende </email>-Tag verletzt die XML-Syntaxregeln (nicht wohlgeformt). Der Wert alter=-5 ist syntaktisch gültig (falls nur xs:integer vorgeschrieben ist), aber fachlich unsinnig – XSD-Validierung prüft nur Struktur/Datentyp, nicht die fachliche Plausibilität."
  }
},
{
  "id": "17c",
  "title": "Tabelle zu JSON",
  "icon": "⌨️",
  "engine": "token",
  "topicId": 17,
  "checkpointNrs": [
    "17.3"
  ],
  "baseReward": 110,
  "intro": "Überführe die Tabellenzeilen (1,Apfel,0.50) und (2,Birne,0.70) in ein JSON-Array mit den Schlüsseln id/name/preis.",
  "placeholder": "[ { \"id\": 1, \"name\": \"Apfel\", \"preis\": 0.50 }, ... ]",
  "tokens": [
    {
      "label": "Äußere eckige Klammern",
      "pattern": "\\[[\\s\\S]*\\]"
    },
    {
      "label": "Zwei Objekte in geschweiften Klammern",
      "pattern": "\\{[\\s\\S]*?\\}[\\s\\S]*\\{[\\s\\S]*?\\}"
    },
    {
      "label": "Schlüssel id vorhanden",
      "pattern": "\\\"id\\\"\\s*:\\s*\\d"
    },
    {
      "label": "Schlüssel name vorhanden",
      "pattern": "\\\"name\\\"\\s*:\\s*\\\"(Apfel|Birne)\\\""
    },
    {
      "label": "Schlüssel preis vorhanden",
      "pattern": "\\\"preis\\\"\\s*:\\s*0\\.(50|5|70|7)"
    }
  ],
  "modelAnswer": "[\n  { \"id\": 1, \"name\": \"Apfel\", \"preis\": 0.50 },\n  { \"id\": 2, \"name\": \"Birne\", \"preis\": 0.70 }\n]"
},
{
  "id": "17d",
  "title": "Elektronische Rechnung",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 17,
  "checkpointNrs": [
    "17.4"
  ],
  "baseReward": 100,
  "intro": "Erläutere Ziele und Aspekte der elektronischen Rechnung (E-Invoicing) gegenüber PDF/Papier.",
  "modelAnswer": "<strong>E-Invoicing:</strong> strukturierte, maschinenlesbare Daten (z. B. XML) statt PDF/Papier.<br><strong>Ziel Automatisierung:</strong> automatische Verarbeitung ohne manuelle Erfassung.<br><strong>Rechtlicher Rahmen:</strong> Standards wie XRechnung/ZUGFeRD, EU-Richtlinien.<br><strong>Vorteile:</strong> Kosteneinsparung (Porto/Papier), Fehlerreduktion, schnellere Zahlungsabwicklung.",
  "checklist": [
    "Strukturierte Daten statt PDF/Papier erklärt",
    "Automatisierte Verarbeitung als Ziel genannt",
    "Bezug zu Standards/rechtlichem Rahmen",
    "Mind. zwei konkrete Vorteile genannt"
  ]
},
{
  "id": "18a",
  "title": "LAN, SAN, LPWAN zuordnen",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 18,
  "checkpointNrs": [
    "18.1"
  ],
  "baseReward": 100,
  "intro": "Ordne LAN, SAN und LPWAN jeweils einem Anwendungsgebiet begründet zu.",
  "modelAnswer": "<strong>LAN:</strong> lokales Netzwerk im Büro/Firma – hohe Geschwindigkeit, geringe Latenz auf kurze Distanz.<br><strong>SAN:</strong> Speichernetzwerk im Rechenzentrum – hoher Durchsatz für Blockspeicherzugriffe.<br><strong>LPWAN:</strong> IoT-Sensoren über große Distanzen – geringer Energieverbrauch, große Reichweite, geringe Datenrate.",
  "checklist": [
    "Jedem Netzwerktyp ein passendes Anwendungsbeispiel zugeordnet",
    "LAN-Begründung (lokal, schnell) korrekt",
    "SAN-Begründung (Speicher, Rechenzentrum) korrekt",
    "LPWAN-Begründung (Energie, Reichweite, Datenrate) korrekt"
  ]
},
{
  "id": "18b",
  "title": "LoRa & Ethernet-Frame",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 18,
  "checkpointNrs": [
    "18.2",
    "18.3"
  ],
  "baseReward": 110,
  "intro": "Begründe die Eignung von LoRa für Temperatursensoren auf einem Firmengelände. Ordne die Felder eines Ethernet-Frames zu und erläutere den Aufbau einer MAC-Adresse.",
  "modelAnswer": "<strong>LoRa:</strong> Low Power (jahrelange Batterielaufzeit), lange Reichweite (mehrere km ohne Sichtverbindung), geringe Datenrate (reicht für einzelne Messwerte).<br><strong>Ethernet-Frame:</strong> Zieladresse, Quelladresse, Typ/Länge, Daten, Prüfsumme (FCS).<br><strong>MAC-Adresse:</strong> 48 Bit, erste 24 Bit Hersteller-Kennung (OUI), restliche 24 Bit Seriennummer.",
  "checklist": [
    "Alle drei LoRa-Merkmale auf das Szenario bezogen begründet",
    "Ethernet-Frame-Felder korrekt zugeordnet",
    "48-Bit-Länge der MAC-Adresse genannt",
    "Aufteilung Hersteller-Kennung/Seriennummer erläutert"
  ]
},
{
  "id": "18c",
  "title": "IP/MAC-Adresse ausgeben",
  "icon": "⌨️",
  "engine": "token",
  "topicId": 18,
  "checkpointNrs": [
    "18.4"
  ],
  "baseReward": 100,
  "intro": "Pseudocode der IP- und MAC-Adresse mittels holeIPAdresse() und holeMACAdresse() ermittelt und ausgibt.",
  "placeholder": "ip = holeIPAdresse() ...",
  "tokens": [
    {
      "label": "Variable mit holeIPAdresse() befüllt",
      "pattern": "holeipadresse\\(\\)"
    },
    {
      "label": "Variable mit holeMACAdresse() befüllt",
      "pattern": "holemacadresse\\(\\)"
    },
    {
      "label": "Ausgabe der IP-Adresse",
      "pattern": "(ausgeben|print).*ip"
    },
    {
      "label": "Ausgabe der MAC-Adresse",
      "pattern": "(ausgeben|print).*mac"
    }
  ],
  "modelAnswer": "ipAdresse = holeIPAdresse()\nmacAdresse = holeMACAdresse()\nausgeben(\"IP-Adresse: \" + ipAdresse)\nausgeben(\"MAC-Adresse: \" + macAdresse)"
},
{
  "id": "19a",
  "title": "Verschlüsselungsverfahren wählen",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 19,
  "checkpointNrs": [
    "19.1"
  ],
  "baseReward": 120,
  "intro": "Beschreibe symmetrische, asymmetrische und hybride Verschlüsselung. Schlage für (a) Übertragung an bekannten Empfänger und (b) Erstkontakt mit unbekanntem Partner ein geeignetes Verfahren vor.",
  "modelAnswer": "<strong>Symmetrisch:</strong> ein gemeinsamer Schlüssel, schnell, aber Schlüsselaustauschproblem.<br><strong>Asymmetrisch:</strong> Schlüsselpaar öffentlich/privat, löst Austauschproblem, aber langsamer.<br><strong>Hybrid:</strong> asymmetrischer Schlüsselaustausch + symmetrische Datenübertragung.<br><strong>(a):</strong> symmetrisch, da Schlüssel bereits vorhanden und Performance zählt.<br><strong>(b):</strong> hybrid, da kein gemeinsames Geheimnis existiert.",
  "checklist": [
    "Alle drei Verfahren korrekt mit Kernmerkmalen beschrieben",
    "Vor-/Nachteile (Geschwindigkeit vs. Schlüsselaustausch) genannt",
    "Szenario (a) begründet gewählt",
    "Szenario (b) begründet gewählt"
  ]
},
{
  "id": "19b",
  "title": "TLS & Zertifikate",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 19,
  "checkpointNrs": [
    "19.2"
  ],
  "baseReward": 110,
  "intro": "Erläutere, wie TLS ein hybrides Verfahren einsetzt, und wie die Authentizität über Zertifikate geprüft wird.",
  "modelAnswer": "<strong>TLS-Handshake:</strong> asymmetrischer Austausch eines symmetrischen Sitzungsschlüssels, danach symmetrische Verschlüsselung der Nutzdaten (performant).<br><strong>Zertifikatsprüfung:</strong> Server legt Zertifikat mit öffentlichem Schlüssel vor, signiert von einer Zertifizierungsstelle (CA).<br><strong>Vertrauenskette:</strong> Client prüft Signatur über die Kette bis zu einem im System hinterlegten Root-Zertifikat.",
  "checklist": [
    "Asymmetrischer Schlüsselaustausch beim Handshake erläutert",
    "Symmetrische Verschlüsselung für Nutzdaten begründet",
    "Rolle von Zertifikat und CA beschrieben",
    "Vertrauenskette (Chain of Trust) erläutert"
  ]
},
{
  "id": "19c",
  "title": "Integrität, Signatur & RSA",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 19,
  "checkpointNrs": [
    "19.3",
    "19.4"
  ],
  "baseReward": 120,
  "intro": "Erläutere das Schutzziel Integrität und den Einsatz digitaler Signaturen. Erläutere RSA und beurteile seine Eignung für die Signatur eines Vertragsdokuments.",
  "modelAnswer": "<strong>Integrität:</strong> Daten bleiben unverändert bzw. Änderungen sind nachweisbar.<br><strong>Digitale Signatur:</strong> Hashwert des Dokuments wird mit privatem Schlüssel verschlüsselt; Empfänger prüft mit öffentlichem Schlüssel – stimmen Hashwerte überein, ist Integrität und Authentizität belegt.<br><strong>RSA:</strong> asymmetrisches Verfahren, Sicherheit basiert auf der Schwierigkeit der Primfaktorzerlegung.<br><strong>Eignung:</strong> gut geeignet für Vertragssignatur – gewährleistet Integrität, Authentizität und Nichtabstreitbarkeit.",
  "checklist": [
    "Integrität korrekt definiert",
    "Ablauf der digitalen Signatur korrekt erklärt",
    "RSA als asymmetrisches Verfahren mit Primfaktorzerlegung beschrieben",
    "Eignung für das Vertragsszenario begründet"
  ]
},
{
  "id": "20a",
  "title": "Schutzziele & Passwort-Hashing",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 20,
  "checkpointNrs": [
    "20.1",
    "20.2"
  ],
  "baseReward": 120,
  "intro": "Beschreibe die sicherheitstechnischen Schutzziele eines Systems. Beschreibe ein sicheres Passwort-Speicherverfahren und erläutere die Risiken von Klartext und Hashing ohne Salt.",
  "modelAnswer": "<strong>Schutzziele:</strong> Vertraulichkeit, Integrität, Verfügbarkeit, Authentizität.<br><strong>Hash+Salt:</strong> individueller Salt pro Nutzer wird mit Passwort gehasht (bcrypt/Argon2), gespeichert werden nur Hash und Salt.<br><strong>Klartext-Risiko:</strong> bei Datenbankdiebstahl liegen alle Passwörter offen.<br><strong>Hashing ohne Salt-Risiko:</strong> Rainbow-Table-Angriffe möglich, da gleiche Passwörter gleiche Hashes erzeugen.",
  "checklist": [
    "Alle vier Schutzziele korrekt benannt",
    "Hash+Salt-Verfahren korrekt beschrieben",
    "Risiko der Klartextspeicherung erläutert",
    "Risiko von Hashing ohne Salt (Rainbow Tables) erläutert"
  ]
},
{
  "id": "20b",
  "title": "Single-Sign-On & OAuth2",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 20,
  "checkpointNrs": [
    "20.3"
  ],
  "baseReward": 110,
  "intro": "Erläutere Vor-/Nachteile von Single-Sign-On und ordne die OAuth2-Begriffe (Resource Owner, Client, Authorization Server, Resource Server, Access Token) zu.",
  "modelAnswer": "<strong>Vorteil SSO:</strong> ein Login für mehrere Dienste, hoher Komfort.<br><strong>Nachteil SSO:</strong> Single Point of Failure – kompromittiertes Konto gefährdet alle angebundenen Dienste.<br><strong>Resource Owner:</strong> Endnutzer. <strong>Client:</strong> die zugreifende Anwendung. <strong>Authorization Server:</strong> stellt Access Token aus. <strong>Resource Server:</strong> hält die geschützten Daten. <strong>Access Token:</strong> zeitlich begrenztes Berechtigungstoken.",
  "checklist": [
    "Vorteil von SSO korrekt erläutert",
    "Nachteil (Single Point of Failure) korrekt erläutert",
    "Mind. 3 OAuth2-Begriffe korrekt zugeordnet",
    "Access Token-Funktion erklärt"
  ]
},
{
  "id": "20c",
  "title": "Passwort-Reset-Schwachstelle",
  "icon": "⌨️",
  "engine": "token",
  "topicId": 20,
  "checkpointNrs": [
    "20.4"
  ],
  "baseReward": 120,
  "intro": "Unsicherer Passwort-Reset nur über Sicherheitsfrage ohne E-Mail-Bestätigung. Benenne die Schwachstelle(n) und schlage eine sichere Alternative vor.",
  "placeholder": "Die Schwachstelle besteht darin, dass ...",
  "tokens": [
    {
      "label": "Sicherheitsfrage als unsicher erkannt",
      "pattern": "(sicherheitsfrage|haustier).{0,60}(unsicher|erraten|social engineering)"
    },
    {
      "label": "Fehlende Bestätigung ohne Token/Link",
      "pattern": "ohne.{0,40}(token|link|best[äa]tigung|kanal)"
    },
    {
      "label": "E-Mail-Bestätigung als Alternative",
      "pattern": "e-?mail"
    },
    {
      "label": "Zeitlich begrenzter Token/Link",
      "pattern": "(zeitlich (begrenzt|befristet)|ablaufen|g[üu]ltigkeit)"
    },
    {
      "label": "Zwei-Faktor als zusätzliche Absicherung",
      "pattern": "(zwei-?faktor|2fa)"
    }
  ],
  "modelAnswer": "Die Sicherheitsfrage ist leicht erraten oder per Social Engineering herausfindbar und bietet ohne zweiten Kanal keine ausreichende Absicherung. Sichere Alternative: ein zeitlich begrenzter Token/Link wird an die verifizierte E-Mail-Adresse gesendet; zusätzlich kann eine Zwei-Faktor-Bestätigung gefordert werden."
},
{
  "id": "20d",
  "title": "DSGVO & Einwilligung",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 20,
  "checkpointNrs": [
    "20.5"
  ],
  "baseReward": 90,
  "intro": "Beschreibe, warum eine Datenschutzerklärung und Einwilligung nach DSGVO erforderlich sind.",
  "modelAnswer": "<strong>Transparenzpflicht:</strong> klare Information über Datenerhebung/-verarbeitung.<br><strong>Rechtsgrundlage:</strong> Einwilligung nötig, wenn keine andere Rechtsgrundlage (z. B. Vertrag) vorliegt.<br><strong>Informationspflicht:</strong> Zweck, Dauer, Rechte der betroffenen Person müssen offengelegt werden.<br><strong>Nachweispflicht:</strong> Unternehmen muss gültige Einwilligung jederzeit nachweisen können.",
  "checklist": [
    "Transparenzpflicht genannt",
    "Einwilligung als Rechtsgrundlage erklärt",
    "Informationspflicht über Zweck/Dauer/Rechte genannt",
    "Bezug zur DSGVO hergestellt"
  ]
},
{
  "id": "21a",
  "title": "NoSQL vs. relational",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 21,
  "checkpointNrs": [
    "21.1",
    "21.2"
  ],
  "baseReward": 110,
  "intro": "Erläutere Vorteile dokumentenorientierter NoSQL-Datenbanken, wähle für Produktkatalog vs. Rechnungsverwaltung ein geeignetes DBMS, und ordne die Begriffe Tabelle/Zeile/Spalte den NoSQL-Pendants zu.",
  "modelAnswer": "<strong>Vorteile NoSQL:</strong> flexibles Schema, horizontale Skalierbarkeit, geeignet für variable Datenstrukturen.<br><strong>Produktkatalog:</strong> MongoDB (variierende Attribute je Produkt).<br><strong>Rechnungsverwaltung:</strong> relationales DBMS (feste Felder, ACID-Konsistenz).<br><strong>Begriffe:</strong> Tabelle=Collection, Zeile=Document, Spalte=Field.",
  "checklist": [
    "Flexibles Schema und Skalierbarkeit als Vorteile genannt",
    "DBMS-Auswahl für beide Szenarien begründet",
    "Alle drei Begriffspaare korrekt zugeordnet"
  ]
},
{
  "id": "21b",
  "title": "ACID & Stored Procedures",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 21,
  "checkpointNrs": [
    "21.3",
    "21.4"
  ],
  "baseReward": 110,
  "intro": "Beschreibe die vier ACID-Eigenschaften und erläutere Stored Procedures, Trigger und Indizes mit ihrem jeweiligen Zweck.",
  "modelAnswer": "<strong>Atomicity:</strong> Transaktion ganz oder gar nicht.<br><strong>Consistency:</strong> konsistenter Zustand vor/nach Transaktion.<br><strong>Isolation:</strong> parallele Transaktionen beeinflussen sich nicht.<br><strong>Durability:</strong> Änderungen bleiben nach Commit dauerhaft erhalten.<br><strong>Stored Procedure:</strong> gespeicherte SQL-Logik, wiederverwendbar.<br><strong>Trigger:</strong> automatische Ausführung bei INSERT/UPDATE/DELETE.<br><strong>Index:</strong> beschleunigt Lesezugriffe, kostet Speicher/Schreibgeschwindigkeit.",
  "checklist": [
    "Alle vier ACID-Eigenschaften korrekt benannt",
    "Stored Procedure mit Zweck beschrieben",
    "Trigger mit Zweck beschrieben",
    "Index mit Zweck (Vor-/Nachteil) beschrieben"
  ]
},
{
  "id": "21c",
  "title": "Fachbegriffe relational vs. NoSQL",
  "icon": "📊",
  "engine": "field",
  "topicId": 21,
  "checkpointNrs": [
    "21.2"
  ],
  "baseReward": 100,
  "intro": "Ordne die relationalen Fachbegriffe ihren dokumentenorientierten (NoSQL) Pendants zu.",
  "build": {
    "columns": [
      "pendant"
    ],
    "tableData": [
      [
        "Begriff"
      ],
      [
        "Tabelle"
      ],
      [
        "Zeile"
      ],
      [
        "Spalte"
      ]
    ],
    "rows": [
      {
        "id": "f1",
        "label": "Tabelle",
        "fields": [
          {
            "key": "pendant",
            "type": "select",
            "options": [
              "Collection",
              "Document",
              "Field"
            ],
            "expected": "Collection"
          }
        ]
      },
      {
        "id": "f2",
        "label": "Zeile",
        "fields": [
          {
            "key": "pendant",
            "type": "select",
            "options": [
              "Collection",
              "Document",
              "Field"
            ],
            "expected": "Document"
          }
        ]
      },
      {
        "id": "f3",
        "label": "Spalte",
        "fields": [
          {
            "key": "pendant",
            "type": "select",
            "options": [
              "Collection",
              "Document",
              "Field"
            ],
            "expected": "Field"
          }
        ]
      }
    ],
    "explanation": "In dokumentenorientierten Datenbanken (z. B. MongoDB) entspricht eine Tabelle einer Collection, eine Zeile einem Document und eine Spalte einem Field. Im Gegensatz zur relationalen Tabelle können einzelne Documents innerhalb derselben Collection unterschiedliche Felder besitzen."
  }
},
{
  "id": "22b",
  "title": "Redundanz & Anomalien",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 22,
  "checkpointNrs": [
    "22.3"
  ],
  "baseReward": 120,
  "intro": "Unnormalisierte Tabelle Bestellungen wiederholt Kundendaten in jeder Zeile. Erläutere Redundanz sowie Änderungs-, Einfüge- und Löschanomalie an diesem Beispiel.",
  "modelAnswer": "<strong>Redundanz:</strong> Name/Ort mehrfach gespeichert, obwohl derselbe Kunde.<br><strong>Änderungsanomalie:</strong> Ortswechsel erfordert Änderung in allen Zeilen, sonst Widersprüche.<br><strong>Einfügeanomalie:</strong> neuer Kunde kann erst mit einer Bestellung angelegt werden.<br><strong>Löschanomalie:</strong> Löschen der einzigen Bestellung löscht auch die Kundendaten.",
  "checklist": [
    "Redundanz am Beispiel korrekt benannt",
    "Änderungsanomalie mit Beispiel erklärt",
    "Einfügeanomalie mit Beispiel erklärt",
    "Löschanomalie mit Beispiel erklärt"
  ]
},
{
  "id": "22c",
  "title": "Normalisierung 3NF",
  "icon": "📊",
  "engine": "field",
  "topicId": 22,
  "checkpointNrs": [
    "22.4"
  ],
  "baseReward": 140,
  "intro": "Unnormalisierte Tabelle Bestellung(BestellID, KundeName, KundeOrt, ProduktName, ProduktPreis, Menge) in 3NF überführen. Trage für jede Zieltabelle Primärschlüssel und weitere Spalten ein.",
  "build": {
    "columns": [
      "pk",
      "weitere"
    ],
    "tableData": [
      [
        "Tabelle"
      ],
      [
        "Kunde"
      ],
      [
        "Produkt"
      ],
      [
        "Bestellung"
      ]
    ],
    "rows": [
      {
        "id": "t1",
        "label": "Kunde",
        "fields": [
          {
            "key": "pk",
            "type": "text",
            "expected": "kundeid",
            "matchMode": "contains-key"
          },
          {
            "key": "weitere",
            "type": "text",
            "expected": "kundename,kundeort",
            "matchMode": "contains-key"
          }
        ]
      },
      {
        "id": "t2",
        "label": "Produkt",
        "fields": [
          {
            "key": "pk",
            "type": "text",
            "expected": "produktid",
            "matchMode": "contains-key"
          },
          {
            "key": "weitere",
            "type": "text",
            "expected": "produktname,produktpreis",
            "matchMode": "contains-key"
          }
        ]
      },
      {
        "id": "t3",
        "label": "Bestellung",
        "fields": [
          {
            "key": "pk",
            "type": "text",
            "expected": "bestellid",
            "matchMode": "contains-key"
          },
          {
            "key": "weitere",
            "type": "text",
            "expected": "kundeid,produktid,menge",
            "matchMode": "contains-key"
          }
        ]
      }
    ],
    "explanation": "KundeName/KundeOrt und ProduktName/ProduktPreis hängen nur transitiv (über Kunde bzw. Produkt) vom Schlüssel BestellID ab. Die 3NF-Regel verbietet solche transitiven Abhängigkeiten, daher werden Kunde- und Produktdaten in eigene Tabellen mit eigenem Primärschlüssel ausgelagert; Bestellung verweist per Fremdschlüssel darauf.",
    "glossary": ["KundeID", "KundeName", "KundeOrt", "ProduktID", "ProduktName", "ProduktPreis", "BestellID", "Menge"]
  },
  "hints": [
    "Keine Nichtschlüsselspalte darf von einer anderen Nichtschlüsselspalte abhängen (keine transitive Abhängigkeit)."
  ]
},
{
  "id": "22d",
  "title": "Datentypen festlegen",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 22,
  "checkpointNrs": [
    "22.5"
  ],
  "baseReward": 100,
  "intro": "Lege für Geburtsdatum, E-Mail, Preis, Beschreibungstext und 'Ist aktiv' einen sinnvollen SQL-Datentyp fest und begründe.",
  "modelAnswer": "<strong>Geburtsdatum:</strong> DATE – nur Kalenderdatum, erlaubt Datumsberechnungen.<br><strong>E-Mail:</strong> VARCHAR(255) – variable, begrenzte Länge.<br><strong>Preis:</strong> DECIMAL(10,2) – exakte Nachkommastellen, kein FLOAT wegen Rundungsfehlern.<br><strong>Beschreibungstext:</strong> TEXT – lange, variable Länge.<br><strong>Ist aktiv:</strong> BOOLEAN – genau zwei Zustände.",
  "checklist": [
    "Für jedes Attribut ein passender Datentyp genannt",
    "Begründung bezieht sich auf Wertebereich/Eigenschaften",
    "Preis: Hinweis auf exakte Nachkommastellen (kein FLOAT)"
  ]
},
{
  "id": "23a",
  "title": "Datenqualitätsprobleme",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 23,
  "checkpointNrs": [
    "23.1"
  ],
  "baseReward": 100,
  "intro": "Beschreibe typische Datenqualitätsprobleme gelieferter Daten und ihre Folgen.",
  "modelAnswer": "<strong>Dubletten:</strong> verzerrte Kennzahlen.<br><strong>Fehlende Werte:</strong> gescheiterte Imports, verfälschte Statistiken.<br><strong>Inkonsistente Formate:</strong> Fehlinterpretation beim Import (z. B. Datum).<br><strong>Veraltete Daten:</strong> Fehlentscheidungen auf alter Basis.",
  "checklist": [
    "Mind. 3 unterschiedliche Datenqualitätsprobleme genannt",
    "Für jedes Problem eine konkrete Folge beschrieben",
    "Zusammenhang zu Fehlentscheidungen hergestellt"
  ]
},
{
  "id": "23b",
  "title": "Importwege beurteilen",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 23,
  "checkpointNrs": [
    "23.2"
  ],
  "baseReward": 100,
  "intro": "Zeige Importwege für externe Daten auf und beurteile: täglicher CSV-Import von Wettbewerber-Preisdaten.",
  "modelAnswer": "<strong>CSV-Import:</strong> einfach, aber keine Validierung.<br><strong>API-Schnittstelle:</strong> strukturiert, aktueller, höherer Aufwand.<br><strong>ETL-Prozess:</strong> automatisiert, mit Qualitätsprüfung.<br><strong>Beurteilung:</strong> Vorteil Aktualität; Risiko: Formatänderungen bleiben unentdeckt – Plausibilitätsprüfung nach Import nötig.",
  "checklist": [
    "Mind. 2 Importwege genannt und erläutert",
    "Vor-/Nachteil je Importweg genannt",
    "Vorteil (Aktualität) des CSV-Szenarios benannt",
    "Risiko (Formatfehler) und Verbesserungsvorschlag genannt"
  ]
},
{
  "id": "23c",
  "title": "Speicherbedarf berechnen",
  "icon": "📊",
  "engine": "field",
  "topicId": 23,
  "checkpointNrs": [
    "23.3"
  ],
  "baseReward": 110,
  "intro": "Überwachungskamera: täglich 500 Bilder à 4 MB. Berechne Speicherbedarf für 30 Tage (GiB) und 1 Jahr/365 Tage (TiB). 1 GiB=1024 MB, 1 TiB=1024 GiB.",
  "build": {
    "columns": [
      "ergebnis"
    ],
    "tableData": [
      [
        "Zeitraum"
      ],
      [
        "30 Tage (GiB)"
      ],
      [
        "365 Tage (TiB)"
      ]
    ],
    "rows": [
      {
        "id": "z1",
        "label": "30 Tage (GiB)",
        "fields": [
          {
            "key": "ergebnis",
            "type": "number",
            "expected": 58.59
          }
        ]
      },
      {
        "id": "z2",
        "label": "365 Tage (TiB)",
        "fields": [
          {
            "key": "ergebnis",
            "type": "number",
            "expected": 0.7
          }
        ]
      }
    ],
    "explanation": "Tagesbedarf: 500×4MB=2000MB ÷1024=1,953125 GiB/Tag. 30 Tage: ×30=58,59 GiB. 365 Tage: ×365=712,89 GiB ÷1024≈0,70 TiB."
  }
},
{
  "id": "23d",
  "title": "Tabellenkalkulation: Formeln & Grenzen",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 23,
  "checkpointNrs": [
    "23.4",
    "23.5"
  ],
  "baseReward": 110,
  "intro": "Erläutere SVERWEIS, WENN-Bedingungen und Datumsfunktionen in der Tabellenkalkulation anhand von Beispielen, sowie Einsatzmöglichkeiten und Probleme von Tabellenkalkulationsprogrammen.",
  "modelAnswer": "<strong>SVERWEIS:</strong> =SVERWEIS(A2;Preisliste!A:C;3;FALSCH) sucht Preis zur Produktnummer.<br><strong>WENN (Rabattstaffel):</strong> =WENN(Menge&gt;=100;0,15;WENN(Menge&gt;=50;0,10;0)).<br><strong>Datumsfunktion (Frist):</strong> =Rechnungsdatum+30 für Zahlungsfrist.<br><strong>Einsatzmöglichkeiten:</strong> schnelle Ad-hoc-Analysen, Prototyping.<br><strong>Probleme:</strong> fehlende Versionierung, schwer erkennbare Formelfehler, keine Mehrbenutzerfähigkeit.",
  "checklist": [
    "SVERWEIS mit Beispiel erklärt",
    "WENN-Funktion mit Rabattstaffel-Beispiel erklärt",
    "Datumsfunktion mit Fristbeispiel erklärt",
    "Mind. 2 typische Probleme genannt"
  ]
},
{
  "id": "24a",
  "title": "CRUD zu DDL/DML/DQL",
  "icon": "📊",
  "engine": "field",
  "topicId": 24,
  "checkpointNrs": [
    "24.1"
  ],
  "baseReward": 120,
  "intro": "Ordne den SQL-Befehlen die CRUD-Operation und die Kategorie (DDL/DML/DQL) zu.",
  "build": {
    "columns": [
      "crud",
      "kategorie"
    ],
    "tableData": [
      [
        "Befehl"
      ],
      [
        "CREATE TABLE"
      ],
      [
        "SELECT"
      ],
      [
        "INSERT"
      ],
      [
        "UPDATE"
      ],
      [
        "DELETE"
      ]
    ],
    "rows": [
      {
        "id": "b1",
        "label": "CREATE TABLE",
        "fields": [
          {
            "key": "crud",
            "type": "select",
            "options": [
              "Create",
              "Read",
              "Update",
              "Delete",
              "Keine"
            ],
            "expected": "Keine"
          },
          {
            "key": "kategorie",
            "type": "select",
            "options": [
              "DDL",
              "DML",
              "DQL"
            ],
            "expected": "DDL"
          }
        ]
      },
      {
        "id": "b2",
        "label": "SELECT",
        "fields": [
          {
            "key": "crud",
            "type": "select",
            "options": [
              "Create",
              "Read",
              "Update",
              "Delete",
              "Keine"
            ],
            "expected": "Read"
          },
          {
            "key": "kategorie",
            "type": "select",
            "options": [
              "DDL",
              "DML",
              "DQL"
            ],
            "expected": "DQL"
          }
        ]
      },
      {
        "id": "b3",
        "label": "INSERT",
        "fields": [
          {
            "key": "crud",
            "type": "select",
            "options": [
              "Create",
              "Read",
              "Update",
              "Delete",
              "Keine"
            ],
            "expected": "Create"
          },
          {
            "key": "kategorie",
            "type": "select",
            "options": [
              "DDL",
              "DML",
              "DQL"
            ],
            "expected": "DML"
          }
        ]
      },
      {
        "id": "b4",
        "label": "UPDATE",
        "fields": [
          {
            "key": "crud",
            "type": "select",
            "options": [
              "Create",
              "Read",
              "Update",
              "Delete",
              "Keine"
            ],
            "expected": "Update"
          },
          {
            "key": "kategorie",
            "type": "select",
            "options": [
              "DDL",
              "DML",
              "DQL"
            ],
            "expected": "DML"
          }
        ]
      },
      {
        "id": "b5",
        "label": "DELETE",
        "fields": [
          {
            "key": "crud",
            "type": "select",
            "options": [
              "Create",
              "Read",
              "Update",
              "Delete",
              "Keine"
            ],
            "expected": "Delete"
          },
          {
            "key": "kategorie",
            "type": "select",
            "options": [
              "DDL",
              "DML",
              "DQL"
            ],
            "expected": "DML"
          }
        ]
      }
    ],
    "explanation": "DDL definiert Struktur (CREATE/ALTER/DROP), ohne CRUD-Bezug. DML umfasst INSERT (Create), UPDATE (Update), DELETE (Delete). DQL (SELECT) entspricht Read."
  }
},
{
  "id": "24b",
  "title": "CREATE TABLE & INDEX",
  "icon": "🗄️",
  "engine": "token",
  "topicId": 24,
  "checkpointNrs": [
    "24.2"
  ],
  "baseReward": 130,
  "intro": "Erstelle Tabelle Produkte (ProduktID Primärschlüssel Integer, Name Pflichtfeld VARCHAR(100), Preis DECIMAL(10,2)) und einen Index auf Name.",
  "placeholder": "CREATE TABLE Produkte ( ... );",
  "tokens": [
    {
      "label": "CREATE TABLE",
      "pattern": "create\\s+table"
    },
    {
      "label": "PRIMARY KEY",
      "pattern": "primary\\s+key"
    },
    {
      "label": "NOT NULL",
      "pattern": "not\\s+null"
    },
    {
      "label": "CREATE INDEX",
      "pattern": "create\\s+index"
    }
  ],
  "modelAnswer": "CREATE TABLE Produkte (\n    ProduktID INT PRIMARY KEY,\n    Name VARCHAR(100) NOT NULL,\n    Preis DECIMAL(10,2)\n);\n\nCREATE INDEX idx_produkte_name ON Produkte (Name);"
},
{
  "id": "24c",
  "title": "INSERT und UPDATE",
  "icon": "🗄️",
  "engine": "token",
  "topicId": 24,
  "checkpointNrs": [
    "24.3"
  ],
  "baseReward": 130,
  "intro": "Füge Kunde (KundenID=20, Name='Weber', Ort='Köln') ein UND erhöhe den Betrag aller Bestellungen von KundenID=5 um 10%.",
  "placeholder": "INSERT INTO Kunden ... UPDATE Bestellungen ...",
  "tokens": [
    {
      "label": "INSERT INTO",
      "pattern": "insert\\s+into"
    },
    {
      "label": "VALUES",
      "pattern": "values"
    },
    {
      "label": "UPDATE",
      "pattern": "update"
    },
    {
      "label": "SET",
      "pattern": "\\bset\\b"
    },
    {
      "label": "Betrag*1.1",
      "pattern": "betrag\\s*\\*\\s*1\\.1"
    },
    {
      "label": "WHERE KundenID",
      "pattern": "where\\s+kundenid"
    }
  ],
  "modelAnswer": "INSERT INTO Kunden (KundenID, Name, Ort)\nVALUES (20, 'Weber', 'Köln');\n\nUPDATE Bestellungen\nSET Betrag = Betrag * 1.1\nWHERE KundenID = 5;"
},
{
  "id": "24d",
  "title": "DELETE mit Subquery",
  "icon": "🗄️",
  "engine": "token",
  "topicId": 24,
  "checkpointNrs": [
    "24.4"
  ],
  "baseReward": 130,
  "intro": "Lösche alle Kunden, die keine Bestellungen haben.",
  "placeholder": "DELETE FROM Kunden WHERE ...",
  "tokens": [
    {
      "label": "DELETE FROM",
      "pattern": "delete\\s+from"
    },
    {
      "label": "NOT IN",
      "pattern": "not\\s+in"
    },
    {
      "label": "SELECT in Subquery",
      "pattern": "select\\s+kundenid\\s+from\\s+bestellungen"
    }
  ],
  "modelAnswer": "DELETE FROM Kunden\nWHERE KundenID NOT IN (\n    SELECT KundenID FROM Bestellungen\n);"
},
{
  "id": "24e",
  "title": "Archivierung INSERT INTO SELECT",
  "icon": "🗄️",
  "engine": "token",
  "topicId": 24,
  "checkpointNrs": [
    "24.5"
  ],
  "baseReward": 140,
  "intro": "Archiviere alle Bestellungen vor 2023-01-01 in BestellungenArchiv und lösche sie anschließend aus Bestellungen.",
  "placeholder": "INSERT INTO BestellungenArchiv ... DELETE FROM Bestellungen ...",
  "tokens": [
    {
      "label": "INSERT INTO Archiv",
      "pattern": "insert\\s+into\\s+bestellungenarchiv"
    },
    {
      "label": "SELECT * FROM Bestellungen",
      "pattern": "select\\s+\\*\\s+from\\s+bestellungen"
    },
    {
      "label": "WHERE Datum <",
      "pattern": "where\\s+datum\\s*<"
    },
    {
      "label": "DELETE FROM Bestellungen",
      "pattern": "delete\\s+from\\s+bestellungen"
    }
  ],
  "modelAnswer": "INSERT INTO BestellungenArchiv\nSELECT * FROM Bestellungen\nWHERE Datum < '2023-01-01';\n\nDELETE FROM Bestellungen\nWHERE Datum < '2023-01-01';"
},
{
  "id": "24f",
  "title": "Benutzer & Rechte (GRANT/REVOKE)",
  "icon": "💭",
  "engine": "selfassess",
  "topicId": 24,
  "checkpointNrs": [
    "24.6"
  ],
  "baseReward": 110,
  "intro": "Erläutere, wie ein Benutzer angelegt und ihm Rechte mit GRANT/REVOKE vergeben/entzogen werden.",
  "modelAnswer": "<strong>CREATE USER:</strong> legt neuen Benutzer ohne Rechte an, z. B. CREATE USER 'mitarbeiter'@'localhost' IDENTIFIED BY 'pw'.<br><strong>GRANT:</strong> vergibt Rechte, z. B. GRANT SELECT, INSERT ON Bestellungen TO 'mitarbeiter'@'localhost'.<br><strong>REVOKE:</strong> entzieht Rechte wieder, z. B. REVOKE DELETE ON Bestellungen FROM 'mitarbeiter'@'localhost'.",
  "checklist": [
    "CREATE USER korrekt erläutert",
    "GRANT mit konkreten Rechten erklärt",
    "Unterschied einzelne Rechte vs. ALL PRIVILEGES benannt",
    "REVOKE als Gegenstück korrekt beschrieben"
  ]
},
{
  "id": "25f",
  "title": "SELECT mit LIKE, IN, ORDER BY",
  "icon": "🗄️",
  "engine": "token",
  "topicId": 25,
  "checkpointNrs": [
    "25.1"
  ],
  "baseReward": 120,
  "intro": "Finde alle Kunden, deren Name mit 'M' beginnt UND die aus Hamburg, Berlin oder München kommen, sortiert nach Name.",
  "placeholder": "SELECT * FROM Kunden WHERE ...",
  "tokens": [
    {
      "label": "SELECT",
      "pattern": "select"
    },
    {
      "label": "WHERE",
      "pattern": "where"
    },
    {
      "label": "LIKE 'M%'",
      "pattern": "like\\s*'m%'"
    },
    {
      "label": "IN (...)",
      "pattern": "in\\s*\\("
    },
    {
      "label": "ORDER BY",
      "pattern": "order\\s+by"
    }
  ],
  "modelAnswer": "SELECT * FROM Kunden\nWHERE Name LIKE 'M%'\nAND Ort IN ('Hamburg', 'Berlin', 'München')\nORDER BY Name;"
},
{
  "id": "25g",
  "title": "Monatsauswertung mit Datumsfunktion",
  "icon": "🗄️",
  "engine": "token",
  "topicId": 25,
  "checkpointNrs": [
    "25.4"
  ],
  "baseReward": 120,
  "intro": "Zeige für 2024 pro Monat die Anzahl der Bestellungen und die Summe des Bestellbetrags.",
  "placeholder": "SELECT MONTH(Datum) ...",
  "tokens": [
    {
      "label": "SELECT",
      "pattern": "select"
    },
    {
      "label": "MONTH()",
      "pattern": "month\\s*\\("
    },
    {
      "label": "COUNT",
      "pattern": "count\\s*\\("
    },
    {
      "label": "SUM",
      "pattern": "sum\\s*\\("
    },
    {
      "label": "WHERE YEAR",
      "pattern": "where\\s+year"
    },
    {
      "label": "GROUP BY",
      "pattern": "group\\s+by"
    }
  ],
  "modelAnswer": "SELECT MONTH(Datum) AS Monat, COUNT(*) AS AnzahlBestellungen, SUM(Betrag) AS Summe\nFROM Bestellungen\nWHERE YEAR(Datum) = 2024\nGROUP BY MONTH(Datum);"
},
{
  "id": "25h",
  "title": "Unterabfrage & UNION",
  "icon": "🗄️",
  "engine": "token",
  "topicId": 25,
  "checkpointNrs": [
    "25.5"
  ],
  "baseReward": 140,
  "intro": "a) Finde Kunden mit überdurchschnittlichem Bestellbetrag (Subquery mit AVG als Vergleichswert). b) Kombiniere Bestellungen und BestellungenArchiv per UNION.",
  "placeholder": "SELECT KundenID, AVG(Betrag) ... HAVING ... UNION ...",
  "tokens": [
    {
      "label": "AVG",
      "pattern": "avg\\s*\\("
    },
    {
      "label": "GROUP BY",
      "pattern": "group\\s+by"
    },
    {
      "label": "HAVING",
      "pattern": "having"
    },
    {
      "label": "Subquery mit AVG(Betrag)",
      "pattern": "select\\s+avg\\(betrag\\)\\s+from\\s+bestellungen"
    },
    {
      "label": "UNION",
      "pattern": "union"
    },
    {
      "label": "SELECT auf BestellungenArchiv",
      "pattern": "from\\s+bestellungenarchiv"
    }
  ],
  "modelAnswer": "SELECT KundenID, AVG(Betrag) AS DurchschnittBetrag\nFROM Bestellungen\nGROUP BY KundenID\nHAVING AVG(Betrag) > (SELECT AVG(Betrag) FROM Bestellungen);\n\nSELECT BestellID, KundenID, Datum, Betrag FROM Bestellungen\nUNION\nSELECT BestellID, KundenID, Datum, Betrag FROM BestellungenArchiv;"
}
);
const EXERCISE_INDEX = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
