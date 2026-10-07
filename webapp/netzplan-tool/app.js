/* app.js — UI-Logik fuer das Netzplan-Tool (nutzt netzplan-core.js fuer die Berechnung) */
(function () {
  "use strict";

  // ---------- Konstanten (Darstellung) ----------
  var BOX_W = 170, BOX_H = 100;
  var ROW1_H = 26, ROW3_H = 26;
  var COL_W = BOX_W / 3;
  var H_GAP = 80, V_GAP = 26, MARGIN = 40;
  var EPS = 1e-3;

  // ---------- State ----------
  var activities = [];      // [{id, code, name, duration, preds:[{id,lag}]}]
  var positions = {};       // id -> {x, y, manual}
  var nextId = 1;
  var editingId = null;
  var formPreds = {};       // id -> lag  (nur fuer aktuell geöffnetes Formular)
  var lastResult = null;

  var nodeGroupEls = {};    // id -> <g>
  var edgeRecords = [];     // [{predId, succId, lag, pathEl, labelEl}]

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var form = $("activityForm");
  var inpCode = $("inpCode"), inpName = $("inpName"), inpDuration = $("inpDuration");
  var predList = $("predList");
  var editingIdInput = $("editingId");
  var formTitle = $("formTitle");
  var tableBody = $("activityTableBody");
  var projectInfo = $("projectInfo");
  var svg = $("diagram");
  var errorBox = $("errorBox");

  // ---------- Hilfsfunktionen ----------
  function svgEl(tag, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    }
    return el;
  }

  function text(content, cls, x, y) {
    var t = svgEl("text", { x: x, y: y, class: cls, "text-anchor": "middle" });
    t.textContent = content;
    return t;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }
  function clearError() {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
  }

  function getActivity(id) {
    return activities.find(function (a) { return a.id === id; });
  }

  function truncate(str, max) {
    if (!str) return "";
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
  }

  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---------- Formular: Vorgänger-Auswahl ----------
  function renderPredList() {
    predList.innerHTML = "";
    var others = activities.filter(function (a) { return a.id !== editingId; });
    if (!others.length) {
      var empty = document.createElement("div");
      empty.className = "pred-empty";
      empty.textContent = "Noch keine anderen Vorgänge vorhanden.";
      predList.appendChild(empty);
      return;
    }
    others.forEach(function (a) {
      var row = document.createElement("div");
      row.className = "pred-row";

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "pred_" + a.id;
      checkbox.checked = formPreds.hasOwnProperty(a.id);

      var label = document.createElement("label");
      label.setAttribute("for", checkbox.id);
      label.textContent = a.code + (a.name ? " – " + truncate(a.name, 24) : "");

      var lagInput = document.createElement("input");
      lagInput.type = "number";
      lagInput.step = "0.5";
      lagInput.min = "0";
      lagInput.title = "Mindestabstand (Zeitabstand) in Zeiteinheiten";
      lagInput.value = formPreds.hasOwnProperty(a.id) ? formPreds[a.id] : 0;
      lagInput.disabled = !checkbox.checked;

      checkbox.addEventListener("change", function () {
        if (checkbox.checked) {
          formPreds[a.id] = parseFloat(lagInput.value) || 0;
          lagInput.disabled = false;
        } else {
          delete formPreds[a.id];
          lagInput.disabled = true;
        }
      });
      lagInput.addEventListener("input", function () {
        if (checkbox.checked) formPreds[a.id] = parseFloat(lagInput.value) || 0;
      });

      row.appendChild(checkbox);
      row.appendChild(label);
      row.appendChild(lagInput);
      predList.appendChild(row);
    });
  }

  function resetForm() {
    editingId = null;
    editingIdInput.value = "";
    formTitle.textContent = "Neuen Vorgang anlegen";
    inpCode.value = "";
    inpName.value = "";
    inpDuration.value = "1";
    formPreds = {};
    renderPredList();
    inpCode.focus();
  }

  function loadActivityIntoForm(a) {
    editingId = a.id;
    editingIdInput.value = a.id;
    formTitle.textContent = "Vorgang bearbeiten: " + a.code;
    inpCode.value = a.code;
    inpName.value = a.name || "";
    inpDuration.value = a.duration;
    formPreds = {};
    (a.preds || []).forEach(function (p) { formPreds[p.id] = p.lag || 0; });
    renderPredList();
  }

  // ---------- Speichern / Löschen ----------
  function handleFormSubmit(e) {
    e.preventDefault();
    clearError();

    var code = inpCode.value.trim();
    var name = inpName.value.trim();
    var duration = parseFloat(inpDuration.value);

    if (!code) { showError("Bitte einen Code für den Vorgang angeben."); return; }
    if (isNaN(duration) || duration < 0) { showError("Die Dauer muss eine Zahl ≥ 0 sein."); return; }

    var duplicate = activities.some(function (a) {
      return a.id !== editingId && a.code.toLowerCase() === code.toLowerCase();
    });
    if (duplicate) { showError("Der Code \"" + code + "\" wird bereits verwendet. Bitte einen eindeutigen Code wählen."); return; }

    var preds = Object.keys(formPreds).map(function (idStr) {
      return { id: Number(idStr), lag: Number(formPreds[idStr]) || 0 };
    });

    var id = editingId !== null ? editingId : nextId++;
    var candidate = { id: id, code: code, name: name, duration: duration, preds: preds };

    var testSet = activities.filter(function (a) { return a.id !== id; }).concat([candidate]);
    var testResult = NetzplanCore.calculate(testSet);
    if (testResult.cycle) {
      showError(testResult.error);
      if (editingId === null) nextId--; // id wieder freigeben
      return;
    }

    if (editingId !== null) {
      var idx = activities.findIndex(function (a) { return a.id === id; });
      activities[idx] = candidate;
    } else {
      activities.push(candidate);
      if (!positions[id]) positions[id] = { x: 0, y: 0, manual: false };
    }

    resetForm();
    recalcAndRender();
  }

  function deleteActivity(id) {
    var a = getActivity(id);
    if (!a) return;
    if (!window.confirm("Vorgang \"" + a.code + "\" wirklich löschen?")) return;
    activities = activities.filter(function (x) { return x.id !== id; });
    activities.forEach(function (x) {
      x.preds = x.preds.filter(function (p) { return p.id !== id; });
    });
    delete positions[id];
    delete nodeGroupEls[id];
    if (editingId === id) resetForm();
    recalcAndRender();
  }

  // ---------- Berechnung + Rendering orchestrieren ----------
  function recalcAndRender() {
    lastResult = NetzplanCore.calculate(activities);
    if (lastResult.error) {
      showError(lastResult.error);
    } else {
      clearError();
    }
    renderTable();
    renderProjectInfo();
    renderDiagram();
  }

  // ---------- Tabelle ----------
  function renderTable() {
    tableBody.innerHTML = "";
    var sorted = activities.slice().sort(function (a, b) { return a.code.localeCompare(b.code); });
    sorted.forEach(function (a) {
      var r = (lastResult && lastResult.results[a.id]) || {};
      var tr = document.createElement("tr");
      if (r.critical) tr.className = "critical";

      var predStr = (a.preds || []).map(function (p) {
        var pa = getActivity(p.id);
        var code = pa ? pa.code : "?";
        return p.lag ? code + "(+" + p.lag + ")" : code;
      }).join(", ");

      function td(val) {
        var cell = document.createElement("td");
        cell.textContent = val === undefined || val === null ? "" : val;
        return cell;
      }

      tr.appendChild(td(a.code));
      tr.appendChild(td(a.name));
      tr.appendChild(td(a.duration));
      tr.appendChild(td(r.FAZ));
      tr.appendChild(td(r.FEZ));
      tr.appendChild(td(r.SAZ));
      tr.appendChild(td(r.SEZ));
      tr.appendChild(td(r.GP));
      tr.appendChild(td(r.FP));
      tr.appendChild(td(predStr || "–"));

      var actionsTd = document.createElement("td");
      var editBtn = document.createElement("button");
      editBtn.className = "edit";
      editBtn.textContent = "✎";
      editBtn.title = "Bearbeiten";
      editBtn.addEventListener("click", function () { loadActivityIntoForm(a); });
      var delBtn = document.createElement("button");
      delBtn.className = "del";
      delBtn.textContent = "🗑";
      delBtn.title = "Löschen";
      delBtn.addEventListener("click", function () { deleteActivity(a.id); });
      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(delBtn);
      tr.appendChild(actionsTd);

      tableBody.appendChild(tr);
    });
  }

  // ---------- Projektinfo ----------
  function renderProjectInfo() {
    if (!activities.length) {
      projectInfo.innerHTML = "<div>Noch keine Vorgänge angelegt.</div>";
      return;
    }
    if (!lastResult || lastResult.error) {
      projectInfo.innerHTML = "<div class='hint'>Berechnung nicht möglich (siehe Fehlermeldung oben).</div>";
      return;
    }
    var critCount = activities.filter(function (a) { return lastResult.results[a.id].critical; }).length;
    var html = "";
    html += "<div><strong>Projektdauer:</strong> " + lastResult.projectDuration + " Zeiteinheiten</div>";
    html += "<div><strong>Anzahl Vorgänge:</strong> " + activities.length + "</div>";
    html += "<div><strong>Kritische Vorgänge:</strong> " + critCount + "</div>";
    if (lastResult.criticalPaths && lastResult.criticalPaths.length) {
      html += "<div class='critical-paths'><strong>Kritischer Pfad" + (lastResult.criticalPaths.length > 1 ? "e" : "") + ":</strong><br>";
      html += lastResult.criticalPaths.map(function (path) {
        var codes = path.map(function (id) { return getActivity(id).code; });
        return "<code>" + codes.join(" → ") + "</code>";
      }).join("<br>");
      html += "</div>";
    }
    projectInfo.innerHTML = html;
  }

  // ---------- Layout ----------
  function computeAutoLayout(forceAll) {
    var order = (lastResult && !lastResult.error) ? lastResult.order : activities.map(function (a) { return a.id; });
    var level = {};
    order.forEach(function (id) {
      var a = getActivity(id);
      var preds = a.preds || [];
      var lvl = 0;
      preds.forEach(function (p) {
        if (level[p.id] !== undefined && level[p.id] + 1 > lvl) lvl = level[p.id] + 1;
      });
      level[id] = lvl;
    });

    var byLevel = {};
    order.forEach(function (id) {
      var lvl = level[id];
      byLevel[lvl] = byLevel[lvl] || [];
      byLevel[lvl].push(id);
    });

    Object.keys(byLevel).forEach(function (lvlKey) {
      var ids = byLevel[lvlKey];
      var lvl = Number(lvlKey);
      ids.forEach(function (id, idx) {
        var existing = positions[id];
        if (existing && existing.manual && !forceAll) return;
        positions[id] = {
          x: MARGIN + lvl * (BOX_W + H_GAP),
          y: MARGIN + idx * (BOX_H + V_GAP),
          manual: false
        };
      });
    });
  }

  // ---------- Diagramm ----------
  function isCriticalEdge(predId, succId, lag) {
    if (!lastResult || lastResult.error) return false;
    var rp = lastResult.results[predId], rs = lastResult.results[succId];
    if (!rp || !rs || !rp.critical || !rs.critical) return false;
    return Math.abs(rp.FEZ + (lag || 0) - rs.FAZ) < EPS;
  }

  function edgeGeometry(predId, succId) {
    var p = positions[predId], s = positions[succId];
    var px = p.x + BOX_W, py = p.y + BOX_H / 2;
    var sx = s.x, sy = s.y + BOX_H / 2;
    var cOffset = Math.max(30, H_GAP / 1.6);
    var d = "M " + px + "," + py + " C " + (px + cOffset) + "," + py + " " + (sx - cOffset) + "," + sy + " " + sx + "," + sy;
    var mx = (px + sx) / 2, my = (py + sy) / 2;
    return { d: d, mx: mx, my: my };
  }

  function updateEdge(rec) {
    var geo = edgeGeometry(rec.predId, rec.succId);
    rec.pathEl.setAttribute("d", geo.d);
    if (rec.labelEl) {
      rec.labelEl.setAttribute("x", geo.mx);
      rec.labelEl.setAttribute("y", geo.my - 4);
    }
  }

  function buildNodeGroup(a) {
    var r = (lastResult && lastResult.results[a.id]) || {};
    var critical = !!r.critical;
    var g = svgEl("g", { class: "node-box" + (critical ? " critical" : ""), transform: "translate(" + positions[a.id].x + "," + positions[a.id].y + ")" });

    g.appendChild(svgEl("rect", { class: "outer", x: 0, y: 0, width: BOX_W, height: BOX_H, rx: 3 }));

    // Trennlinien
    g.appendChild(svgEl("line", { x1: 0, y1: ROW1_H, x2: BOX_W, y2: ROW1_H, class: "divider-line", stroke: "#2c3e50", "stroke-width": 0.8 }));
    g.appendChild(svgEl("line", { x1: 0, y1: BOX_H - ROW3_H, x2: BOX_W, y2: BOX_H - ROW3_H, stroke: "#2c3e50", "stroke-width": 0.8 }));
    g.appendChild(svgEl("line", { x1: COL_W, y1: 0, x2: COL_W, y2: ROW1_H, stroke: "#2c3e50", "stroke-width": 0.6 }));
    g.appendChild(svgEl("line", { x1: 2 * COL_W, y1: 0, x2: 2 * COL_W, y2: ROW1_H, stroke: "#2c3e50", "stroke-width": 0.6 }));
    g.appendChild(svgEl("line", { x1: COL_W, y1: BOX_H - ROW3_H, x2: COL_W, y2: BOX_H, stroke: "#2c3e50", "stroke-width": 0.6 }));
    g.appendChild(svgEl("line", { x1: 2 * COL_W, y1: BOX_H - ROW3_H, x2: 2 * COL_W, y2: BOX_H, stroke: "#2c3e50", "stroke-width": 0.6 }));

    function cell(label, value, colIdx, rowY) {
      var cx = colIdx * COL_W + COL_W / 2;
      g.appendChild(text(label, "label-small", cx, rowY + 9));
      g.appendChild(text(value === undefined ? "" : value, "value", cx, rowY + 20));
    }

    cell("FAZ", r.FAZ, 0, 0);
    cell("D", a.duration, 1, 0);
    cell("FEZ", r.FEZ, 2, 0);

    g.appendChild(text(a.code, "code", BOX_W / 2, ROW1_H + 20));
    g.appendChild(text(truncate(a.name, 22), "name", BOX_W / 2, ROW1_H + 36));

    cell("SAZ", r.SAZ, 0, BOX_H - ROW3_H);
    cell("GP", r.GP, 1, BOX_H - ROW3_H);
    cell("SEZ", r.SEZ, 2, BOX_H - ROW3_H);

    attachDrag(g, a.id);
    return g;
  }

  function attachDrag(g, id) {
    var dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
    g.addEventListener("pointerdown", function (e) {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      origX = positions[id].x; origY = positions[id].y;
      g.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    g.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      positions[id] = { x: origX + dx, y: origY + dy, manual: true };
      g.setAttribute("transform", "translate(" + positions[id].x + "," + positions[id].y + ")");
      edgeRecords.forEach(function (rec) {
        if (rec.predId === id || rec.succId === id) updateEdge(rec);
      });
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { g.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      fitCanvas();
    }
    g.addEventListener("pointerup", endDrag);
    g.addEventListener("pointercancel", endDrag);
  }

  function fitCanvas() {
    var maxX = MARGIN, maxY = MARGIN;
    activities.forEach(function (a) {
      var p = positions[a.id];
      if (!p) return;
      if (p.x + BOX_W > maxX) maxX = p.x + BOX_W;
      if (p.y + BOX_H > maxY) maxY = p.y + BOX_H;
    });
    var w = maxX + MARGIN, h = maxY + MARGIN;
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  }

  function renderDiagram() {
    svg.innerHTML = "";
    nodeGroupEls = {};
    edgeRecords = [];

    if (!activities.length) {
      svg.setAttribute("width", 600);
      svg.setAttribute("height", 200);
      svg.setAttribute("viewBox", "0 0 600 200");
      var hint = text("Noch keine Vorgänge – links einen Vorgang anlegen oder Beispiel laden.", "hint-text", 300, 100);
      hint.setAttribute("fill", "#889");
      hint.setAttribute("font-size", "14");
      hint.setAttribute("font-family", "Segoe UI, Arial, sans-serif");
      svg.appendChild(hint);
      return;
    }

    computeAutoLayout(false);

    var defs = svgEl("defs");
    defs.innerHTML =
      '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="#7f8c9b"></path></marker>' +
      '<marker id="arrowCritical" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="#c0392b"></path></marker>';
    svg.appendChild(defs);

    var edgeLayer = svgEl("g", { class: "edge-layer" });
    var nodeLayer = svgEl("g", { class: "node-layer" });
    svg.appendChild(edgeLayer);
    svg.appendChild(nodeLayer);

    activities.forEach(function (a) {
      (a.preds || []).forEach(function (p) {
        if (!getActivity(p.id)) return;
        var crit = isCriticalEdge(p.id, a.id, p.lag);
        var geo = edgeGeometry(p.id, a.id);
        var path = svgEl("path", {
          class: "edge-path" + (crit ? " critical" : ""),
          d: geo.d,
          "marker-end": crit ? "url(#arrowCritical)" : "url(#arrow)"
        });
        edgeLayer.appendChild(path);
        var labelEl = null;
        if (p.lag) {
          labelEl = text("+" + p.lag, "edge-label" + (crit ? " critical" : ""), geo.mx, geo.my - 4);
          edgeLayer.appendChild(labelEl);
        }
        edgeRecords.push({ predId: p.id, succId: a.id, lag: p.lag, pathEl: path, labelEl: labelEl });
      });
    });

    activities.forEach(function (a) {
      var g = buildNodeGroup(a);
      nodeGroupEls[a.id] = g;
      nodeLayer.appendChild(g);
    });

    fitCanvas();
  }

  // ---------- Beispiel ----------
  function loadExample() {
    if (activities.length && !window.confirm("Aktuelles Projekt verwerfen und Beispiel laden?")) return;
    activities = [];
    positions = {};
    nextId = 1;
    var def = [
      { code: "A", name: "Baugrube ausheben", duration: 2, preds: [] },
      { code: "B", name: "Material bestellen", duration: 4, preds: [] },
      { code: "C", name: "Fundament gießen", duration: 3, preds: ["A"] },
      { code: "D", name: "Rohbau Keller", duration: 2, preds: ["A", "B"] },
      { code: "E", name: "Rohbau Erdgeschoss", duration: 5, preds: ["C", "D"] },
      { code: "F", name: "Elektroinstallation vorbereiten", duration: 1, preds: ["D"] },
      { code: "G", name: "Dachstuhl errichten", duration: 3, preds: ["E", "F"] }
    ];
    var codeToId = {};
    def.forEach(function (d) {
      var id = nextId++;
      codeToId[d.code] = id;
      activities.push({ id: id, code: d.code, name: d.name, duration: d.duration, preds: [] });
    });
    def.forEach(function (d) {
      var a = getActivity(codeToId[d.code]);
      a.preds = d.preds.map(function (c) { return { id: codeToId[c], lag: 0 }; });
    });
    resetForm();
    recalcAndRender();
    computeAutoLayout(true);
    renderDiagram();
  }

  function newProject() {
    if (activities.length && !window.confirm("Alle Vorgänge löschen und ein neues Projekt beginnen?")) return;
    activities = [];
    positions = {};
    nextId = 1;
    resetForm();
    recalcAndRender();
  }

  // ---------- Export / Import ----------
  function exportJSON() {
    var data = { activities: activities, positions: positions, nextId: nextId };
    downloadFile("netzplan.json", JSON.stringify(data, null, 2), "application/json");
  }

  function importJSON(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data.activities)) throw new Error("Ungültiges Format: 'activities' fehlt.");
        activities = data.activities;
        positions = data.positions || {};
        nextId = data.nextId || (Math.max(0, ...activities.map(function (a) { return a.id; })) + 1);
        resetForm();
        recalcAndRender();
      } catch (err) {
        showError("Import fehlgeschlagen: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  var SVG_EXPORT_CSS =
    "text{font-family:'Segoe UI',Arial,sans-serif;}" +
    ".node-box rect.outer{fill:#fff;stroke:#2c3e50;stroke-width:1.3;}" +
    ".node-box.critical rect.outer{stroke:#c0392b;stroke-width:2.2;}" +
    ".node-box .label-small{font-size:8px;fill:#7a8591;}" +
    ".node-box .value{font-size:12px;font-weight:600;fill:#1b2733;}" +
    ".node-box.critical .value{fill:#c0392b;}" +
    ".node-box .code{font-size:13px;font-weight:700;fill:#1b2733;}" +
    ".node-box.critical .code{fill:#c0392b;}" +
    ".node-box .name{font-size:10px;fill:#46525e;}" +
    ".edge-path{fill:none;stroke:#7f8c9b;stroke-width:1.4;}" +
    ".edge-path.critical{stroke:#c0392b;stroke-width:2.4;}" +
    ".edge-label{font-size:9px;fill:#556;}" +
    ".edge-label.critical{fill:#c0392b;font-weight:600;}";

  function exportSVG() {
    var w = svg.getAttribute("width") || 600, h = svg.getAttribute("height") || 200;
    var clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    var bg = svgEl("rect", { x: 0, y: 0, width: w, height: h, fill: "#ffffff" });
    clone.insertBefore(bg, clone.firstChild);

    var style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = SVG_EXPORT_CSS;
    clone.insertBefore(style, clone.firstChild);

    var serializer = new XMLSerializer();
    var source = '<?xml version="1.0" standalone="no"?>\r\n' + serializer.serializeToString(clone);
    downloadFile("netzplan.svg", source, "image/svg+xml");
  }

  // ---------- Event-Bindung ----------
  form.addEventListener("submit", handleFormSubmit);
  $("btnCancelEdit").addEventListener("click", resetForm);
  $("btnExample").addEventListener("click", loadExample);
  $("btnNew").addEventListener("click", newProject);
  $("btnAutoLayout").addEventListener("click", function () {
    computeAutoLayout(true);
    renderDiagram();
  });
  $("btnExportJSON").addEventListener("click", exportJSON);
  $("btnImportJSON").addEventListener("click", function () { $("fileImport").click(); });
  $("fileImport").addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = "";
  });
  $("btnExportSVG").addEventListener("click", exportSVG);
  $("btnPrint").addEventListener("click", function () { window.print(); });
  $("btnHelp").addEventListener("click", function () { $("helpOverlay").classList.remove("hidden"); });
  $("btnCloseHelp").addEventListener("click", function () { $("helpOverlay").classList.add("hidden"); });
  $("helpOverlay").addEventListener("click", function (e) {
    if (e.target.id === "helpOverlay") $("helpOverlay").classList.add("hidden");
  });

  // ---------- Start ----------
  resetForm();
  recalcAndRender();
})();
