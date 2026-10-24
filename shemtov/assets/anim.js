/* Shemtov Foch : animations au défilement (GSAP + ScrollTrigger).
   Chargé par site.js uniquement si le visiteur n'a pas demandé à réduire les mouvements.
   Rien n'est caché avant le chargement : seuls les éléments encore sous l'écran sont préparés.
   Le haut de chaque page est animé en CSS, pour ne jamais retarder le premier affichage. */
(function () {
  "use strict";
  if (!window.gsap || !window.ScrollTrigger) return;
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  var mm = gsap.matchMedia();
  mm.add({
    mouvement: "(prefers-reduced-motion: no-preference)",
    large: "(min-width: 1024px) and (min-height: 640px)",
    precis: "(hover: hover) and (pointer: fine)"
  }, function (ctx) {
    if (!ctx.conditions.mouvement) return;
    var hauteur = window.innerHeight;
    var sousLecran = function (el) { return el.getBoundingClientRect().top > hauteur * 0.9; };

    // 1. Titres de section : les mots montent un à un, une seule fois
    gsap.utils.toArray("[data-split]").filter(sousLecran).forEach(function (titre) {
      var mots = titre.textContent.trim().split(/\s+/);
      titre.textContent = "";
      mots.forEach(function (mot, i) {
        var masque = document.createElement("span");
        masque.className = "m";
        var s = document.createElement("span");
        s.textContent = mot;
        masque.appendChild(s);
        if (i) titre.appendChild(document.createTextNode(" "));
        titre.appendChild(masque);
      });
      titre.classList.add("decoupe");
      var interieurs = titre.querySelectorAll(".m > span");
      gsap.set(interieurs, { yPercent: 105 });
      ScrollTrigger.create({
        trigger: titre, start: "top 88%", once: true,
        onEnter: function () { gsap.to(interieurs, { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.045 }); }
      });
    });

    // 2. Blocs de texte et cartes : apparition douce
    var blocs = gsap.utils.toArray("[data-reveal], .carte-rayon, .reperes li, .fete, .panneau, .contact-carte").filter(sousLecran);
    gsap.set(blocs, { opacity: 0, y: 40 });
    ScrollTrigger.batch(blocs, {
      start: "top 90%", once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.08, overwrite: true }); }
    });

    // 3. Photos : le cadre s'ouvre et l'image se pose
    gsap.utils.toArray("[data-reveal-img]").filter(sousLecran).forEach(function (fig) {
      var img = fig.querySelector("img");
      gsap.set(fig, { clipPath: "inset(14% 10% 14% 10% round 28px)" });
      gsap.set(img, { scale: 1.18 });
      ScrollTrigger.create({
        trigger: fig, start: "top 85%", once: true,
        onEnter: function () {
          gsap.to(fig, { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.4, ease: "power3.out", clearProps: "clipPath" });
          gsap.to(img, { scale: 1, duration: 1.8, ease: "power3.out" });
        }
      });
    });

    // 4. Profondeur : les photos glissent à des vitesses différentes (grand écran seulement)
    if (ctx.conditions.large) {
      gsap.utils.toArray("[data-speed]").forEach(function (el) {
        gsap.to(el, {
          yPercent: parseFloat(el.getAttribute("data-speed")) || 0, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }
        });
      });
    }

    // 5. Galerie des rayons : défilement horizontal épinglé (grand écran, souris)
    var zone = document.querySelector("[data-galerie]");
    if (zone && ctx.conditions.large && ctx.conditions.precis) {
      var piste = zone.querySelector(".galerie");
      var barre = zone.querySelector(".progres i");
      zone.classList.add("est-epingle");
      gsap.set(zone.querySelectorAll(".carte-rayon"), { opacity: 1, y: 0 });
      var distance = function () { return Math.max(0, piste.scrollWidth - document.documentElement.clientWidth); };
      var tween = gsap.to(piste, {
        x: function () { return -distance(); }, ease: "none",
        scrollTrigger: {
          trigger: zone, start: "center center", end: function () { return "+=" + distance(); },
          pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) { if (barre) barre.style.transform = "scaleX(" + self.progress + ")"; }
        }
      });
      // Une carte atteinte au clavier est amenée à l'écran
      var auFocus = function (e) {
        var carte = e.target.closest && e.target.closest(".carte-rayon");
        if (!carte || !tween.scrollTrigger) return;
        var st = tween.scrollTrigger;
        var cible = Math.min(1, Math.max(0, (carte.offsetLeft - 80) / Math.max(1, distance())));
        window.scrollTo(0, st.start + cible * (st.end - st.start));
      };
      zone.addEventListener("focusin", auFocus);
      return function () {
        zone.removeEventListener("focusin", auFocus);
        zone.classList.remove("est-epingle");
      };
    }
  });

  // Un élément atteint au clavier apparaît tout de suite
  document.addEventListener("focusin", function (e) {
    var el = e.target.closest && e.target.closest("[data-reveal], .carte-rayon, .panneau, .contact-carte, .fete");
    if (el) gsap.to(el, { opacity: 1, y: 0, duration: 0.3, overwrite: true });
  });

  document.documentElement.setAttribute("data-anim", "pret");
  if (document.readyState === "complete") ScrollTrigger.refresh();
  else window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
