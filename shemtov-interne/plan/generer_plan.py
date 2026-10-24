#!/usr/bin/env python3
"""Plan 2D schématique de SHEMTOV FOCH (version 1), vu du dessus.

Repère fictif de 1 000 x 1 500 unités, sans échelle réelle : les murs suivent les
coordonnées du prompt master, les meubles respectent l'ordre et l'orientation décrits.
Le script écrit plan-2d-v1.svg à côté de lui et vérifie les consignes avant d'écrire.
Document de travail interne : le plan n'est pas publié sur le site (retiré à la refonte V4).

    python3 generer_plan.py
"""
import math
import pathlib
import sys
from xml.sax.saxutils import escape

W, H = 1000, 1500
WALL = 12  # épaisseur du trait des murs

# ---------------------------------------------------------------- murs
# Contour extérieur, en deux tracés pour laisser l'ouverture de l'entrée (x de 600 à 720).
OUTER_LEFT = "M180,200 L180,540 Q165,565 165,590 L180,1290 L600,1240"
OUTER_RIGHT = "M720,1240 L810,1210 L810,510 L790,495 L510,510 L510,250 L410,250 L340,215 L180,200"
# Polygone de référence (entrée fermée) pour les contrôles
OUTLINE = [(180, 200), (180, 540), (165, 590), (180, 1290), (600, 1240), (720, 1240), (810, 1210),
           (810, 510), (790, 495), (510, 510), (510, 250), (410, 250), (340, 215)]
# Retours de murs de l'entrée, murs intérieurs
WALL_SEGMENTS = {
    "retour entrée 1": ((610, 1250), (625, 1345)),
    "retour entrée 2": ((720, 1250), (735, 1345)),
    "mur intérieur haut": ((380, 530), (510, 530)),
    "jonction mur intérieur haut": ((510, 530), (510, 510)),
    "mur intérieur gauche": ((180, 900), (335, 885)),
    "mur intérieur droit": ((630, 825), (810, 825)),
}
# Segments du contour, pour la distance meubles / murs
OUTER_SEGMENTS = [
    ((180, 200), (180, 540)), ((180, 540), (165, 590)), ((165, 590), (180, 1290)), ((180, 1290), (600, 1240)),
    ((720, 1240), (810, 1210)), ((810, 1210), (810, 510)), ((810, 510), (790, 495)), ((790, 495), (510, 510)),
    ((510, 510), (510, 250)), ((510, 250), (410, 250)), ((410, 250), (340, 215)), ((340, 215), (180, 200)),
]

