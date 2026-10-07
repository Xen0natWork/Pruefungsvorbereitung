/*
 * netzplan-core.js
 * Reine Berechnungslogik fuer einen Vorgangsknoten-Netzplan nach DIN 69900.
 * Keine DOM-Abhaengigkeiten -> kann im Browser UND in Node.js (Tests) genutzt werden.
 *
 * Datenmodell einer Aktivitaet (Vorgang):
 *   {
 *     id: number,
 *     code: string,            // kurzer eindeutiger Bezeichner, z.B. "A"
 *     name: string,            // Klartext-Bezeichnung
 *     duration: number,        // Dauer (>= 0)
 *     preds: [{ id: number, lag: number }]  // Vorgaenger + Mindestabstand (Normalfolge mit Abstand)
 *   }
 *
 * Ergebnis von calculate():
 *   {
 *     error: string|null,
 *     cycle: boolean,
 *     cycleNodeIds: number[],
 *     order: number[],                 // topologische Reihenfolge
 *     succ: Map<id, [{id, lag}]>,       // Nachfolgerliste je Vorgang
 *     projectDuration: number,
 *     results: {
 *       [id]: { FAZ, FEZ, SAZ, SEZ, GP, FP, critical }
 *     },
 *     criticalPaths: string[][]         // Ketten kritischer Vorgangs-IDs (Start -> Ende)
 *   }
 */
(function (root) {
  "use strict";

  var EPS = 1e-6;

  function calculate(activities) {
    var byId = {};
    activities.forEach(function (a) {
      byId[a.id] = a;
    });

    var succ = {}; // id -> [{id, lag}]
    var inDegree = {};
    activities.forEach(function (a) {
      succ[a.id] = succ[a.id] || [];
      inDegree[a.id] = 0;
    });

    activities.forEach(function (a) {
      (a.preds || []).forEach(function (p) {
        if (byId[p.id] === undefined) return; // defensiv: unbekannte Vorgaenger ignorieren
        succ[p.id].push({ id: a.id, lag: Number(p.lag) || 0 });
        inDegree[a.id] += 1;
      });
    });

    // Kahn's Algorithmus fuer topologische Sortierung + Zyklenerkennung
    var queue = [];
    activities.forEach(function (a) {
      if (inDegree[a.id] === 0) queue.push(a.id);
    });
    var order = [];
    var remainingInDegree = Object.assign({}, inDegree);
    var qi = 0;
    while (qi < queue.length) {
      var id = queue[qi++];
      order.push(id);
      succ[id].forEach(function (edge) {
        remainingInDegree[edge.id] -= 1;
        if (remainingInDegree[edge.id] === 0) queue.push(edge.id);
      });
    }

    if (order.length !== activities.length) {
      var cycleNodeIds = activities
        .map(function (a) {
          return a.id;
        })
        .filter(function (id) {
          return order.indexOf(id) === -1;
        });
      return {
        error: "Zyklus erkannt: Die Vorgangsfolge enthaelt einen Kreis (" +
          cycleNodeIds.map(function (id) { return (byId[id] && byId[id].code) || id; }).join(", ") +
          "). Ein Netzplan darf keine Kreise enthalten.",
        cycle: true,
        cycleNodeIds: cycleNodeIds,
        order: order,
        succ: succ,
        projectDuration: 0,
        results: {},
        criticalPaths: []
      };
    }

    var FAZ = {}, FEZ = {}, SAZ = {}, SEZ = {};

    // Vorwaertsrechnung
    order.forEach(function (id) {
      var a = byId[id];
      var preds = a.preds || [];
      var start = 0;
      preds.forEach(function (p) {
        if (FEZ[p.id] === undefined) return;
        var candidate = FEZ[p.id] + (Number(p.lag) || 0);
        if (candidate > start) start = candidate;
      });
      FAZ[id] = start;
      FEZ[id] = start + (Number(a.duration) || 0);
    });

    var endNodes = activities.filter(function (a) {
      return succ[a.id].length === 0;
    });
    var projectDuration = 0;
    (endNodes.length ? endNodes : activities).forEach(function (a) {
      if (FEZ[a.id] > projectDuration) projectDuration = FEZ[a.id];
    });

    // Rueckwaertsrechnung (umgekehrte topologische Reihenfolge)
    var revOrder = order.slice().reverse();
    revOrder.forEach(function (id) {
      var a = byId[id];
      var edges = succ[id];
      var end = projectDuration;
      edges.forEach(function (e) {
        if (SAZ[e.id] === undefined) return;
        var candidate = SAZ[e.id] - (Number(e.lag) || 0);
        if (edges.indexOf(e) === 0) end = candidate;
        else if (candidate < end) end = candidate;
      });
      if (edges.length === 0) end = projectDuration;
      SEZ[id] = end;
      SAZ[id] = end - (Number(a.duration) || 0);
    });

    var results = {};
    activities.forEach(function (a) {
      var gp = SAZ[a.id] - FAZ[a.id];
      var edges = succ[a.id];
      var fp;
      if (edges.length === 0) {
        fp = gp;
      } else {
        fp = Infinity;
        edges.forEach(function (e) {
          var candidate = FAZ[e.id] - (Number(e.lag) || 0) - FEZ[a.id];
          if (candidate < fp) fp = candidate;
        });
      }
      results[a.id] = {
        FAZ: round2(FAZ[a.id]),
        FEZ: round2(FEZ[a.id]),
        SAZ: round2(SAZ[a.id]),
        SEZ: round2(SEZ[a.id]),
        GP: round2(gp),
        FP: round2(fp),
        critical: Math.abs(gp) < EPS
      };
    });

    var criticalPaths = findCriticalPaths(activities, byId, succ, results);

    return {
      error: null,
      cycle: false,
      cycleNodeIds: [],
      order: order,
      succ: succ,
      projectDuration: round2(projectDuration),
      results: results,
      criticalPaths: criticalPaths
    };
  }

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function findCriticalPaths(activities, byId, succ, results) {
    var criticalIds = activities
      .map(function (a) { return a.id; })
      .filter(function (id) { return results[id].critical; });
    if (!criticalIds.length) return [];

    var critSet = {};
    criticalIds.forEach(function (id) { critSet[id] = true; });

    function isCriticalEdge(fromId, toId, lag) {
      if (!critSet[fromId] || !critSet[toId]) return false;
      return Math.abs(results[fromId].FEZ + (Number(lag) || 0) - results[toId].FAZ) < EPS;
    }

    var starts = criticalIds.filter(function (id) {
      var preds = byId[id].preds || [];
      return !preds.some(function (p) {
        return isCriticalEdge(p.id, id, p.lag);
      });
    });

    var paths = [];
    var MAX_PATHS = 25;

    function dfs(id, pathSoFar) {
      if (paths.length >= MAX_PATHS) return;
      var nextCritEdges = succ[id].filter(function (e) {
        return isCriticalEdge(id, e.id, e.lag);
      });
      if (nextCritEdges.length === 0) {
        paths.push(pathSoFar.concat(id));
        return;
      }
      nextCritEdges.forEach(function (e) {
        dfs(e.id, pathSoFar.concat(id));
      });
    }

    starts.forEach(function (startId) {
      dfs(startId, []);
    });

    return paths;
  }

  var NetzplanCore = {
    calculate: calculate
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = NetzplanCore;
  } else {
    root.NetzplanCore = NetzplanCore;
  }
})(typeof window !== "undefined" ? window : globalThis);
