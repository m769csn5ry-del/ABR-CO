#!/usr/bin/env python3
"""Reporte shemtov-interne/contenu/donnees.json dans les pages du site.

Les données (coordonnées, horaires, exceptions, fêtes, rayons, FAQ, informations légales) ne se
saisissent qu'à un seul endroit : donnees.json. Ce script remplit les blocs balisés
<!-- donnees:xxx --> des pages (en-tête, pied de page, horaires, rayons, FAQ…) et écrit
assets/donnees.js, robots.txt et, une fois le domaine connu, sitemap.xml.

    python3 synchroniser.py              # met à jour les fichiers
    python3 synchroniser.py --verifier   # échoue si un fichier n'est pas à jour (pour les tests)
"""
import html
import json
import pathlib
import re
import sys

from PIL import Image

RACINE = pathlib.Path(__file__).resolve().parents[2]
SITE = RACINE / "shemtov"
DONNEES = RACINE / "shemtov-interne" / "contenu" / "donnees.json"

# fichier : (chemin public, libellé de navigation ou None, dans le plan du site)
PAGES = {
    "index.html": ("/", None, True),
    "le-magasin.html": ("/le-magasin.html", "Le magasin", True),
    "nos-rayons.html": ("/nos-rayons.html", "Nos rayons", True),
    "infos-pratiques.html": ("/infos-pratiques.html", "Infos pratiques", True),
    "faq.html": ("/faq.html", "FAQ", True),
    "contact.html": ("/contact.html", "Contact", True),
    "mentions-legales.html": ("/mentions-legales.html", None, True),
    "confidentialite.html": ("/confidentialite.html", None, True),
    "404.html": (None, None, False),
}
JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
SEMAINE = [1, 2, 3, 4, 5, 6, 0]  # ordre d'affichage, du lundi au dimanche
MOIS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"]
SCHEMA_JOURS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
HEURE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
e = html.escape
COURANT = ' aria-current="page"'


# ---------------------------------------------------------------- outils
def heure(hhmm):
    h, m = hhmm.split(":")
    return f"{int(h)}h{m if m != '00' else ''}"


def plage(h):
    return f"{heure(h[0])} – {heure(h[1])}" if h else "Fermé"


def groupes_horaires(d):
    """Jours consécutifs (du lundi au dimanche) qui ont les mêmes horaires."""
    out = []
    for i in SEMAINE:
        h = d["horaires"][JOURS[i]]
        if out and out[-1][2] == h:
            out[-1][1] = i
        else:
            out.append([i, i, h])
    return out


def libelle_groupe(a, b):
    return JOURS[a].capitalize() if a == b else f"{JOURS[a].capitalize()} – {JOURS[b]}"


def phrase_horaires(d):
    morceaux, ferme = [], []
    for a, b, h in groupes_horaires(d):
        if not h:
            ferme.append(JOURS[a] if a == b else f"du {JOURS[a]} au {JOURS[b]}")
            continue
        quand = f"le {JOURS[a]}" if a == b else f"du {JOURS[a]} au {JOURS[b]}"
        morceaux.append(f"{quand} de {heure(h[0])} à {heure(h[1])}")
    texte = (", ".join(morceaux[:-1]) + " et " + morceaux[-1]) if len(morceaux) > 1 else morceaux[0]
    if ferme:
        texte += ". Il est fermé le " + " et le ".join(ferme)
    return texte + "."


def photo(nom, sizes, alt, base="", loading="lazy", priorite=False):
    fichiers = sorted((SITE / "assets" / "photos").glob(f"{nom}-*.webp"), key=lambda f: Image.open(f).width)
    if not fichiers:
        raise SystemExit(f"photo introuvable : {nom}")
    tailles = [(f, Image.open(f).size) for f in fichiers]
    plus_grande, (w, h) = tailles[-1]
    srcset = ", ".join(f"{base}assets/photos/{f.name} {t[0]}w" for f, t in tailles)
    attributs = f'loading="{loading}" decoding="async"' if not priorite else 'fetchpriority="high" decoding="async"'
    return (f'<img src="{base}assets/photos/{plus_grande.name}" srcset="{srcset}" sizes="{sizes}" '
            f'width="{w}" height="{h}" alt="{e(alt)}" {attributs}>')


def pastille(couleur):
    return f'<svg class="pastille" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill="{couleur}"/></svg>'