# ---------------------------------------------------------------- meubles
# (identifiant, genre, x, y, largeur, hauteur, lignes d'étiquette)
FURNITURE = [
    # Zone A : épicerie (extension en haut à gauche)
    ("ep_conserves", "etagere", 205, 228, 125, 56, ["CONSERVES", "THON", "MAQUEREAUX"]),
    ("ep_sauces", "etagere", 350, 266, 150, 46, ["SAUCES TOMATES", "PESTO"]),
    ("ep_epices", "etagere", 462, 330, 38, 140, ["ÉPICES"]),
    ("ep_vaisselle", "etagere", 190, 300, 42, 170, ["COUVERTS, ASSIETTES", "VERRES"]),
    # Zone B : réfrigérateurs du mur gauche
    ("frigo_fromage", "frigo", 188, 575, 60, 145, ["FRIGO FROMAGE"]),
    ("frigo_yaourt", "frigo", 188, 728, 60, 145, ["FRIGO YAOURT", "/ CRÈMERIE"]),
    # Zone C : centre supérieur
    ("gateaux", "etagere", 400, 555, 220, 42, ["ÉTAGÈRE GÂTEAUX"]),
    ("cong_poisson", "congelateur", 340, 650, 270, 90, ["CONGÉLATEUR POISSON"]),
    ("cong_glaces", "congelateur", 340, 770, 270, 90, ["CONGÉLATEUR GLACES / PIZZAS"]),
    ("crackers", "etagere", 430, 910, 170, 40, ["GÂTEAUX / CRACKERS"]),
    ("chips", "etagere", 430, 965, 170, 40, ["CHIPS"]),
    # Zone D : mur droit supérieur
    ("frigo_poisson", "frigo", 745, 525, 58, 110, ["FRIGO", "POISSON", "SURIMI"]),
    ("frigo_viande", "frigo", 745, 643, 58, 110, ["FRIGO VIANDE", "CHARCUTERIE"]),
    ("choco_confiture", "etagere", 690, 770, 113, 40, ["CHOCOLAT /", "CONFITURE"]),
    # Zone E : partie inférieure gauche
    ("vin", "etagere", 188, 918, 60, 215, ["RAYON VIN"]),
    ("chocolat", "etagere", 205, 1205, 150, 42, ["RAYON CHOCOLAT"]),
    # Zone F : centre inférieur
    ("cong_legumes", "congelateur", 390, 1030, 72, 140, ["CONGÉLATEUR", "LÉGUMES / FRITES"]),
    ("cong_boeuf", "congelateur", 480, 1030, 72, 140, ["CONGÉLATEUR", "BŒUF / POULET"]),
    ("bonbons", "etagere", 390, 1190, 162, 34, ["BONBONS"]),
    # Zone G : partie inférieure droite
    ("caisse", "caisse", 740, 880, 63, 130, ["CAISSE"]),
    ("lait", "etagere", 745, 1060, 58, 135, ["LAIT / ŒUFS /", "PAIN DE MIE"]),
]
F = {f[0]: f for f in FURNITURE}

STYLE = {
    "frigo": dict(fill="#DCEEFF", stroke="#6FA8DC", text="#111111"),
    "congelateur": dict(fill="#A9B8C8", stroke="#5F7388", text="#111111"),
    "etagere": dict(fill="#EFE3C8", stroke="#B59E6B", text="#111111"),
    "caisse": dict(fill="#4A4A4A", stroke="#222222", text="#FFFFFF"),
}
WALL_COLOR = "#C62828"


# ---------------------------------------------------------------- géométrie
def rect(fid):
    _, _, x, y, w, h, _ = F[fid]
    return x, y, w, h


def point_in_polygon(px, py, poly):
    inside = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def dist_point_segment(px, py, a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def segments_cross(p1, p2, p3, p4):
    def ccw(a, b, c):
        return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])
    return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)


def dist_rect_segment(r, a, b):
    x, y, w, h = r
    corners = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    edges = [(corners[i], corners[(i + 1) % 4]) for i in range(4)]
    if any(segments_cross(a, b, e[0], e[1]) for e in edges):
        return 0.0
    if x <= a[0] <= x + w and y <= a[1] <= y + h:
        return 0.0
    best = min(dist_point_segment(cx, cy, a, b) for cx, cy in corners)
    for px, py in (a, b):
        for e in edges:
            best = min(best, dist_point_segment(px, py, e[0], e[1]))
    return best


def rects_overlap(r1, r2, gap=0):
    return not (r1[0] + r1[2] + gap <= r2[0] or r2[0] + r2[2] + gap <= r1[0]
                or r1[1] + r1[3] + gap <= r2[1] or r2[1] + r2[3] + gap <= r1[1])


