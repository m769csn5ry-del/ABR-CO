/* Les six temps d'une prestation d'atelier, tels qu'ils sont annoncés
   au client. Le suivi de commande (9 statuts, lib/types.ts) est plus
   granulaire : ceci en est la lecture publique. */
export const careProcess = [
  {
    title: 'Tu choisis ta prestation',
    body: "Essential, Deep ou Restore. Si tu hésites, prends la moins chère : au diagnostic nous te dirons si elle suffit, et nous ne montons jamais en gamme sans ton accord.",
  },
  {
    title: 'Tu nous transmets ta paire',
    body: "Dépôt à l'atelier ou envoi postal. Dans les deux cas tu reçois une référence de suivi dès que la commande est enregistrée.",
  },
  {
    title: 'Diagnostic',
    body: "À réception, la paire est photographiée sous toutes ses faces et examinée matière par matière. Tu reçois ces photos et, sur un Restore, le devis chiffré.",
  },
  {
    title: 'Nettoyage ou restauration',
    body: "Le protocole suit la matière, pas la silhouette. Suède brossé à sec, cuir nourri après nettoyage, mesh traité à basse pression. Rien ne passe en machine.",
  },
  {
    title: 'Contrôle',
    body: "Séchage complet à température ambiante, puis vérification du résultat contre les photos du diagnostic. Ce qui n'a pas pu être retiré est signalé et expliqué.",
  },
  {
    title: 'Retour ou récupération',
    body: "Expédition avec numéro de suivi, ou récupération à l'atelier. La paire repart lacée et emballée.",
  },
];

/** Section confiance de la page d'accueil et de /nettoyage. */
export const trustPoints = [
  {
    title: 'Photos avant intervention',
    body: "Chaque paire est photographiée au diagnostic, avant qu'on y touche. Tu vois l'état de départ, nous aussi.",
  },
  {
    title: 'Rien ne se décide sans toi',
    body: "Si l'état constaté demande plus que la prestation commandée, on te le dit et on attend ta réponse. Pas de supplément découvert à la facture.",
  },
  {
    title: 'Le protocole suit la matière',
    body: "Suède, cuir, mesh et textile technique n'appellent pas les mêmes produits ni les mêmes températures. Aucune paire ne passe en machine.",
  },
  {
    title: 'Suivi en neuf étapes',
    body: "De « paire attendue » à « terminée », tu sais où en est ta commande sans avoir à écrire pour le demander.",
  },
  {
    title: 'Ce qui ne partira pas',
    body: "Encre, huile, javel : certaines taches sont définitives. On préfère le dire au diagnostic plutôt que de le découvrir ensemble à la fin.",
  },
  {
    title: 'Contrôle en huit points',
    body: "Les paires vendues passent le même examen à la réception. Le détail constaté est publié sur la fiche produit, défauts compris.",
  },
];
