#!/usr/bin/env python3
"""Prépare les images du site : photos (recadrage, WebP en plusieurs largeurs, métadonnées
supprimées), logo à fond transparent, icônes et image de partage.

Les originaux des photos ne sont pas dans le dépôt (3 à 4 Mo chacun). Les ranger dans un dossier
avec les noms ci-dessous (01-fromages.png, etc.), puis :

    python3 photos.py <dossier-des-originaux>

Le logo vient de shemtov-interne/marque/logo-hd.png. Aucune image n'est agrandie.
"""
import pathlib
import sys

import numpy as np
from PIL import Image

RACINE = pathlib.Path(__file__).resolve().parents[2]
SITE = RACINE / "shemtov"
SORTIE = SITE / "assets" / "photos"
LOGO_HD = RACINE / "shemtov-interne" / "marque" / "logo-hd.png"
LARGEURS = (480, 760, 940)
QUALITE = 72
# Images qui forment le premier affichage (LCP) sur téléphone : un peu plus compressées
SPECIAL = {"hero": (LARGEURS, 64), "r-salee": (LARGEURS, 64)}

# nom de sortie : (original, ratio largeur/hauteur, position verticale du cadrage 0-1, boîte de recadrage facultative)
PHOTOS = {
    # Accueil : mosaïque du haut de page
    "hero": ("15-epicerie-vue", (4, 5), 0.55, None),
    "hero-b": ("01-fromages", (1, 1), 0.42, None),
    "hero-c": ("17-bonbons", (1, 1), 0.45, None),
    # Rayons
    "r-salee": ("12-epicerie-conserves", (4, 5), 0.5, None),
    "r-sucree": ("16-chocolats", (4, 5), 0.45, None),
    "r-snacks": ("05-snacks", (4, 5), 0.25, None),
    "r-frais": ("02-cremerie", (4, 5), 0.45, None),
    "r-viandes": ("08-viandes", (4, 5), 0.55, None),
    "r-poissons": ("06-traiteur-poisson", (4, 5), 0.62, None),
    "r-surgeles": ("05-snacks", (4, 5), 0.5, (0, 1135, 430, 1672)),  # le congélateur au premier plan
    "r-boissons": ("04-vins-rouges", (4, 5), 0.45, None),
    "r-recevoir": ("14-epicerie-condiments", (4, 5), 0.5, (380, 150, 941, 851)),  # barquettes et vaisselle
    # Le magasin : galerie
    "m-sauces": ("13-epicerie-sauces", (4, 5), 0.5, None),
    "m-lait": ("11-lait-oeufs-pain", (4, 5), 0.45, None),
    "m-biscuits": ("10-biscuits", (4, 5), 0.5, None),
    "m-crackers": ("07-crackers", (4, 5), 0.4, None),
    "m-vins": ("03-vins-spiritueux", (4, 5), 0.5, None),
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


def logo_transparent():
    """Rend le fond blanc transparent sans liseré (même calcul que « couleur vers alpha »)."""
    rgb = np.asarray(Image.open(LOGO_HD).convert("RGB")).astype(np.float32) / 255
    alpha = np.max(1 - rgb, axis=2)
    alpha = np.clip((alpha - 0.02) / 0.98, 0, 1)  # le fond « presque blanc » devient totalement transparent
    with np.errstate(divide="ignore", invalid="ignore"):
        couleur = np.where(alpha[..., None] > 0, (rgb - (1 - alpha[..., None])) / alpha[..., None], 0)
    rgba = np.dstack([np.clip(couleur, 0, 1), alpha])
    im = Image.fromarray((rgba * 255).round().astype(np.uint8), "RGBA")
    return im.crop(im.getbbox())


def extras(source):
    logo = logo_transparent()
    for nom, cote, qualite in (("logo-160.webp", 160, 90), ("logo-320.webp", 320, 82), ("logo-480.webp", 480, 90)):
        l = logo.copy()
        l.thumbnail((cote, cote), Image.LANCZOS)
        l.save(SITE / "assets" / nom, "WEBP", quality=qualite, method=6)
    for nom, cote, marge in (("favicon.png", 64, 0.04), ("apple-touch-icon.png", 180, 0.1)):
        fond = Image.new("RGBA", (cote, cote), (255, 255, 255, 255))
        l = logo.copy()
        l.thumbnail((round(cote * (1 - 2 * marge)),) * 2, Image.LANCZOS)
        fond.alpha_composite(l, ((cote - l.width) // 2, (cote - l.height) // 2))
        fond.convert("RGB").save(SITE / "assets" / nom, optimize=True)
    # Image de partage 1200 × 630 : logo sur fond crème, photo du magasin à droite
    og = Image.new("RGBA", (1200, 630), (250, 248, 244, 255))
    photo = recadrer(Image.open(source / "15-epicerie-vue.png").convert("RGB"), (570, 630), 0.55, None)
    og.paste(photo.resize((570, 630), Image.LANCZOS), (630, 0))
    l = logo.copy()
    l.thumbnail((420, 420), Image.LANCZOS)
    og.alpha_composite(l, ((630 - l.width) // 2, (630 - l.height) // 2))
    og.convert("RGB").save(SITE / "assets" / "og.jpg", quality=84, optimize=True)
    print("logo transparent (160, 320 et 480 px), favicon.png, apple-touch-icon.png, og.jpg")


def main(source):
    SORTIE.mkdir(parents=True, exist_ok=True)
    for f in SORTIE.glob("*.webp"):  # on repart de zéro : seules les photos listées ci-dessus restent
        f.unlink()
    total = 0
    for nom, (orig, ratio, fy, boite) in PHOTOS.items():
        im = recadrer(Image.open(source / f"{orig}.png").convert("RGB"), ratio, fy, boite)
        largeurs, qualite = SPECIAL.get(nom, (LARGEURS, QUALITE))
        faites = []
        for largeur in largeurs:
            l = min(largeur, im.width)
            if l in faites:
                continue
            faites.append(l)
            out = SORTIE / f"{nom}-{largeur}.webp"
            im.resize((l, round(im.height * l / im.width)), Image.LANCZOS).save(out, "WEBP", quality=qualite, method=6)
            total += out.stat().st_size
        print(f"{nom:12} {im.width}×{im.height} → {', '.join(map(str, faites))} px")
    print(f"photos : {total // 1024} Ko")
    extras(source)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(pathlib.Path(sys.argv[1]))