# ---------------------------------------------------------------- contrôles
def verifier():
    erreurs = []
    ids = [f[0] for f in FURNITURE]

    # 1 à 4 : aucun meuble hors du magasin, ni sur un mur, ni sur un autre meuble
    toutes_murs = OUTER_SEGMENTS + list(WALL_SEGMENTS.values())
    for fid in ids:
        r = rect(fid)
        cx, cy = r[0] + r[2] / 2, r[1] + r[3] / 2
        if not point_in_polygon(cx, cy, OUTLINE):
            erreurs.append(f"{fid} : hors du magasin")
        for a, b in toutes_murs:
            if dist_rect_segment(r, a, b) < WALL / 2 + 1:
                erreurs.append(f"{fid} : touche un mur")
                break
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            if rects_overlap(rect(a), rect(b), gap=6):
                erreurs.append(f"{a} et {b} : trop proches ou superposés")

    # Contrôles du prompt, un par un
    ext = lambda fid: rect(fid)[0] >= 180 and rect(fid)[0] + rect(fid)[2] <= 510 and rect(fid)[1] + rect(fid)[3] <= 530
    if not all(ext(f) for f in ("ep_conserves", "ep_sauces", "ep_epices", "ep_vaisselle")):
        erreurs.append("1. l'épicerie n'est pas entièrement dans l'extension haut gauche")
    if not all(f[0] in F for f in [(k,) for k in ("frigo_fromage", "frigo_yaourt")]):
        erreurs.append("5. frigos gauche manquants")
    for fid in ("frigo_fromage", "frigo_yaourt", "vin"):
        if rect(fid)[0] - (180 + WALL / 2) > 12:
            erreurs.append(f"5. {fid} n'est pas plaqué contre le mur gauche")
    if not rect("frigo_fromage")[1] < rect("frigo_yaourt")[1] < WALL_SEGMENTS["mur intérieur gauche"][0][1]:
        erreurs.append("5. frigo fromage / yaourt mal ordonnés ou pas au-dessus du petit mur gauche")
    cx = lambda fid: rect(fid)[0]
    if cx("cong_poisson") != cx("cong_glaces") or not rect("cong_poisson")[1] < rect("cong_glaces")[1]:
        erreurs.append("6. congélateurs supérieurs non alignés verticalement")
    if rect("cong_legumes")[1] != rect("cong_boeuf")[1] or not cx("cong_legumes") < cx("cong_boeuf"):
        erreurs.append("7. congélateurs inférieurs non côte à côte")
    centre = ["gateaux", "cong_poisson", "cong_glaces", "crackers", "chips", "cong_legumes", "bonbons"]
    ys = [rect(f)[1] for f in centre]
    if ys != sorted(ys):
        erreurs.append("8. ordre vertical du centre incorrect")
    droite = ["frigo_poisson", "frigo_viande", "choco_confiture", "caisse", "lait"]
    ys = [rect(f)[1] for f in droite]
    if ys != sorted(ys):
        erreurs.append("8. ordre du mur droit incorrect")
    if rect("caisse")[0] < 600:
        erreurs.append("9. la caisse n'est pas à droite")
    for fid in ("vin", "chocolat", "bonbons"):
        if rect(fid)[1] < 885:
            erreurs.append(f"10. {fid} n'est pas dans la partie inférieure")
    if not rect("choco_confiture")[1] + rect("choco_confiture")[3] < WALL_SEGMENTS["mur intérieur droit"][0][1] < rect("caisse")[1]:
        erreurs.append("le mur intérieur droit doit séparer les frigos de la caisse")
    # Entrée dégagée : rien entre x = 600 et x = 735 sous y = 1150
    for fid in ids:
        r = rect(fid)
        if r[1] + r[3] > 1150 and r[0] < 735 and r[0] + r[2] > 600:
            erreurs.append(f"4. {fid} bouche l'entrée")
    return erreurs


