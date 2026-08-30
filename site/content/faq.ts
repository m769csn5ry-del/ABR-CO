/* Questions fréquentes. Les réponses engagent l'entreprise : relis-les
   et ajuste les délais avant mise en ligne. Elles alimentent aussi le
   balisage FAQPage de /faq. */
import type { FaqItem } from '@/lib/types';

export const faq: FaqItem[] = [
  {
    topic: 'atelier',
    question: 'Quels matériaux acceptez-vous ?',
    answer:
      "Cuir, cuir synthétique, suède, nubuck, toile, mesh et textiles techniques. Chaque matière a son protocole : le suède est brossé à sec et détaché localement, jamais trempé. Nous refusons les paires dont la structure est compromise — décollement de semelle sur toute la longueur, déchirure de la tige, moisissure installée — et nous te le disons au diagnostic, avant toute facturation.",
  },
  {
    topic: 'atelier',
    question: 'Combien de temps prend un nettoyage ?',
    answer:
      "Compte 3 à 5 jours ouvrés pour un Essential Clean, 5 à 8 pour un Deep Clean, 10 à 21 pour un Restore. Ces fourchettes courent à partir de la réception de la paire à l'atelier, pas de la commande. Le séchage n'est pas accéléré : c'est lui qui fixe le délai, et le forcer abîme les colles.",
  },
  {
    topic: 'atelier',
    question: 'Comment envoyer ma paire ?',
    answer:
      "Après la commande, tu reçois les instructions d'expédition et l'adresse de l'atelier. Emballe la paire dans un carton, sans la boîte d'origine si elle a de la valeur pour toi — elle voyage mal. Glisse le numéro de commande dans le colis. Les frais d'envoi vers l'atelier sont à ta charge, le retour est facturé au tarif indiqué au récapitulatif.",
  },
  {
    topic: 'atelier',
    question: 'Puis-je déposer ma paire directement ?',
    answer:
      "Oui, le dépôt en main propre est proposé à l'étape 6 du parcours de commande. L'adresse et les horaires s'affichent une fois renseignés dans la configuration du site. Le dépôt évite les frais de retour si tu récupères la paire sur place.",
  },
  {
    topic: 'atelier',
    question: "Que se passe-t-il si une tache ne part pas ?",
    answer:
      "Certaines taches sont définitives : encre, huile, javel, colorant ayant migré dans la matière. Nous ne promettons pas de les retirer. Au diagnostic, nous photographions la zone et nous te disons ce qui est atteignable avant d'intervenir. Si le résultat espéré n'est pas réalisable, tu peux annuler sans frais à ce stade.",
  },
  {
    topic: 'boutique',
    question: 'Comment sont contrôlées les sneakers vendues ?',
    answer:
      "Chaque paire passe un contrôle en huit points à la réception : cohérence de l'étiquette de boîte avec le modèle et la pointure, numérotation identique sur les deux chaussures, régularité des surpiqûres, qualité des collages, densité et odeur de la matière, forme du contrefort, conformité du sockliner, état de la semelle. Le détail constaté sur la paire est publié sur sa fiche. C'est un contrôle interne, pas une certification délivrée par un tiers : nous n'en revendiquons aucune.",
  },
  {
    topic: 'commande',
    question: 'Quels moyens de paiement sont acceptés ?',
    answer:
      "Le prestataire de paiement n'est pas encore raccordé sur cette version du site. Une fois Stripe connecté, la boutique acceptera les cartes bancaires, Apple Pay et Google Pay. Aucun paiement ne peut aboutir aujourd'hui, et aucun formulaire ne demande de numéro de carte.",
  },
  {
    topic: 'commande',
    question: "Quels sont les délais d'expédition ?",
    answer:
      "Les paires en stock partent sous 24 à 48 heures ouvrées. La livraison prend ensuite 2 à 4 jours ouvrés en France métropolitaine. Le port est offert au-delà du montant indiqué dans le panier.",
  },
  {
    topic: 'commande',
    question: 'Comment suivre ma commande ?',
    answer:
      "Les commandes boutique sont suivies depuis ton compte, section Commandes, avec le numéro de suivi du transporteur dès l'expédition. Les prestations d'atelier ont leur propre suivi en neuf étapes, de la réception de la paire jusqu'à son retour : tu y accèdes avec ta référence, sans avoir à créer de compte.",
  },
  {
    topic: 'commande',
    question: 'Comment fonctionnent les retours ?',
    answer:
      "Tu disposes de 14 jours après réception pour te rétracter sur un achat en boutique, sans motif. La paire doit revenir non portée, dans son état de départ, avec sa boîte si elle en avait une. Les frais de retour sont à ta charge, sauf erreur de notre part. Les prestations d'atelier, réalisées sur ton bien propre, ne sont pas concernées par le droit de rétractation une fois l'intervention commencée.",
  },
];

export const faqTopics = [
  { id: 'atelier' as const, label: 'Atelier' },
  { id: 'boutique' as const, label: 'Boutique' },
  { id: 'commande' as const, label: 'Commande et livraison' },
];