def remplacer_variables(texte, d):
    t = d["telephone"]
    a = d["adresse"]
    valeurs = {
        "adresse": f"{a['rue']}, {a['codePostal']} {a['ville']}",
        "horaires_phrase": phrase_horaires(d),
        "tel_lien": f'<a href="tel:{t["international"]}">{t["affiche"]}</a>',
        "facebook": d["liens"]["facebook"],
    }
    return re.sub(r"\{\{(\w+)\}\}", lambda m: valeurs[m.group(1)], texte)


# ---------------------------------------------------------------- validation
def valider(d):
    erreurs = []
    for jour in JOURS:
        h = d["horaires"].get(jour, "absent")
        if h == "absent":
            erreurs.append(f"horaires : {jour} manquant")
        elif h is not None and not (len(h) == 2 and all(HEURE.match(x) for x in h) and h[0] < h[1]):
            erreurs.append(f"horaires : {jour} invalide ({h})")
    for x in d["exceptions"]:
        if not DATE.match(x.get("date", "")):
            erreurs.append(f"exception sans date valide : {x}")
        h = x.get("horaires")
        if h is not None and not (len(h) == 2 and all(HEURE.match(v) for v in h) and h[0] < h[1]):
            erreurs.append(f"exception {x.get('date')} : horaires invalides")
    for f in d["fetes"]:
        if not (DATE.match(f["debut"]) and DATE.match(f["fin"]) and f["debut"] <= f["fin"]):
            erreurs.append(f"fête {f['nom']} : dates invalides")
    for r in d["rayons"]:
        if not list((SITE / "assets" / "photos").glob(f"{r['photo']}-*.webp")):
            erreurs.append(f"rayon {r['id']} : photo {r['photo']} absente")
    return erreurs


# ---------------------------------------------------------------- blocs communs
def bloc_entete(d, page, base):
    t, it = d["telephone"], d["liens"]["itineraire"]
    items = "".join(
        f'<li><a href="{base}{f}"{COURANT if f == page else ""}>{libelle}</a></li>'
        for f, (_, libelle, _) in PAGES.items() if libelle)
    return f"""<a class="skip" href="#contenu">Aller au contenu</a>
<header class="site-header" data-entete>
  <div class="wrap header-in">
    <a class="brand" href="{base}index.html"><img src="{base}assets/logo-160.webp" alt="" width="40" height="40"><span>Shemtov Foch</span><span class="sr">, retour à l'accueil</span></a>
    <nav class="nav" aria-label="Navigation principale"><ul>{items}</ul></nav>
    <a class="btn btn-sm btn-ink header-cta" href="{e(it)}" target="_blank" rel="noopener">Itinéraire</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu-mobile"><span class="menu-ico" aria-hidden="true"></span><span class="menu-txt">Menu</span></button>
  </div>
</header>
<div class="menu-mobile" id="menu-mobile" hidden>
  <nav class="wrap" aria-label="Navigation mobile">
    <ul><li><a href="{base}index.html"{COURANT if page == "index.html" else ""}>Accueil</a></li>{items}</ul>
    <div class="menu-infos">
      <p class="statut" data-status data-state="off"><span class="dot" aria-hidden="true"></span><span data-status-text>Horaires dans les infos pratiques</span></p>
      <a class="btn btn-ink" href="tel:{t['international']}">Appeler le {t['affiche']}</a>
      <a class="btn btn-outline" href="{e(it)}" target="_blank" rel="noopener">Itinéraire</a>
    </div>
  </nav>
</div>"""


def bloc_horaires_court(d):
    return "\n".join(f'<li><span>{libelle_groupe(a, b)}</span><span>{plage(h)}</span></li>' for a, b, h in groupes_horaires(d))


