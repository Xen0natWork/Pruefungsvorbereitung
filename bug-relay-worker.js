/* ===========================================================
   Bug-Report-Relay für den FIA Teil 2 Prüfungstrainer
   =========================================================== 

   ZWECK
   Ermöglicht fremden Website-Besuchern (OHNE eigenen GitHub-Account),
   Bug-Reports zu melden, die automatisch als GitHub-Issue im Repo
   landen — ohne Login, ohne zweiten Tab, ohne manuellen Klick auf
   "Submit new issue".

   Das ist auf einer rein statischen GitHub-Pages-Seite nicht direkt
   möglich (die GitHub-API braucht immer einen Auth-Token, und ein
   Token darf NIEMALS im Client-Code/Browser sichtbar sein). Dieser
   kleine Relay-Server (läuft kostenlos auf Cloudflare Workers) hält
   den Token sicher im Hintergrund und reicht nur strukturierte
   Bug-Reports an die GitHub-API weiter.

   SICHERHEIT
   Der verwendete GitHub-Token darf AUSSCHLIESSLICH "Issues: Read and
   write" auf GENAU DIESES EINE Repo erlauben (fine-grained Personal
   Access Token) — damit kann im Zweifel niemand mehr als ein paar
   Issues anlegen, selbst wenn der Worker-Code irgendwie missbraucht
   würde. Kein Zugriff auf Code, Branches, Settings, andere Repos etc.

   EINRICHTUNG (einmalig, ca. 10 Minuten)
   ---------------------------------------------------------------
   1. GitHub Fine-grained Token erstellen:
      - https://github.com/settings/personal-access-tokens/new
      - Resource owner: Xen0natWork
      - Repository access: "Only select repositories" → Pruefungsvorbereitung
      - Permissions → Repository permissions → "Issues": "Read and write"
        (alle anderen Berechtigungen auf "No access" lassen)
      - Token generieren, Wert KOPIEREN (wird nur einmal angezeigt)

   2. Cloudflare-Account erstellen (kostenlos, keine Kreditkarte nötig):
      - https://dash.cloudflare.com/sign-up

   3. Worker anlegen:
      - Im Cloudflare-Dashboard: "Workers & Pages" → "Create" → "Create Worker"
      - Namen vergeben (z. B. "bug-relay-pruefungsvorbereitung")
      - "Deploy" klicken (Platzhalter-Code wird erstmal deployed)
      - Danach "Edit code" → den KOMPLETTEN Inhalt dieser Datei
        (ab "export default") in den Editor einfügen → "Deploy"

   4. Secret setzen (Token sicher hinterlegen):
      - Im Worker: "Settings" → "Variables and Secrets" → "Add"
      - Type: "Secret", Name: GITHUB_TOKEN, Value: <der Token aus Schritt 1>
      - Speichern (Worker wird automatisch neu deployed)

   5. Worker-URL kopieren:
      - Oben im Worker-Dashboard steht die URL, z. B.
        https://bug-relay-pruefungsvorbereitung.DEIN-SUBDOMAIN.workers.dev
      - Diese URL in webapp/app.js bei BUG_RELAY_URL eintragen und
        die Seite neu deployen (git push).

   Danach landen alle Bug-Reports – auch von Besuchern ohne GitHub-
   Account – automatisch als Issues im Repo.
   =========================================================== */

const ALLOWED_ORIGINS = [
  'https://xen0natwork.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const GITHUB_REPO = 'Xen0natWork/Pruefungsvorbereitung';

const CATEGORY_LABELS = {
  aufgabe: '📝 Aufgaben-Fehler',
  ui: '🎨 UI/Darstellung',
  sonstiges: '❓ Sonstiges',
};

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }

    if (!env.GITHUB_TOKEN) {
      return jsonResponse({ error: 'Server misconfigured: GITHUB_TOKEN fehlt' }, 500, origin);
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'Ungültiges JSON' }, 400, origin);
    }

    // Honeypot: unsichtbares Feld, das echte Nutzer nie befüllen.
    // Bots, die alle Felder blind ausfüllen, tappen hier rein.
    if (data.website) {
      return jsonResponse({ success: true, issueUrl: null }, 200, origin);
    }

    const category = (data.category || 'sonstiges').toString().slice(0, 40);
    const description = (data.description || '').toString().trim().slice(0, 4000);
    const context = (data.context || '').toString().slice(0, 4000);

    if (!description) {
      return jsonResponse({ error: 'Beschreibung fehlt' }, 400, origin);
    }

    const categoryLabel = CATEGORY_LABELS[category] || category;
    const title = `[${categoryLabel}] ${description.slice(0, 60)}`;
    const body = [
      '**Beschreibung:**',
      description,
      '',
      '**Kontext:**',
      '```',
      context,
      '```',
      '',
      `**Kategorie:** ${category}`,
      '**Gemeldet von:** anonymer Besucher (Bug-Tool, ohne eigenen GitHub-Account)',
      `**Zeitpunkt:** ${new Date().toISOString()}`,
    ].join('\n');

    let ghResponse;
    try {
      ghResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'pruefungsvorbereitung-bug-relay',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body }),
      });
    } catch (e) {
      return jsonResponse({ error: 'Netzwerkfehler beim Erreichen von GitHub' }, 502, origin);
    }

    if (!ghResponse.ok) {
      const errText = await ghResponse.text();
      return jsonResponse({ error: 'GitHub-API-Fehler', detail: errText }, 502, origin);
    }

    const issue = await ghResponse.json();
    return jsonResponse({ success: true, issueUrl: issue.html_url, issueNumber: issue.number }, 200, origin);
  },
};
