#!/usr/bin/env python3
"""Prépare les photos du site : recadrage, WebP en deux largeurs, métadonnées supprimées.

Les originaux ne sont pas dans le dépôt (trop lourds). Les ranger dans un dossier avec
les noms ci-dessous (01-fromages.png, etc.), puis :

    python3 photos.py <dossier-des-originaux>

Les fichiers produits vont dans shemtov/assets/photos/. Aucune image n'est agrandie.
"""
import pathlib
import sys

from PIL import Image

SITE = pathlib.Path(__file__).resolve().parents[2] / "shemtov"
SORTIE = SITE / "assets" / "photos"
LARGEURS = (480, 940)
# L'image principale est l'élément le plus lourd du premier affichage : une taille de plus, un peu plus compressée
SPECIAL = {"hero": ((480, 760, 940), 64)}

# nom de sortie : (original, ratio largeur/hauteur, position verticale du cadrage 0-1, boîte de recadrage facultative)
PHOTOS = {
    # Accueil et présentation
    "hero": ("15-epicerie-vue", (4, 5), 0.55, None),
    "magasin-a": ("13-epicerie-sauces", (4, 5), 0.5, None),
    "magasin-b": ("11-lait-oeufs-pain", (4, 5), 0.45, None),
    # Univers (cartes verticales)
    "u-epicerie": ("12-epicerie-conserves", (3, 4), 0.5, None),
    "u-frais": ("01-fromages", (3, 4), 0.45, None),
    "u-viandes": ("08-viandes", (3, 4), 0.55, None),
    "u-surgeles": ("05-snacks", (3, 4), 0.5, (0, 1100, 430, 1672)),  # le congélateur au premier plan
    "u-sucre": ("16-chocolats", (3, 4), 0.5, None),
    "u-boissons": ("04-vins-rouges", (3, 4), 0.45, None),
    # Étapes de la visite (paysage)
    "v-entree": ("11-lait-oeufs-pain", (4, 3), 0.5, None),
    "v-vins": ("03-vins-spiritueux", (4, 3), 0.5, None),
    "v-centre": ("17-bonbons", (4, 3), 0.42, None),
    "v-congelateurs": ("07-crackers", (4, 3), 0.78, None),
    "v-cremerie": ("02-cremerie", (4, 3), 0.5, None),
    "v-frais": ("06-traiteur-poisson", (4, 3), 0.5, None),
    "v-epicerie": ("14-epicerie-condiments", (4, 3), 0.5, None),
}


def recadrer(im, ratio, fy, boite):
    if boite:
        im = im.crop(boite)
    w, h = im.size
    rw, rh = ratio
    if w / h > rw / rh:  # trop large
        nw = round(h * rw / rh)
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = round(w * rh / rw)
    y = round((h - nh) * fy)
    return im.crop((0, y, w, y + nh))


def extras(source):
    """Icônes et image de partage (réseaux sociaux), à partir du logo et de la photo d'accueil."""
    logo = Image.open(SITE / "assets" / "logo.png").convert("RGB")
    petit = logo.copy()
    petit.thumbnail((128, 128), Image.LANCZOS)
    petit.quantize(colors=96, method=Image.Quantize.MEDIANCUT).save(SITE / "assets" / "logo-128.png", optimize=True)
    for nom, cote in (("favicon.png", 64), ("apple-touch-icon.png", 180)):
        fond = Image.new("RGB", (cote, cote), "white")
        l = logo.copy()
        l.thumbnail((round(cote * 0.92), round(cote * 0.92)), Image.LANCZOS)
        fond.paste(l, ((cote - l.width) // 2, (cote - l.height) // 2))
        fond.save(SITE / "assets" / nom, optimize=True)
    og = Image.new("RGB", (1200, 630), (23, 17, 27))
    photo = recadrer(Image.open(source / "15-epicerie-vue.png").convert("RGB"), (570, 630), 0.55, None)
    og.paste(photo.resize((570, 630), Image.LANCZOS), (630, 0))
    pastille = Image.new("RGB", (400, 400), "white")
    l = logo.copy()
    l.thumbnail((360, 360), Image.LANCZOS)
    pastille.paste(l, ((400 - l.width) // 2, (400 - l.height) // 2))
    masque = Image.new("L", (400, 400), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(masque).ellipse((0, 0, 399, 399), fill=255)
    og.paste(pastille, (115, 115), masque)
    og.save(SITE / "assets" / "og.jpg", quality=84, optimize=True)
    print("icônes et image de partage : favicon.png, apple-touch-icon.png, og.jpg")


def main(source):
    SORTIE.mkdir(parents=True, exist_ok=True)
    total = 0
    for nom, (orig, ratio, fy, boite) in PHOTOS.items():
        im = Image.open(source / f"{orig}.png").convert("RGB")
        im = recadrer(im, ratio, fy, boite)
        largeurs, qualite = SPECIAL.get(nom, (LARGEURS, 76))
        for largeur in largeurs:
            l = min(largeur, im.width)
            h = round(im.height * l / im.width)
            out = SORTIE / f"{nom}-{largeur}.webp"
            im.resize((l, h), Image.LANCZOS).save(out, "WEBP", quality=qualite, method=6)
            total += out.stat().st_size
        print(f"{nom:16} {im.width}×{im.height} → {', '.join(str(min(l, im.width)) for l in largeurs)} px")
    print(f"total : {total // 1024} Ko")
    extras(source)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(pathlib.Path(sys.argv[1]))
