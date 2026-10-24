/* Shemtov Foch : fonctions du site. Tout le contenu reste lisible sans ce script ;
   il ajoute le statut en direct, les horaires du jour, le menu mobile, la copie d'adresse,
   la carte Google Maps sur demande et la navigation entre les rayons.
   Les horaires et exceptions viennent de assets/donnees.js, généré depuis donnees.json. */
(function () {
  "use strict";

  document.documentElement.classList.add("js");
  var D = window.SHEMTOV || { horaires: [], exceptions: [] };
  var reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
  var JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  var SEMAINE = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function minutes(hhmm) { var p = hhmm.split(":"); return (+p[0]) * 60 + (+p[1]); }
  function fmt(m) { var h = Math.floor(m / 60), mm = m % 60; return h + "h" + (mm ? String(mm).padStart(2, "0") : ""); }
  function utc(iso) { var p = iso.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function ajouterJours(iso, n) { var d = utc(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function chaque(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  /* ---------- Horaires : statut en direct, à l'heure de Paris ---------- */
  var habituels = (D.horaires || []).map(function (h) { return h ? [minutes(h[0]), minutes(h[1])] : null; });
  var exceptions = D.exceptions || [];

  function horairesDu(iso) {
    for (var i = 0; i < exceptions.length; i++) {
      if (exceptions[i].date === iso) {
        var h = exceptions[i].horaires;
        return h ? [minutes(h[0]), minutes(h[1])] : null;
      }
    }
    return habituels[utc(iso).getUTCDay()] || null;
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

  function maintenantParis() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return { iso: o.year + "-" + o.month + "-" + o.day, jour: SEMAINE[o.weekday], minute: (+o.hour) * 60 + (+o.minute) };
  }

  function majHoraires() {
    try {
      var now = maintenantParis();
      var s = statut(now.iso, now.minute);
      chaque("[data-status]", function (el) {
        el.setAttribute("data-state", s.etat);
        var t = el.querySelector("[data-status-text]");
        if (t && t.textContent !== s.texte) t.textContent = s.texte;
      });
      var auj = horairesDu(now.iso);
      chaque("[data-aujourdhui]", function (el) {
        el.textContent = auj ? fmt(auj[0]) + " – " + fmt(auj[1]) : "Fermé aujourd'hui";
      });
      chaque(".hours tr[data-jour]", function (tr) {
        tr.classList.toggle("today", +tr.getAttribute("data-jour") === now.jour);
      });
      // Horaires exceptionnels des 14 prochains jours
      var fin = ajouterJours(now.iso, 14);
      var proches = exceptions.filter(function (e) { return e.date >= now.iso && e.date <= fin; })
        .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      chaque("[data-exceptions]", function (bloc) {
        var liste = bloc.querySelector("[data-exc-list]");
        liste.textContent = "";
        proches.forEach(function (e) {
          var jour = utc(e.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
          var detail = e.note || (e.horaires ? fmt(minutes(e.horaires[0])) + " – " + fmt(minutes(e.horaires[1])) : "Fermé");
          var li = document.createElement("li");
          li.textContent = jour.charAt(0).toUpperCase() + jour.slice(1) + "\u00a0: " + detail;
          liste.appendChild(li);
        });
        bloc.hidden = proches.length === 0;
      });
    } catch (e) { /* le texte par défaut reste affiché */ }
  }
  majHoraires();
  setInterval(majHoraires, 60000);

  /* ---------- Fêtes à venir : les dates passées disparaissent, la suivante est mise en avant ---------- */
  (function () {
    var auj = new Date();
    auj = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate());
    var jourLocal = function (iso) { var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); };
    chaque(".fetes", function (liste) {
      var premiere = true, max = +(liste.getAttribute("data-max") || 99), affichees = 0;
      Array.prototype.forEach.call(liste.querySelectorAll(".fete"), function (li) {
        var debut = jourLocal(li.getAttribute("data-start")), fin = jourLocal(li.getAttribute("data-end"));
        if (fin < auj || affichees >= max) { li.hidden = true; return; }
        affichees++;
        var jours = Math.round((debut - auj) / 86400000);
        li.querySelector(".pill").textContent = jours <= 0 ? "En cours" : jours === 1 ? "Demain" : "Dans " + jours + " jours";
        if (premiere) { li.classList.add("next"); premiere = false; }
      });
    });
  })();

  /* ---------- Menu mobile ---------- */
  var entete = document.querySelector("[data-entete]");
  var bouton = document.querySelector(".menu-btn");
  var menu = document.getElementById("menu-mobile");
  var dock = document.querySelector("[data-dock]");
  if (bouton && menu) {
    var autour = [document.getElementById("contenu"), document.querySelector(".site-footer"), dock, document.querySelector(".skip")];
    var ouvrir = function () {
      menu.hidden = false;
      bouton.setAttribute("aria-expanded", "true");
      bouton.querySelector(".menu-txt").textContent = "Fermer";
      autour.forEach(function (el) { if (el) el.inert = true; });
      document.body.style.overflow = "hidden";
      entete.classList.remove("is-hidden");
      var lien = menu.querySelector("a");
      if (lien) lien.focus();
    };
    var fermer = function (rendreFocus) {
      menu.hidden = true;
      bouton.setAttribute("aria-expanded", "false");
      bouton.querySelector(".menu-txt").textContent = "Menu";
      autour.forEach(function (el) { if (el) el.inert = false; });
      document.body.style.overflow = "";
      if (rendreFocus) bouton.focus();
    };
    bouton.addEventListener("click", function () { if (menu.hidden) ouvrir(); else fermer(true); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) fermer(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) fermer(true); });
    window.matchMedia("(min-width: 960px)").addEventListener("change", function (e) { if (e.matches && !menu.hidden) fermer(false); });
  }

  /* ---------- En-tête et barre d'actions : masqués en descendant, visibles en remontant ---------- */
  if (entete) {
    var dernierY = window.scrollY, attente = false;
    var afficher = function (oui) {
      entete.classList.toggle("is-hidden", !oui);
      document.body.classList.toggle("entete-cache", !oui);
      if (dock) dock.classList.toggle("is-hidden", !oui);
    };
    var maj = function () {
      var y = window.scrollY;
      entete.classList.toggle("is-scrolled", y > 8);
      var enHaut = y < 140;
      var enBas = window.innerHeight + y >= document.documentElement.scrollHeight - 40;
      var garder = (menu && !menu.hidden) || entete.contains(document.activeElement);
      if (garder || enHaut || enBas || y < dernierY - 4) afficher(true);
      else if (y > dernierY + 4) afficher(false);
      dernierY = y;
      attente = false;
    };
    window.addEventListener("scroll", function () {
      if (!attente) { attente = true; window.requestAnimationFrame(maj); }
    }, { passive: true });
    entete.addEventListener("focusin", function () { afficher(true); });
    window.addEventListener("mousemove", function (e) { if (e.clientY < 80) afficher(true); }, { passive: true });
    maj();
  }

  /* ---------- Défilement doux, activé après le chargement ----------
     Activé plus tôt, il interromprait l'arrivée directe sur une section (lien vers #horaires, par exemple). */
  var activerDoux = function () { setTimeout(function () { document.documentElement.classList.add("doux"); }, 400); };
  if (document.readyState === "complete") activerDoux(); else window.addEventListener("load", activerDoux);

  /* ---------- Copier l'adresse ---------- */
  chaque("[data-copy]", function (b) {
    var zone = b.closest("[data-copie-zone]");
    var msg = zone ? zone.querySelector("[data-copy-msg]") : null;
    var minuterie;
    b.addEventListener("click", function () {
      var texte = b.getAttribute("data-copy");
      var annonce = function (t) {
        if (!msg) return;
        msg.textContent = t;
        clearTimeout(minuterie);
        minuterie = setTimeout(function () { msg.textContent = ""; }, 5000);
      };
      var secours = function () {
        var champ = document.createElement("textarea");
        champ.value = texte;
        champ.setAttribute("readonly", "");
        champ.style.position = "fixed";
        champ.style.opacity = "0";
        document.body.appendChild(champ);
        champ.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        champ.remove();
        annonce(ok ? "Adresse copiée." : "Copie impossible sur cet appareil. Adresse : " + texte);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texte).then(function () { annonce("Adresse copiée."); }, secours);
      } else {
        secours();
      }
    });
  });

  /* ---------- Carte Google Maps : rien n'est chargé chez Google avant le clic du visiteur ---------- */
  chaque("[data-carte]", function (carte) {
    var ok = carte.querySelector("[data-carte-ok]");
    if (!ok) return;
    ok.addEventListener("click", function () {
      var cadre = document.createElement("iframe");
      cadre.src = carte.getAttribute("data-src");
      cadre.title = "Carte Google Maps : Shemtov Foch, 6 rue du Maréchal-Foch, Strasbourg";
      cadre.referrerPolicy = "strict-origin-when-cross-origin";
      carte.querySelector(".carte-voile").remove();
      carte.appendChild(cadre);
      cadre.focus();
    });
  });

  /* ---------- Nos rayons : la pastille du rayon en cours se met en évidence ---------- */
  var chips = document.querySelector(".chips");
  if (chips && "IntersectionObserver" in window) {
    var liens = {};
    Array.prototype.forEach.call(chips.querySelectorAll("a"), function (a) { liens[a.getAttribute("href").slice(1)] = a; });
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(liens).forEach(function (id) { liens[id].classList.toggle("actif", id === en.target.id); });
        var a = liens[en.target.id];
        // Position de la pastille dans la liste (offsetLeft est mesuré depuis la barre, marges comprises)
        var ul = a && a.parentNode.parentNode;
        if (a) ul.scrollTo({ left: a.parentNode.offsetLeft - ul.offsetLeft - 20, behavior: reduit.matches ? "auto" : "smooth" });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    chaque(".rayon", function (r) { obs.observe(r); });
  }

  /* ---------- Animations : chargées seulement si le mouvement est autorisé ---------- */
  var feuille = document.querySelector('link[rel="stylesheet"]');
  var base = feuille ? feuille.getAttribute("href").replace("assets/style.css", "") : "";
  var charger = function (src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement("script");
      s.src = base + src;
      s.onload = ok;
      s.onerror = ko;
      document.head.appendChild(s);
    });
  };
  // Chargées une seconde après la page, au premier moment libre : elles ne concernent que le contenu
  // sous l'écran et ne doivent pas retarder l'affichage du haut de page (animé en CSS) sur un téléphone.
  var animer = function () {
    charger("assets/vendor/gsap.min.js")
      .then(function () { return charger("assets/vendor/ScrollTrigger.min.js"); })
      .then(function () { return charger("assets/anim.js"); })
      .catch(function () { /* le site reste complet sans animations */ });
  };
  var plusTard = function () {
    setTimeout(function () {
      if ("requestIdleCallback" in window) requestIdleCallback(animer, { timeout: 1500 }); else animer();
    }, 1000);
  };
  if (!reduit.matches && !window.gsap && document.querySelector("[data-reveal], [data-reveal-img], [data-galerie], [data-speed]")) {
    if (document.readyState === "complete") plusTard(); else window.addEventListener("load", plusTard);
  }
})();
