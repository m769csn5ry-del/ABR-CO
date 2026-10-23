/* Shemtov Foch : animations au défilement (GSAP + ScrollTrigger).
   Chargé par site.js uniquement si le visiteur n'a pas demandé à réduire les mouvements.
   Rien n'est caché avant le chargement : seuls les éléments encore sous l'écran sont préparés. */
(function () {
  "use strict";
  if (!window.gsap || !window.ScrollTrigger) return;
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  var mm = gsap.matchMedia();
  mm.add({ mouvement: "(prefers-reduced-motion: no-preference)", large: "(min-width: 900px)" }, function (ctx) {
    if (!ctx.conditions.mouvement) return;
    var hauteur = window.innerHeight;
    var sousLecran = function (el) { return el.getBoundingClientRect().top > hauteur * 0.92; };

    // 1. Apparition des blocs à leur entrée dans l'écran
    var blocs = gsap.utils.toArray("[data-reveal], .univers, .etape figure, .etape-txt").filter(sousLecran);
    gsap.set(blocs, { opacity: 0, y: 36 });
    ScrollTrigger.batch(blocs, {
      start: "top 88%",
      once: true,
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, overwrite: true });
      }
    });

    // 2. La phrase d'introduction apparaît mot après mot, une seule fois, puis reste pleinement lisible
    var phrase = document.querySelector("[data-words]");
    if (phrase && sousLecran(phrase)) {
      var texte = phrase.textContent.trim();
      phrase.textContent = "";
      texte.split(/\s+/).forEach(function (mot, i) {
        var s = document.createElement("span");
        s.className = "w";
        s.textContent = mot;
        if (i) phrase.appendChild(document.createTextNode(" "));
        phrase.appendChild(s);
      });
      var mots = phrase.querySelectorAll(".w");
      gsap.set(mots, { opacity: 0, y: "0.35em", display: "inline-block" });
      ScrollTrigger.create({
        trigger: phrase, start: "top 82%", once: true,
        onEnter: function () { gsap.to(mots, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.045 }); }
      });
    }

    // 3. Profondeur : les photos de la présentation glissent à des vitesses différentes
    gsap.utils.toArray("[data-speed]").forEach(function (el) {
      gsap.to(el, {
        yPercent: parseFloat(el.getAttribute("data-speed")) || 0, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    // 4. Sur grand écran, les photos du haut de page se décalent au défilement
    if (ctx.conditions.large) {
      gsap.to(".hero-photo img", { yPercent: 6, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".hero-photo-2", { yPercent: -16, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".hero-badge", { rotate: 18, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    }

    // Un élément atteint au clavier apparaît tout de suite
    var auFocus = function (e) {
      var el = e.target.closest && e.target.closest("[data-reveal], .univers, .etape");
      if (!el) return;
      var cibles = el.classList.contains("etape") ? el.querySelectorAll("figure, .etape-txt") : el;
      gsap.to(cibles, { opacity: 1, y: 0, duration: 0.3, overwrite: true });
    };
    document.addEventListener("focusin", auFocus);
    return function () { document.removeEventListener("focusin", auFocus); };
  });

  if (document.readyState === "complete") ScrollTrigger.refresh();
  else window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