def bloc_pied(d, page, base):
    t, a, l = d["telephone"], d["adresse"], d["liens"]
    plan = "".join(f'<li><a href="{base}{f}">{lib or "Accueil"}</a></li>' for f, (_, lib, nav) in PAGES.items()
                   if (lib or f == "index.html"))
    return f"""<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-marque">
      <span class="footer-logo"><img src="{base}assets/logo-160.webp" alt="" width="64" height="64"></span>
      <p class="footer-nom">Shemtov Foch</p>
      <p class="footer-sous">Épicerie casher à Strasbourg</p>
      <address>{e(a['rue'])}<br>{a['codePostal']} {e(a['ville'])}<br><a href="tel:{t['international']}">{t['affiche']}</a></address>
    </div>
    <nav class="footer-col" aria-labelledby="pied-site"><h2 class="footer-titre" id="pied-site">Le site</h2><ul>{plan}</ul></nav>
    <div class="footer-col"><h2 class="footer-titre">Horaires</h2><ul class="horaires-court">{bloc_horaires_court(d)}</ul></div>
    <div class="footer-col"><h2 class="footer-titre">Informations</h2><ul>
      <li><a href="{base}mentions-legales.html">Mentions légales</a></li>
      <li><a href="{base}confidentialite.html">Confidentialité et cookies</a></li>
      <li><a href="{e(l['facebook'])}" target="_blank" rel="noopener">Facebook</a></li>
    </ul></div>
  </div>
  <div class="wrap footer-bas"><p>{bloc_legal_court(d)}</p><p>Photos non contractuelles. Assortiment variable selon les arrivages.</p></div>
</footer>
<div class="dock" data-dock>
  <a class="btn btn-ink" href="tel:{t['international']}">Appeler</a>
  <a class="btn btn-outline" href="{e(l['itineraire'])}" target="_blank" rel="noopener">Itinéraire</a>
</div>"""


def bloc_legal_court(d):
    l = d["legal"]
    return f'{e(l["denomination"])}, {e(l["formeCourte"])} au capital de {e(l["capital"])} · SIRET {e(l["siret"])} · {e(l["rcs"])}'


def bloc_seo(d, page):
    chemin = PAGES[page][0]
    if not d["domaine"] or chemin is None:
        return ""
    url = f"https://{d['domaine']}{chemin}"
    return "\n".join([f'<link rel="canonical" href="{url}">', f'<meta property="og:url" content="{url}">',
                      f'<meta property="og:image" content="https://{d["domaine"]}/assets/og.jpg">',
                      '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">'])


# ---------------------------------------------------------------- blocs de contenu
def bloc_horaires(d):
    lignes = []
    for i in SEMAINE:
        h = d["horaires"][JOURS[i]]
        classe = "" if h else ' class="off"'
        lignes.append(f'<tr data-jour="{i}"><th scope="row">{JOURS[i].capitalize()}</th><td{classe}>{plage(h)}</td></tr>')
    return "\n".join(lignes)


def bloc_fetes(d):
    lignes = []
    for f in d["fetes"]:
        _, m, j = f["debut"].split("-")
        texte = e(f["texte"]).replace(" 1er ", " 1<sup>er</sup> ")
        lignes.append(f'<li class="fete" data-start="{f["debut"]}" data-end="{f["fin"]}">'
                      f'<span class="fete-date"><b>{int(j)}</b>{MOIS[int(m) - 1]}</span>'
                      f'<span class="fete-txt"><span class="fete-nom">{e(f["nom"])}</span><span class="fete-quand">{texte}</span></span>'
                      f'<span class="pill"></span></li>')
    return "\n".join(lignes)


def bloc_rayons_galerie(d):
    cartes = []
    for r in d["rayons"]:
        cartes.append(f"""<li class="carte-rayon">
  <figure class="carte-img">{photo(r['photo'], '(min-width: 1024px) 360px, (min-width: 640px) 44vw, 78vw', r['alt'])}</figure>
  <div class="carte-txt"><h3>{pastille(r['couleur'])}<a href="nos-rayons.html#rayon-{r['id']}">{e(r['nom'])}</a></h3><p>{e(r['texte'])}</p></div>
</li>""")
    return "\n".join(cartes)


def bloc_rayons_chips(d):
    return "".join(f'<li><a href="#rayon-{r["id"]}">{pastille(r["couleur"])}{e(r["nom"])}</a></li>' for r in d["rayons"])


