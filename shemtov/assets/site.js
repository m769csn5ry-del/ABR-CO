/* Shemtov Foch : fonctions du site. Tout le contenu reste lisible sans ce script ;
   il ajoute le statut en direct, le menu mobile, la copie d'adresse et la visite guidée du plan.
   Les données (horaires, exceptions) viennent de assets/donnees.js, généré depuis donnees.json. */
(function () {
  "use strict";

  var D = window.SHEMTOV || { horaires: [], exceptions: [] };
  var reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
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

  function utc(iso) {
    var p = iso.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }

  function ajouterJours(iso, n) {
    var d = utc(iso);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  /* ---------- Statut ouvert / fermé, à l'heure de Paris ---------- */
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
      document.querySelectorAll("[data-status]").forEach(function (el) {
        el.setAttribute("data-state", s.etat);
        var t = el.querySelector("[data-status-text]");
        if (t && t.textContent !== s.texte) t.textContent = s.texte;
      });
      document.querySelectorAll(".hours tr[data-jour]").forEach(function (tr) {
        tr.classList.toggle("today", +tr.getAttribute("data-jour") === now.jour);
      });
      // Horaires exceptionnels des 14 prochains jours
      var fin = ajouterJours(now.iso, 14);
      var proches = exceptions.filter(function (e) { return e.date >= now.iso && e.date <= fin; })
        .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      document.querySelectorAll("[data-exceptions]").forEach(function (bloc) {
        var liste = bloc.querySelector("[data-exc-list]");
        liste.textContent = "";
        proches.forEach(function (e) {
          var jour = utc(e.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
          var detail = e.note || (e.horaires ? fmt(minutes(e.horaires[0])) + " – " + fmt(minutes(e.horaires[1])) : "Fermé");
          var li = document.createElement("li");
          li.textContent = jour.charAt(0).toUpperCase() + jour.slice(1) + " : " + detail;
          liste.appendChild(li);
        });
        bloc.hidden = proches.length === 0;
      });
    } catch (e) { /* le texte par défaut reste affiché */ }
  }
  majHoraires();
  setInterval(majHoraires, 60000);

  /* ---------- Fêtes à venir ---------- */
  (function () {
    var auj = new Date();
    auj = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate());
    function jourLocal(iso) { var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
    var premiere = true;
    document.querySelectorAll(".fete").forEach(function (li) {
      var debut = jourLocal(li.getAttribute("data-start")), fin = jourLocal(li.getAttribute("data-end"));
      if (fin < auj) { li.hidden = true; return; }
      var jours = Math.round((debut - auj) / 86400000);
      li.querySelector(".pill").textContent = jours <= 0 ? "En cours" : jours === 1 ? "Demain" : "Dans " + jours + " jours";
      if (premiere) { li.classList.add("next"); premiere = false; }
    });
  })();

  /* ---------- Menu mobile ---------- */
  var entete = document.querySelector(".site-header");
  var bouton = document.querySelector(".menu-btn");
  var menu = document.getElementById("menu-mobile");
  if (bouton && menu) {
    var autour = [document.getElementById("contenu"), document.querySelector(".site-footer"), document.querySelector("[data-dock]")];
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
    window.matchMedia("(min-width: 900px)").addEventListener("change", function (e) { if (e.matches && !menu.hidden) fermer(false); });
  }

  /* ---------- En-tête et barre d'actions : masqués en descendant, visibles en remontant ---------- */
  var dock = document.querySelector("[data-dock]");
  if (entete) {
    var dernierY = window.scrollY, attente = false;
    var maj = function () {
      var y = window.scrollY;
      var enHaut = y < 120;
      var enBas = window.innerHeight + y >= document.documentElement.scrollHeight - 40;
      var garder = (menu && !menu.hidden) || entete.contains(document.activeElement);
      if (garder || enHaut || enBas || y < dernierY - 4) {
        entete.classList.remove("is-hidden");
        if (dock) dock.classList.remove("is-hidden");
      } else if (y > dernierY + 4) {
        entete.classList.add("is-hidden");
        if (dock) dock.classList.add("is-hidden");
      }
      dernierY = y;
      attente = false;
    };
    window.addEventListener("scroll", function () {
      if (!attente) { attente = true; window.requestAnimationFrame(maj); }
    }, { passive: true });
    entete.addEventListener("focusin", function () { entete.classList.remove("is-hidden"); });
    // Sur ordinateur, l'en-tête revient dès que la souris approche du haut de l'écran
    window.addEventListener("mousemove", function (e) {
      if (e.clientY < 72) entete.classList.remove("is-hidden");
    }, { passive: true });
  }

  /* ---------- Défilement doux, activé après le chargement ----------
     Activé plus tôt, il interromprait l'arrivée directe sur une section (lien partagé vers #visite, par exemple). */
  var activerDoux = function () { setTimeout(function () { document.documentElement.classList.add("doux"); }, 400); };
  if (document.readyState === "complete") activerDoux(); else window.addEventListener("load", activerDoux);

  /* ---------- Copier l'adresse ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    var msg = document.querySelector("[data-copy-msg]");
    var minuterie;
    b.addEventListener("click", function () {
      var texte = b.getAttribute("data-copy");
      var annonce = function (t) {
        msg.textContent = t;
        clearTimeout(minuterie);
        minuterie = setTimeout(function () { msg.textContent = ""; }, 5000);
      };
      var secours = function () {
        var zone = document.createElement("textarea");
        zone.value = texte;
        zone.setAttribute("readonly", "");
        zone.style.position = "fixed";
        zone.style.opacity = "0";
        document.body.appendChild(zone);
        zone.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        zone.remove();
        annonce(ok ? "Adresse copiée." : "Copie impossible sur cet appareil. Adresse : " + texte);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texte).then(function () { annonce("Adresse copiée."); }, secours);
      } else {
        secours();
      }
    });
  });

  /* ---------- Visite guidée : la « caméra » du plan suit l'étape en cours ---------- */
  var boite = document.querySelector("[data-plan]");
  var plan = boite && boite.querySelector("svg.plan");
  if (plan) {
    var complet = plan.getAttribute("data-vb").split(" ").map(Number);
    var actuel = complet.slice();
    var zones = {};
    plan.querySelectorAll(".zone").forEach(function (z) { zones[z.getAttribute("data-etape")] = z; });
    var etapes = Array.prototype.slice.call(document.querySelectorAll(".etape"));
    var texteEtape = boite.querySelector("[data-plan-step]");
    var barre = boite.querySelector("[data-plan-bar]");
    var actif, animation;
    var grand = window.matchMedia("(min-width: 900px)");

    // Adapte un cadre au format de l'écran pour que le plan remplisse sa zone sans être déformé
    var ajuster = function (vb) {
      var r = plan.clientWidth / Math.max(1, plan.clientHeight);
      if (!isFinite(r) || r <= 0) return vb;
      var x = vb[0], y = vb[1], w = vb[2], h = vb[3];
      if (w / h < r) { var nw = h * r; x -= (nw - w) / 2; w = nw; } else { var nh = w / r; y -= (nh - h) / 2; h = nh; }
      return [x, y, w, h];
    };
    var cadre = function (etape) {
      if (!etape || !zones[etape]) return ajuster(complet);
      // Plus de contexte sur grand écran, zoom plus serré sur téléphone
      var b = zones[etape].getBBox(), marge = 70, mini = grand.matches ? 540 : 440;
      var x = b.x - marge, y = b.y - marge, w = b.width + 2 * marge, h = b.height + 2 * marge;
      if (w < mini) { x -= (mini - w) / 2; w = mini; }
      if (h < mini) { y -= (mini - h) / 2; h = mini; }
      return ajuster([x, y, w, h]);
    };
    var poser = function (vb) {
      plan.setAttribute("viewBox", vb.map(function (v) { return v.toFixed(1); }).join(" "));
      actuel = vb;
    };
    var allerA = function (vb) {
      if (animation) cancelAnimationFrame(animation);
      if (reduit.matches) { poser(vb); return; }
      var depart = actuel.slice(), t0 = performance.now(), duree = 750;
      var pas = function (t) {
        var p = Math.min(1, (t - t0) / duree);
        var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        poser(depart.map(function (v, i) { return v + (vb[i] - v) * e; }));
        if (p < 1) animation = requestAnimationFrame(pas);
      };
      animation = requestAnimationFrame(pas);
    };
    var activer = function (etape) {
      if (etape === actif) return;
      actif = etape;
      plan.classList.toggle("has-active", !!etape);
      Object.keys(zones).forEach(function (k) { zones[k].classList.toggle("is-active", k === etape); });
      var i = etapes.findIndex(function (el) { return el.getAttribute("data-etape") === etape; });
      etapes.forEach(function (el, j) { el.classList.toggle("is-active", j === i); });
      texteEtape.textContent = i >= 0 ? "Étape " + (i + 1) + " sur " + etapes.length : "Plan du magasin";
      barre.style.width = i >= 0 ? ((i + 1) / etapes.length * 100) + "%" : "0";
      allerA(cadre(etape));
    };

    poser(ajuster(complet));
    if ("IntersectionObserver" in window) {
      // L'étape active est celle qui croise une ligne horizontale : vers 43 % de l'écran sur ordinateur
      // (là où l'on lit), vers 69 % sur téléphone (sous le plan collé en haut).
      var obs;
      var observer = function () {
        if (obs) obs.disconnect();
        obs = new IntersectionObserver(function (entrees) {
          entrees.forEach(function (en) { if (en.isIntersecting) activer(en.target.getAttribute("data-etape")); });
        }, { rootMargin: grand.matches ? "-42% 0px -56% 0px" : "-68% 0px -30% 0px" });
        etapes.forEach(function (el) { obs.observe(el); });
      };
      observer();
      grand.addEventListener("change", observer);
      // Retour au plan entier quand on remonte au-dessus de la visite
      var section = document.getElementById("visite");
      new IntersectionObserver(function (entrees) {
        entrees.forEach(function (en) { if (!en.isIntersecting && en.boundingClientRect.top > 0) activer(null); });
      }).observe(section);
    }
    plan.addEventListener("click", function (e) {
      var z = e.target.closest(".zone");
      var cible = z && document.getElementById("etape-" + z.getAttribute("data-etape"));
      if (cible) cible.scrollIntoView({ behavior: reduit.matches ? "auto" : "smooth", block: "start" });
    });
    var delai;
    window.addEventListener("resize", function () {
      clearTimeout(delai);
      delai = setTimeout(function () { poser(cadre(actif)); }, 150);
    });
  }

  /* ---------- Animations : chargées seulement si le mouvement est autorisé ---------- */
  var charger = function (src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = ko;
      document.head.appendChild(s);
    });
  };
  if (!reduit.matches && !window.gsap && document.querySelector("[data-reveal]")) {
    charger("assets/vendor/gsap.min.js")
      .then(function () { return charger("assets/vendor/ScrollTrigger.min.js"); })
      .then(function () { return charger("assets/anim.js"); })
      .catch(function () { /* le site reste complet sans animations */ });
  }
})();
