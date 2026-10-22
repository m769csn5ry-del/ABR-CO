# BRUNFRAME

Studio créatif e-commerce : visuels publicitaires + sites e-commerce. Ce dossier est l'espace de travail de l'entreprise : stratégie, offres, portfolio, prospection, conseil.

> Statut au 22/10/2026 : phase de TEST. 0 client, portfolio en construction. Voir `docs/decisions.md`.

## Arborescence

```
BRUNFRAME/
├── CLAUDE.md          instructions permanentes (l'essentiel)
├── docs/              détail : marque, modèle, offres, prix, cibles, marketing, vente,
│                      finances, décisions, hypothèses, plan à 90 jours
├── portfolio/         suivi des 8 réalisations visées (6 visuels + 2 sites)
├── projects/          shemtov/ · maison-habitee/
├── prospecting/       règles de prospection (données personnelles dans private/, non versionné)
├── templates/         dossier du conseil, CRM (en-têtes seulement)
├── assets/            ressources de marque
└── reports/council/   dossiers et rapports de chaque conseil, par date
```

Les agents du conseil sont à la racine du dépôt : `../.claude/agents/brunframe-*.md`.

## Repères
- Décisions : `docs/decisions.md` · Hypothèses : `docs/assumptions.md` · Plan : `docs/roadmap-90j.md`.
- Lancer un conseil : copier `templates/council-dossier.md` dans `reports/council/<date>-<slug>/dossier.md`, le remplir (faits vérifiés séparés des hypothèses), puis demander « conseil complet sur … ».