def bloc_rayons_detail(d):
    blocs = []
    for i, r in enumerate(d["rayons"]):
        liste = "".join(f"<li>{e(x)}</li>" for x in r["details"])
        evin = ('<p class="evin">L\'abus d\'alcool est dangereux pour la santé, à consommer avec modération.</p>'
                if r.get("alcool") else "")
        blocs.append(f"""<section class="rayon{' rayon-inverse' if i % 2 else ''}" id="rayon-{r['id']}" aria-labelledby="titre-{r['id']}">
  <figure class="rayon-img" data-reveal-img>{photo(r['photo'], '(min-width: 900px) 46vw, 92vw', r['alt'])}</figure>
  <div class="rayon-txt" data-reveal>
    <p class="kicker">{pastille(r['couleur'])}Rayon</p>
    <h2 id="titre-{r['id']}">{e(r['nom'])}</h2>
    <p class="rayon-intro">{e(r['texte'])}</p>
    <ul class="rayon-liste">{liste}</ul>
    {evin}
  </div>
</section>""")
    return "\n".join(blocs)


def bloc_faq(d):
    items = []
    for i, x in enumerate(d["faq"]):
        items.append(f"""<details class="faq-item" data-reveal>
  <summary><span>{e(x['q'])}</span><span class="faq-ico" aria-hidden="true"></span></summary>
  <div class="faq-r"><p>{remplacer_variables(x['r'], d)}</p></div>
</details>""")
    return "\n".join(items)


def bloc_editeur(d):
    l, t = d["legal"], d["telephone"]
    parts = [
        "<h2>Éditeur du site</h2>",
        f'<p><strong>{e(l["denomination"])}</strong>, {e(l["forme"])} au capital de {e(l["capital"])}.<br>'
        f'Siège social et magasin : {e(l["siege"])}.<br>'
        f'Téléphone : <a href="tel:{t["international"]}">{e(t["affiche"])}</a></p>',
        "<ul>",
        f"<li>Gérant : {e(l['gerant'])}</li>", f"<li>SIREN : {e(l['siren'])}</li>", f"<li>SIRET : {e(l['siret'])}</li>",
        f"<li>RCS : {e(l['rcs'])}</li>", f"<li>Code APE : {e(l['ape'])}</li>", f"<li>TVA intracommunautaire : {e(l['tva'])}</li>",
        "</ul>",
    ]
    if l.get("email"):
        parts += ["<h2>Contact par email</h2>", f'<p><a href="mailto:{e(l["email"])}">{e(l["email"])}</a></p>']
    if l.get("responsablePublication"):
        parts += ["<h2>Directeur de la publication</h2>", f"<p>{e(l['responsablePublication'])}.</p>"]
    if l.get("hebergeur"):
        h = l["hebergeur"]
        parts += ["<h2>Hébergeur</h2>", f"<p>{e(h['nom'])}<br>{e(h['adresse'])}"
                  + (f"<br>Téléphone : {e(h['telephone'])}" if h.get("telephone") else "")
                  + (f'<br><a href="{e(h["site"])}" target="_blank" rel="noopener">{e(h["site"])}</a>' if h.get("site") else "") + "</p>"]
    return "\n".join(parts)


def bloc_jsonld(d, page):
    if page == "faq.html":
        ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": x["q"], "acceptedAnswer": {"@type": "Answer",
             "text": re.sub(r"<[^>]+>", "", remplacer_variables(x["r"], d))}} for x in d["faq"]]}
    elif page == "index.html":
        groupes = {}
        for i, jour in enumerate(JOURS):
            h = d["horaires"][jour]
            if h:
                groupes.setdefault(tuple(h), []).append(SCHEMA_JOURS[i])
        ld = {
            "@context": "https://schema.org", "@type": "GroceryStore", "name": d["nom"],
            "legalName": d["legal"]["denomination"], "vatID": d["legal"]["tva"],
            "identifier": {"@type": "PropertyValue", "propertyID": "SIRET", "value": d["legal"]["siret"].replace(" ", "")},
            "description": d["description"], "telephone": d["telephone"]["international"],
            "address": {"@type": "PostalAddress", "streetAddress": d["adresse"]["rue"], "postalCode": d["adresse"]["codePostal"],
                        "addressLocality": d["adresse"]["ville"], "addressCountry": d["adresse"]["pays"]},
            "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": j if len(j) > 1 else j[0],
                                           "opens": h[0], "closes": h[1]} for h, j in groupes.items()],
            "sameAs": [d["liens"]["facebook"]],
        }
        if d["domaine"]:
            ld["url"] = f"https://{d['domaine']}/"
            ld["image"] = f"https://{d['domaine']}/assets/og.jpg"
            ld["logo"] = f"https://{d['domaine']}/assets/logo-480.webp"
    else:
        return ""
    return '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>"


