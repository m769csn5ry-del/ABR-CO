/* Catalogue des problèmes détectables.
 *
 * Chaque règle est une fonction pure des mesures : elle produit un problème
 * typé (catégorie, gravité, explication, recommandation, priorité, action) ou
 * rien. Ajouter un critère d'analyse revient à ajouter une règle ici.
 *
 * `impact` exprime le nombre de points de score récupérables : c'est ce qui
 * ordonne les priorités affichées à l'opérateur et au client.
 */

export const CATEGORIES = {
  title:'Titre', description:'Description', structure:'Structure',
  information:'Informations', trust:'Confiance', conversion:'Conversion',
  seo:'Référencement', differentiation:'Différenciation', legal:'Mentions',
  photos:'Photos', pricing:'Prix',
};
export const SEVERITIES = ['critical','major','minor','info'];
export const SEVERITY_LABELS = { critical:'Critique', major:'Important', minor:'Mineur', info:'Remarque' };

const problem = (o) => ({ severity:'major', ...o });

/* Chaque règle : { id, when(m, ctx) -> boolean, build(m, ctx) -> problem } */
export const RULES = [
  /* ---- Titre ---- */
  { id:'title_missing', category:'title',
    when:(m) => !m.title.length,
    build:() => problem({ severity:'critical', impact:12,
      explanation:'L’annonce n’a pas de titre exploitable.',
      recommendation:'Rédiger un titre de 40 à 70 caractères : type de bien, atout principal, localisation.',
      action:'generate_title' }) },
  { id:'title_short', category:'title',
    when:(m) => m.title.length > 0 && m.title.length < 25,
    build:(m) => problem({ severity:'major', impact:6,
      explanation:`Titre de ${m.title.length} caractères : trop court pour porter un argument.`,
      recommendation:'Viser 40 à 70 caractères en ajoutant l’atout distinctif et le quartier.',
      action:'generate_title' }) },
  { id:'title_long', category:'title',
    when:(m) => m.title.length > 80,
    build:(m) => problem({ severity:'minor', impact:3,
      explanation:`Titre de ${m.title.length} caractères : la fin sera tronquée sur la plupart des portails.`,
      recommendation:'Ramener sous 70 caractères en plaçant le mot fort en premier.',
      action:'generate_title' }) },
  { id:'title_caps', category:'title',
    when:(m) => m.title.allCaps >= 2 || m.title.exclamations > 0,
    build:() => problem({ severity:'major', impact:5,
      explanation:'Majuscules ou points d’exclamation dans le titre : signal amateur, et parfois filtré par les portails.',
      recommendation:'Écrire en casse normale, sans ponctuation d’emphase.',
      action:'generate_title' }) },
  { id:'title_empty_words', category:'title',
    when:(m) => m.title.empty.length > 0,
    build:(m) => problem({ severity:'major', impact:5,
      explanation:`Le titre repose sur des adjectifs invérifiables : ${m.title.empty.join(', ')}.`,
      recommendation:'Remplacer par un fait mesurable : surface, étage, distance, exposition.',
      action:'generate_title' }) },

  /* ---- Description ---- */
  { id:'desc_missing', category:'description',
    when:(m) => m.description.words < 20,
    build:(m) => problem({ severity:'critical', impact:14,
      explanation:`Description de ${m.description.words} mots : insuffisante pour qualifier un bien.`,
      recommendation:'Développer à 180-350 mots, structurés en paragraphes thématiques.',
      action:'generate_description' }) },
  { id:'desc_short', category:'description',
    when:(m) => m.description.words >= 20 && m.description.words < 120,
    build:(m) => problem({ severity:'major', impact:8,
      explanation:`Description de ${m.description.words} mots : sous le seuil où le lecteur se projette.`,
      recommendation:'Viser 180 à 350 mots : ambiance, pièce par pièce, environnement, conditions.',
      action:'generate_description' }) },
  { id:'desc_wall', category:'structure',
    when:(m) => m.description.structure.paragraphs <= 1 && m.description.words > 90,
    build:() => problem({ severity:'major', impact:6,
      explanation:'Le texte forme un seul bloc : sur mobile, il n’est pas lu.',
      recommendation:'Découper en 4 à 6 paragraphes thématiques.',
      action:'restructure' }) },
  { id:'desc_long_paragraph', category:'structure',
    when:(m) => m.description.structure.longestParagraphWords > 120,
    build:(m) => problem({ severity:'minor', impact:3,
      explanation:`Un paragraphe atteint ${m.description.structure.longestParagraphWords} mots.`,
      recommendation:'Aucun paragraphe au-delà de 80 mots.',
      action:'restructure' }) },
  { id:'desc_readability', category:'description',
    when:(m) => m.description.words > 60 && m.description.readability.avgSentence > 28,
    build:(m) => problem({ severity:'minor', impact:4,
      explanation:`Phrases de ${m.description.readability.avgSentence} mots en moyenne : lecture difficile.`,
      recommendation:'Viser 15 à 20 mots par phrase.',
      action:'rewrite_simple' }) },
  { id:'desc_empty_words', category:'description',
    when:(m) => m.description.empty.length >= 3,
    build:(m) => problem({ severity:'major', impact:6,
      explanation:`${m.description.empty.length} adjectifs invérifiables : ${m.description.empty.slice(0, 5).join(', ')}.`,
      recommendation:'Un fait par affirmation : « lumineux » devient « double exposition est-ouest ».',
      action:'generate_description' }) },
  { id:'desc_repetition', category:'description',
    when:(m) => m.description.repetitions.length > 0,
    build:(m) => problem({ severity:'minor', impact:2,
      explanation:`Répétitions marquées : ${m.description.repetitions.map(r => `${r.word} (${r.count}×)`).join(', ')}.`,
      recommendation:'Varier le vocabulaire ou supprimer les redites.',
      action:'generate_description' }) },

  /* ---- Informations ---- */
  { id:'info_surface', category:'information',
    when:(m) => !m.facts.surface,
    build:() => problem({ severity:'critical', impact:8,
      explanation:'Aucune surface mentionnée : critère de filtre numéro un, et information attendue par tout acquéreur.',
      recommendation:'Indiquer la surface, et la surface Carrez lorsqu’elle s’applique.',
      action:'ask_client', field:'surface' }) },
  { id:'info_rooms', category:'information',
    when:(m) => !m.facts.rooms,
    build:() => problem({ severity:'major', impact:5,
      explanation:'Nombre de pièces absent du texte.',
      recommendation:'Préciser le nombre de pièces et de chambres.',
      action:'ask_client', field:'rooms' }) },
  { id:'info_floor', category:'information',
    when:(m) => !m.facts.floor,
    build:() => problem({ severity:'minor', impact:3,
      explanation:'Étage non précisé : question systématique en visite.',
      recommendation:'Indiquer l’étage et la présence d’un ascenseur.',
      action:'ask_client', field:'floor' }) },
  { id:'info_transport', category:'information',
    when:(m) => !m.facts.transport,
    build:() => problem({ severity:'minor', impact:3,
      explanation:'Aucun repère de transport ou de distance.',
      recommendation:'Ajouter deux repères réels : temps à pied jusqu’à un axe connu, ligne de transport.',
      action:'ask_client', field:'transport' }) },
  { id:'info_availability', category:'information',
    when:(m) => !m.facts.availability,
    build:() => problem({ severity:'minor', impact:2,
      explanation:'Disponibilité non indiquée.',
      recommendation:'Préciser la date de disponibilité ou l’occupation actuelle.',
      action:'ask_client', field:'availability' }) },

  /* ---- Mentions réglementaires (France) ---- */
  { id:'legal_dpe', category:'legal',
    when:(m, ctx) => ctx.market === 'sale' || ctx.market === 'rental' ? !m.facts.dpe : false,
    build:() => problem({ severity:'major', impact:6,
      explanation:'Aucune mention de performance énergétique dans le texte de l’annonce.',
      recommendation:'Faire figurer la classe énergie et la classe climat. Les obligations d’affichage évoluent : vérifier la réglementation en vigueur avant publication.',
      action:'ask_client', field:'dpe', verify:true }) },
  { id:'legal_fees', category:'legal',
    when:(m, ctx) => ctx.professional === true && !m.facts.fees,
    build:() => problem({ severity:'major', impact:4,
      explanation:'Aucune mention d’honoraires alors que l’annonce est diffusée par un professionnel.',
      recommendation:'Indiquer le montant des honoraires, qui les supporte, et si le prix les inclut. Vérifier les obligations d’affichage en vigueur.',
      action:'ask_client', field:'fees', verify:true }) },
  { id:'legal_charges', category:'legal',
    when:(m, ctx) => ctx.market === 'rental' && !m.facts.charges,
    build:() => problem({ severity:'major', impact:4,
      explanation:'Loyer annoncé sans mention des charges.',
      recommendation:'Préciser le loyer hors charges, le montant des charges et le dépôt de garantie.',
      action:'ask_client', field:'charges', verify:true }) },

  /* ---- Conversion et confiance ---- */
  { id:'no_cta', category:'conversion',
    when:(m) => !m.cta,
    build:() => problem({ severity:'major', impact:5,
      explanation:'Aucun appel à l’action : le lecteur ne sait pas quoi faire ensuite.',
      recommendation:'Terminer par une action unique et concrète : demander une visite, obtenir le dossier complet.',
      action:'generate_cta' }) },
  { id:'low_trust', category:'trust',
    when:(m) => m.trustMarkers <= 2,
    build:(m) => problem({ severity:'major', impact:6,
      explanation:`Seulement ${m.trustMarkers} élément(s) vérifiable(s) dans tout le texte : l’annonce repose sur des impressions.`,
      recommendation:'Ajouter des faits chiffrés : surfaces, année, distances, charges, exposition.',
      action:'generate_description' }) },
  { id:'no_differentiation', category:'differentiation',
    when:(m) => m.keywords.length > 0 && m.keywords.every(k => k.count <= 1) && m.description.words < 150,
    build:() => problem({ severity:'minor', impact:3,
      explanation:'Aucun angle dominant ne se dégage : le texte pourrait décrire n’importe quel bien.',
      recommendation:'Choisir un argument principal et le porter dans le titre, l’ouverture et la conclusion.',
      action:'positioning' }) },

  /* ---- Photos ---- */
  { id:'photos_few', category:'photos',
    when:(m, ctx) => ctx.photoCount !== null && ctx.photoCount < 8,
    build:(m, ctx) => problem({ severity: ctx.photoCount < 4 ? 'critical' : 'major',
      impact: ctx.photoCount < 4 ? 10 : 6,
      explanation:`${ctx.photoCount} photo(s) : en dessous du seuil de crédibilité.`,
      recommendation:'Fournir 12 à 20 photos couvrant toutes les pièces.',
      action:'ask_photos' }) },
  { id:'photos_weak', category:'photos',
    when:(m, ctx) => ctx.weakPhotos > 0,
    build:(m, ctx) => problem({ severity:'major', impact: Math.min(8, ctx.weakPhotos * 2),
      explanation:`${ctx.weakPhotos} photo(s) sous 55/100 à l’analyse d’image.`,
      recommendation:'Reprendre ces prises de vue en lumière naturelle, verticales redressées.',
      action:'reshoot_photos' }) },
];

/** Applique toutes les règles et renvoie les problèmes ordonnés. */
export function detect(measures, context = {}){
  const ctx = { market:'sale', professional:true, photoCount:null, weakPhotos:0, ...context };
  const rank = { critical:0, major:1, minor:2, info:3 };
  return RULES
    .filter(r => { try{ return r.when(measures, ctx); }catch{ return false; } })
    .map(r => {
      const p = r.build(measures, ctx);
      return {
        id:r.id, category:r.category, categoryLabel:CATEGORIES[r.category],
        severityLabel:SEVERITY_LABELS[p.severity], ...p,
      };
    })
    .sort((a, b) => (rank[a.severity] - rank[b.severity]) || (b.impact - a.impact))
    .map((p, i) => ({ ...p, priority:i + 1 }));
}
