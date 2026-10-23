(function () {
  "use strict";

  /* ===== À MODIFIER : horaires exceptionnels =====
     Une ligne par date (heure de Paris), séparées par des virgules.
       horaires : ["08:00", "15:00"] pour des horaires modifiés, ou null pour une journée fermée
       note     : phrase affichée telle quelle sur le site (facultatif)
     Exemple :
       { date: "2026-12-04", horaires: ["08:00", "15:00"], note: "Veille de Hanoukah : fermeture à 15h." },
     Le statut « Ouvert / Fermé » et l'encadré orange en haut de page se mettent à jour tout seuls.
     Les horaires habituels se changent dans le tableau de index.html (attributs data-open et data-close). */
  var EXCEPTIONS = [];

  var JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  var SEMAINE = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function minutes(hhmm) {
    var p = hhmm.split(":");
    return (+p[0]) * 60 + (+p[1]);
  }

  function fmt(m) {
    var h = Math.floor(m / 60), mm = m % 60;
    return h + "h" + (mm ? String(mm).padStart(2, "0") : "");
  }

  function majuscule(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* Horaires habituels : lus dans le tableau #hours, qui reste la seule source. */
  var habituels = [null, null, null, null, null, null, null];
  Array.prototype.forEach.call(document.querySelectorAll("#hours tr[data-day]"), function (tr) {
    var jour = +tr.getAttribute("data-day");
    var ouvre = tr.getAttribute("data-open"), ferme = tr.getAttribute("data-close");
    var cell = tr.querySelector("td");
    if (ouvre && ferme) {
      habituels[jour] = [minutes(ouvre), minutes(ferme)];
      cell.textContent = fmt(minutes(ouvre)) + " – " + fmt(minutes(ferme));
      cell.className = "";
    } else {
      habituels[jour] = null;
      cell.textContent = "Fermé";
      cell.className = "off";
    }
  });

  function maintenantParis() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return {
      iso: o.year + "-" + o.month + "-" + o.day,
      jour: SEMAINE[o.weekday],
      minute: (+o.hour) * 60 + (+o.minute)
    };
  }

  function utc(iso) {
    var p = iso.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }

  function ajouterJours(iso, n) {
    var d = utc(iso);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function horairesDu(iso) {
    for (var i = 0; i < EXCEPTIONS.length; i++) {
      if (EXCEPTIONS[i].date === iso) {
        var h = EXCEPTIONS[i].horaires;
        return h ? [minutes(h[0]), minutes(h[1])] : null;
      }
    }
    return habituels[utc(iso).getUTCDay()];
  }

  function statut(iso, minute) {
    var t = horairesDu(iso);
    if (t && minute >= t[0] && minute < t[1]) {
      return t[1] - minute <= 30
        ? { etat: "soon", texte: "Ferme bientôt · à " + fmt(t[1]) }
        : { etat: "open", texte: "Ouvert · ferme à " + fmt(t[1]) };
    }
    if (t && minute < t[0]) return { etat: "off", texte: "Fermé · ouvre à " + fmt(t[0]) };
    for (var i = 1; i <= 14; i++) {
      var d = ajouterJours(iso, i), u = horairesDu(d);
      if (u) {
        var quand = i === 1 ? "demain" : JOURS[utc(d).getUTCDay()] + (i >= 7 ? " prochain" : "");
        return { etat: "off", texte: "Fermé · rouvre " + quand + " à " + fmt(u[0]) };
      }
    }
    return { etat: "off", texte: "Fermé" };
  }

  try {
    var now = maintenantParis();

    var s = statut(now.iso, now.minute);
    document.getElementById("status").setAttribute("data-state", s.etat);
    document.getElementById("status-text").textContent = s.texte;

    var row = document.querySelector('#hours tr[data-day="' + now.jour + '"]');
    if (row) row.className = "today";

    /* Encadré des horaires exceptionnels des 14 prochains jours */
    var fin = ajouterJours(now.iso, 14);
    var proches = EXCEPTIONS.filter(function (e) { return e.date >= now.iso && e.date <= fin; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    if (proches.length) {
      var liste = document.getElementById("exc-list");
      proches.forEach(function (e) {
        var li = document.createElement("li");
        var jour = majuscule(utc(e.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }));
        var detail = e.note || (e.horaires ? fmt(minutes(e.horaires[0])) + " – " + fmt(minutes(e.horaires[1])) : "Fermé");
        li.textContent = jour + " : " + detail;
        liste.appendChild(li);
      });
      document.getElementById("exceptions").hidden = false;
    }
  } catch (e) { /* le texte par défaut reste affiché */ }

  /* Photos : une zone photo n'apparaît que si le fichier existe et se charge. */
  Array.prototype.forEach.call(document.querySelectorAll("[data-photo] img"), function (img) {
    function ok() { img.parentNode.classList.add("ok"); }
    if (img.complete && img.naturalWidth) ok(); else img.addEventListener("load", ok);
  });

  /* Prochaines fêtes : masque les dates passées, met la suivante en avant, compte les jours. */
  function jourLocal(iso) {
    var p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  var auj = new Date(); auj = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate());
  var premiere = true;
  Array.prototype.forEach.call(document.querySelectorAll("#fetes-list .fete"), function (li) {
    var debut = jourLocal(li.getAttribute("data-start")), fin = jourLocal(li.getAttribute("data-end"));
    if (fin < auj) { li.hidden = true; return; }
    var jours = Math.round((debut - auj) / 86400000);
    li.querySelector(".pill").textContent = jours <= 0 ? "En cours" : jours === 1 ? "Demain" : "Dans " + jours + " jours";
    if (premiere) { li.className += " next"; premiere = false; }
  });
})();