# ---------------------------------------------------------------- assemblage
def remplacer(texte, nom, contenu):
    motif = re.compile(rf"(<!-- donnees:{nom} -->)(.*?)(<!-- /donnees:{nom} -->)", re.S)
    return motif.sub(lambda m: m.group(1) + ("\n" + contenu + "\n" if contenu else "") + m.group(3), texte)


def construire(d):
    sorties = {}
    for page in PAGES:
        source = SITE / page
        if not source.exists():
            raise SystemExit(f"page manquante : {page}")
        base = "/" if page == "404.html" else ""
        texte = source.read_text(encoding="utf-8")
        for nom, fn in [
            ("entete", lambda: bloc_entete(d, page, base)), ("pied", lambda: bloc_pied(d, page, base)),
            ("seo", lambda: bloc_seo(d, page)), ("jsonld", lambda: bloc_jsonld(d, page)),
            ("horaires", lambda: bloc_horaires(d)), ("horaires-court", lambda: bloc_horaires_court(d)),
            ("fetes", lambda: bloc_fetes(d)), ("rayons-galerie", lambda: bloc_rayons_galerie(d)),
            ("rayons-chips", lambda: bloc_rayons_chips(d)), ("rayons-detail", lambda: bloc_rayons_detail(d)),
            ("faq", lambda: bloc_faq(d)), ("editeur", lambda: bloc_editeur(d)), ("legal-court", lambda: bloc_legal_court(d)),
        ]:
            if f"<!-- donnees:{nom} -->" in texte:
                texte = remplacer(texte, nom, fn())
        sorties[source] = texte
    sorties[SITE / "assets" / "donnees.js"] = (
        "/* Fichier généré par shemtov-interne/outils/synchroniser.py à partir de donnees.json : ne pas modifier ici. */\n"
        "window.SHEMTOV = " + json.dumps({"horaires": [d["horaires"][j] for j in JOURS], "exceptions": d["exceptions"]},
                                         ensure_ascii=False) + ";\n")
    robots = "User-agent: *\nAllow: /\n"
    if d["domaine"]:
        robots += f"\nSitemap: https://{d['domaine']}/sitemap.xml\n"
        urls = "".join(f"  <url><loc>https://{d['domaine']}{c}</loc></url>\n" for c, _, plan in PAGES.values() if c and plan)
        sorties[SITE / "sitemap.xml"] = ('<?xml version="1.0" encoding="UTF-8"?>\n'
                                        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")
    sorties[SITE / "robots.txt"] = robots
    return sorties


def coherence(d, sorties):
    """Le téléphone écrit en dur dans les pages doit correspondre aux données."""
    erreurs = []
    tel = f'tel:{d["telephone"]["international"]}'
    for f, texte in sorties.items():
        if f.suffix != ".html":
            continue
        for lien in re.findall(r'href="(tel:[^"]+)"', texte):
            if lien != tel:
                erreurs.append(f"{f.name} : lien {lien} différent de {tel}")
        restes = [b for b in re.findall(r"<!-- donnees:(\w[\w-]*) -->\s*<!-- /donnees:\1 -->", texte) if b not in ("seo", "jsonld")]
        if restes:
            erreurs.append(f"{f.name} : bloc(s) vide(s) {', '.join(restes)}")
    return erreurs


def main():
    verifier = "--verifier" in sys.argv
    d = json.loads(DONNEES.read_text(encoding="utf-8"))
    erreurs = valider(d)
    sorties = construire(d)
    erreurs += coherence(d, sorties)
    if erreurs:
        print("Données invalides :")
        for x in erreurs:
            print(" -", x)
        sys.exit(1)
    a_jour = [f for f, t in sorties.items() if not f.exists() or f.read_text(encoding="utf-8") != t]
    if verifier:
        if a_jour:
            print("Fichiers non synchronisés :", ", ".join(str(f.relative_to(RACINE)) for f in a_jour))
            sys.exit(1)
        print("OK : les pages correspondent à donnees.json")
        return
    for f in a_jour:
        f.write_text(sorties[f], encoding="utf-8")
    print(f"{len(a_jour)} fichier(s) mis à jour" + (" : " + ", ".join(f.name for f in a_jour) if a_jour else ""))


if __name__ == "__main__":
    main()
