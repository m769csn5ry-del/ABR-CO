#!/usr/bin/env python3
"""Fabrique un aperçu d'une seule page par fichier HTML du site : styles, script, polices,
logo et photos présentes sont embarqués. Utile pour montrer le site sans le mettre en ligne.

    python3 apercu.py <dossier-de-sortie>
"""
import base64
import mimetypes
import pathlib
import re
import sys

SITE = pathlib.Path(__file__).resolve().parents[2] / "shemtov"
PAGES = ["index.html", "mentions-legales.html"]


def data_uri(path: pathlib.Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if path.suffix == ".woff2":
        mime = "font/woff2"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def build(page: str) -> str:
    html = (SITE / page).read_text(encoding="utf-8")

    # Feuille de style : polices en data URI, puis balise <style>
    css = (SITE / "assets" / "style.css").read_text(encoding="utf-8")
    css = re.sub(r'url\("fonts/([^"]+)"\)', lambda m: f'url("{data_uri(SITE / "assets" / "fonts" / m.group(1))}")', css)
    html = re.sub(r'<link rel="preload"[^>]*>\n?', "", html)
    html = html.replace('<link rel="stylesheet" href="assets/style.css">', f"<style>\n{css}\n</style>")

    # Script
    js = (SITE / "assets" / "site.js").read_text(encoding="utf-8")
    html = html.replace('<script src="assets/site.js"></script>', f"<script>\n{js}\n</script>")

    # Images : logo et photos présentes
    for f in sorted((SITE / "assets").rglob("*")):
        if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp") and f.is_file():
            rel = f.relative_to(SITE).as_posix()
            html = html.replace(f'"{rel}"', f'"{data_uri(f)}"')

    # Liens entre pages
    for p in PAGES:
        html = html.replace(f'href="{p}"', f'href="apercu-{p}"')
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