# ---------------------------------------------------------------- dessin
def etiquette(fid, kind, x, y, w, h, lignes):
    """Texte centré, tourné de 90° dans les meubles hauts et étroits."""
    vertical = h > w * 1.25
    dispo_long = (h if vertical else w) - 12
    dispo_court = (w if vertical else h) - 8
    fs = 15
    while fs > 9 and (max(len(t) for t in lignes) * 0.64 * fs > dispo_long or len(lignes) * (fs + 3) > dispo_court):
        fs -= 0.5
    if fs < 11:
        raise SystemExit(f"étiquette trop longue pour {fid} (taille {fs})")
    cx, cy = x + w / 2, y + h / 2
    interligne = fs + 3
    top = cy - (len(lignes) - 1) * interligne / 2
    couleur = STYLE[kind]["text"]
    tspans = "".join(
        f'<tspan x="{cx:.1f}" y="{top + i * interligne + fs * 0.35:.1f}">{escape(t)}</tspan>'
        for i, t in enumerate(lignes))
    rot = f' transform="rotate(-90 {cx:.1f} {cy:.1f})"' if vertical else ""
    return (f'<text text-anchor="middle" font-size="{fs:g}" font-weight="700" fill="{couleur}"{rot}>{tspans}</text>')


def svg():
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
           f'font-family="Arial, Helvetica, sans-serif">',
           '<title>Plan 2D schématique de SHEMTOV FOCH, version 1</title>',
           f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>',
           '<text x="500" y="72" text-anchor="middle" font-size="30" font-weight="700" fill="#111111">SHEMTOV FOCH · PLAN 2D SCHÉMATIQUE</text>',
           '<text x="500" y="104" text-anchor="middle" font-size="16" fill="#444444">Version 1 · vue du dessus · proportions approximatives, sans échelle · à valider avant toute 3D</text>',
           '<text x="500" y="168" text-anchor="middle" font-size="14" font-weight="700" fill="#777777">▲ FOND DU MAGASIN</text>']
    walls = f'fill="none" stroke="{WALL_COLOR}" stroke-width="{WALL}" stroke-linejoin="round" stroke-linecap="butt"'
    out.append(f'<g id="murs"><path d="{OUTER_LEFT}" {walls}/><path d="{OUTER_RIGHT}" {walls}/>')
    for (a, b) in WALL_SEGMENTS.values():
        out.append(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{WALL_COLOR}" stroke-width="{WALL}" stroke-linecap="butt"/>')
    out.append('</g>')
    out.append('<text x="345" y="500" text-anchor="middle" font-size="13" font-weight="700" letter-spacing="2" fill="#999999">ZONE ÉPICERIE</text>')
    out.append('<g id="meubles">')
    for fid, kind, x, y, w, h, lignes in FURNITURE:
        s = STYLE[kind]
        out.append(f'<rect id="{fid}" x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="{s["fill"]}" stroke="{s["stroke"]}" stroke-width="2"/>')
        out.append(etiquette(fid, kind, x, y, w, h, lignes))
    out.append('</g>')
    out.append('<text x="672" y="1378" text-anchor="middle" font-size="20" font-weight="700" fill="#111111">ENTRÉE</text>')
    out.append('<path d="M672 1360 L672 1316 M662 1328 L672 1314 L682 1328" fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')
    # Légende
    items = [("Murs", WALL_COLOR, WALL_COLOR), ("Frigos", "#DCEEFF", "#6FA8DC"), ("Congélateurs", "#A9B8C8", "#5F7388"),
             ("Étagères", "#EFE3C8", "#B59E6B"), ("Caisse", "#4A4A4A", "#222222")]
    x = 150
    for nom, fill, stroke in items:
        out.append(f'<rect x="{x}" y="1440" width="26" height="18" rx="2" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
        out.append(f'<text x="{x + 34}" y="1455" font-size="16" fill="#111111">{escape(nom)}</text>')
        x += 34 + len(nom) * 9.5 + 34
    out.append('</svg>')
    return "\n".join(out)


if __name__ == "__main__":
    erreurs = verifier()
    if erreurs:
        print("Contrôles en échec :")
        for e in erreurs:
            print(" -", e)
        sys.exit(1)
    cible = pathlib.Path(__file__).with_name("plan-2d-v1.svg")
    cible.write_text(svg(), encoding="utf-8")
    print(f"OK · {len(FURNITURE)} meubles, tous les contrôles passent · {cible.name}")
