#!/usr/bin/env python3
"""Reporte shemtov-interne/contenu/donnees.json dans les pages du site.

Les données (horaires, exceptions, fêtes, coordonnées légales, plan) ne se saisissent qu'à un
seul endroit : donnees.json. Ce script remplace les blocs balisés <!-- donnees:xxx --> des pages
et écrit assets/donnees.js, robots.txt et, une fois le domaine connu, sitemap.xml.

    python3 synchroniser.py              # met à jour les fichiers
    python3 synchroniser.py --verifier   # échoue si un fichier n'est pas à jour (pour les tests)
"""
import html
import json
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parents[2]
SITE = RACINE / "shemtov"
DONNEES = RACINE / "shemtov-interne" / "contenu" / "donnees.json"
PLAN = RACINE / "shemtov-interne" / "plan" / "plan-web.svg"
PAGES = {"index.html": "/", "mentions-legales.html": "/mentions-legales.html",
         "confidentialite.html": "/confidentialite.html", "404.html": None}
JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
ORDRE_AFFICHAGE = [1, 2, 3, 4, 5, 6, 0]
MOIS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"]
SCHEMA_JOURS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
HEURE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
e = html.escape


def heure(hhmm):
    h, m = hhmm.split(":")
    return f"{int(h)}h{m if m != '00' else ''}"


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
    return erreurs


def bloc_horaires(d):
    lignes = []
    for i in ORDRE_AFFICHAGE:
        h = d["horaires"][JOURS[i]]
        valeur = f"{heure(h[0])} – {heure(h[1])}" if h else "Fermé"
        classe = "" if h else ' class="off"'
        lignes.append(f'<tr data-jour="{i}"><th scope="row">{JOURS[i].capitalize()}</th><td{classe}>{valeur}</td></tr>')
    return "\n".join(lignes)


def bloc_fetes(d):
    lignes = []
    for f in d["fetes"]:
        a, m, j = f["debut"].split("-")
        texte = e(f["texte"]).replace(" 1er ", " 1<sup>er</sup> ")
        lignes.append(f'<li class="fete" data-start="{f["debut"]}" data-end="{f["fin"]}">'
                      f'<div class="date"><b>{int(j)}</b><span>{MOIS[int(m) - 1]}</span></div>'
                      f'<div><div class="fname">{e(f["nom"])}</div><div class="fwhen">{texte}</div></div>'
                      f'<span class="pill"></span></li>')
    return "\n".join(lignes)


def bloc_jsonld(d):
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
        "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": jours if len(jours) > 1 else jours[0],
                                       "opens": h[0], "closes": h[1]} for h, jours in groupes.items()],
        "sameAs": [d["liens"]["facebook"]],
    }
    if d["domaine"]:
        ld["url"] = f"https://{d['domaine']}/"
        ld["image"] = f"https://{d['domaine']}/assets/og.jpg"
    return '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>"


def bloc_seo(d, chemin):
    if not d["domaine"] or chemin is None:
        return ""
    url = f"https://{d['domaine']}{chemin}"
    return "\n".join([f'<link rel="canonical" href="{url}">', f'<meta property="og:url" content="{url}">',
                      f'<meta property="og:image" content="https://{d["domaine"]}/assets/og.jpg">',
                      '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">'])


def bloc_legal_court(d):
    l = d["legal"]
    return (f'{e(l["denomination"])}, {e(l["formeCourte"])} au capital de {e(l["capital"])} · SIRET {e(l["siret"])} · '
            f'{e(l["rcs"])}')


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
        parts += ["<h2>Responsable de la publication</h2>", f"<p>{e(l['responsablePublication'])}</p>"]
    if l.get("hebergeur"):
        h = l["hebergeur"]
        parts += ["<h2>Hébergeur</h2>", f"<p>{e(h['nom'])}<br>{e(h['adresse'])}"
                  + (f"<br>{e(h['telephone'])}" if h.get("telephone") else "")
                  + (f'<br><a href="{e(h["site"])}">{e(h["site"])}</a>' if h.get("site") else "") + "</p>"]
    return "\n".join(parts)


def remplacer(texte, nom, contenu):
    motif = re.compile(rf"(<!-- donnees:{nom} -->)(.*?)(<!-- /donnees:{nom} -->)", re.S)
    if not motif.search(texte):
        return texte, False
    return motif.sub(lambda m: m.group(1) + ("\n" + contenu + "\n" if contenu else "") + m.group(3), texte), True


def construire(d):
    sorties = {}
    plan = PLAN.read_text(encoding="utf-8")
    for page, chemin in PAGES.items():
        source = SITE / page
        if not source.exists():
            continue
        texte = source.read_text(encoding="utf-8")
        for nom, contenu in [("seo", bloc_seo(d, chemin)), ("legal-court", bloc_legal_court(d)),
                             ("jsonld", bloc_jsonld(d)), ("horaires", bloc_horaires(d)), ("fetes", bloc_fetes(d)),
                             ("plan", plan), ("editeur", bloc_editeur(d))]:
            texte, _ = remplacer(texte, nom, contenu)
        sorties[source] = texte
    js_horaires = [d["horaires"][j] for j in JOURS]
    sorties[SITE / "assets" / "donnees.js"] = (
        "/* Fichier généré par shemtov-interne/outils/synchroniser.py à partir de donnees.json : ne pas modifier ici. */\n"
        "window.SHEMTOV = " + json.dumps({"horaires": js_horaires, "exceptions": d["exceptions"]}, ensure_ascii=False) + ";\n")
    robots = "User-agent: *\nAllow: /\n"
    if d["domaine"]:
        robots += f"\nSitemap: https://{d['domaine']}/sitemap.xml\n"
        urls = "".join(f"  <url><loc>https://{d['domaine']}{c}</loc></url>\n" for c in PAGES.values() if c)
        sorties[SITE / "sitemap.xml"] = ('<?xml version="1.0" encoding="UTF-8"?>\n'
                                        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")
    sorties[SITE / "robots.txt"] = robots
    return sorties


def coherence(d, sorties):
    """Le téléphone et l'adresse écrits en dur dans les pages doivent correspondre aux données."""
    erreurs = []
    tel = f'tel:{d["telephone"]["international"]}'
    for f, texte in sorties.items():
        if f.suffix != ".html":
            continue
        for lien in re.findall(r'href="(tel:[^"]+)"', texte):
            if lien != tel:
                erreurs.append(f"{f.name} : lien {lien} différent de {tel}")
        if "tel:" in texte and d["telephone"]["affiche"] not in texte:
            erreurs.append(f"{f.name} : numéro affiché absent ou différent")
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
