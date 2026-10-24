#!/usr/bin/env python3
"""Fabrique un aperçu autonome de chaque page du site (un fichier par page) : styles, scripts,
polices et images sont embarqués. Sert à montrer le site sans le mettre en ligne. Les liens entre
pages mènent aux autres fichiers d'aperçu ; la carte Google et les liens externes restent en ligne.

    python3 apercu.py <dossier-de-sortie>

L'aperçu garde une seule taille par image (celle de l'attribut src) pour rester léger.
"""
import base64
import mimetypes
import pathlib
import re
import sys

SITE = pathlib.Path(__file__).resolve().parents[2] / "shemtov"
PAGES = ["index.html", "le-magasin.html", "nos-rayons.html", "infos-pratiques.html", "faq.html", "contact.html",
         "mentions-legales.html", "confidentialite.html"]
SCRIPTS = ["assets/donnees.js", "assets/vendor/gsap.min.js", "assets/vendor/ScrollTrigger.min.js", "assets/site.js", "assets/anim.js"]


def data_uri(path: pathlib.Path) -> str:
    mime = "font/woff2" if path.suffix == ".woff2" else (mimetypes.guess_type(path.name)[0] or "application/octet-stream")
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def build(page: str) -> str:
    html = (SITE / page).read_text(encoding="utf-8")

    # Styles avec polices embarquées
    css = (SITE / "assets" / "style.css").read_text(encoding="utf-8")
    css = re.sub(r'url\("fonts/([^"]+)"\)', lambda m: f'url("{data_uri(SITE / "assets" / "fonts" / m.group(1))}")', css)
    html = html.replace('<link rel="stylesheet" href="assets/style.css">', f"<style>\n{css}\n</style>")
    html = re.sub(r'<link rel="preload"[^>]*>\n?', "", html)

    # Scripts : retirés de l'en-tête, embarqués en fin de page dans l'ordre d'exécution
    html = re.sub(r'<script src="assets/[^"]+" defer></script>\n?', "", html)
    if "assets/site.js" in (SITE / page).read_text(encoding="utf-8"):
        blocs = "".join(f"<script>\n{(SITE / s).read_text(encoding='utf-8')}\n</script>\n" for s in SCRIPTS)
        html = html.replace("</body>", blocs + "</body>")

    # Images : une seule taille, embarquée
    html = re.sub(r'\s(?:srcset|sizes)="[^"]*"', "", html)
    for f in sorted((SITE / "assets").rglob("*")):
        if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp") and f.is_file():
            rel = f.relative_to(SITE).as_posix()
            if f'"{rel}"' in html:
                html = html.replace(f'"{rel}"', f'"{data_uri(f)}"')

    # Liens entre pages
    for p in PAGES:
        html = html.replace(f'href="{p}', f'href="apercu-{p}')
    html = html.replace('href="./"', 'href="apercu-index.html"')
    return html


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sortie = pathlib.Path(sys.argv[1])
    sortie.mkdir(parents=True, exist_ok=True)
    for page in PAGES:
        cible = sortie / f"apercu-{page}"
        cible.write_text(build(page), encoding="utf-8")
        print(f"{cible} ({cible.stat().st_size // 1024} Ko)")
