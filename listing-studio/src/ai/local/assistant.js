/* Assistant conversationnel — compréhension d'intentions en français.
 *
 * L'assistant ne modifie jamais le projet de lui-même : il propose des
 * actions, l'utilisateur valide. Chaque réponse est construite à partir de
 * l'état réel du projet (score, photos, informations manquantes), jamais
 * d'une supposition.
 */

import { TONES, AUDIENCES, tone as toneOf, audience as audienceOf, PLANS } from '../../data/options.js';
import { trimTo, words, num } from '../../core/util.js';

const norm = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const INTENTS = [
  // L'ordre compte : une demande de ciblage prime sur une demande de ton.
  { id:'audience',    rx:/(cible|cibler|orient|adapte|optimis|clientele|destine|pour (les|une|un) )[^.]*?(couple|famille|ami|professionnel|business|affaires|touriste|budget|longue duree|long sejour)/ },
  { id:'titles',      rx:/(titre|titres|accroche|headline)/ },
  { id:'tone',        rx:/(premium|luxe|chaleureux|professionnel|minimaliste|familial|touristique|ton direct)\b/ },
  { id:'shorten',     rx:/(plus courte?|raccourci|resume|condense|trop longue)/ },
  { id:'lengthen',    rx:/(plus longue?|developpe|enrichi|etoffe|trop courte)/ },
  { id:'improve',     rx:/(ameliorer|amelioration|que dois-je|quoi faire|optimiser l|comment progresser|faiblesse|point faible)/ },
  { id:'photos',      rx:/(photo|image|cliche|refaire.*photo|quelles photos)/ },
  { id:'score',       rx:/(score|note|notation|combien.*100)/ },
  { id:'price',       rx:/(prix|tarif|pricing|combien louer|nuitee)/ },
  { id:'platform',    rx:/(airbnb|booking|vrbo|abritel|expedia|leboncoin|pap|facebook|marketplace|plateforme)/ },
  { id:'missing',     rx:/(manque|manquant|incomplet|a completer)/ },
  { id:'regenerate',  rx:/(regenere|regenerer|refais|relance|nouvelle version)/ },
  { id:'export',      rx:/(export|pdf|copier|telecharger|csv|json)/ },
  { id:'demo',        rx:/(demo|demonstration|exemple fictif|prospect)/ },
  { id:'help',        rx:/(aide|comment|que peux-tu|capacites)/ },
];

const TONE_WORDS = {
  premium:'premium', luxe:'luxe', chaleureux:'chaleureux', professionnel:'professionnel',
  minimaliste:'minimaliste', familial:'familial', touristique:'touristique', direct:'direct',
};
const AUDIENCE_WORDS = {
  couple:'couple', famille:'famille', ami:'amis', professionnel:'pro', business:'pro',
  affaires:'pro', touriste:'touristes', luxe:'luxe', budget:'budget', longue:'longue',
};

export function detectIntent(text){
  const t = norm(text);
  for (const i of INTENTS){ if (i.rx.test(t)) return i.id; }
  return 'unknown';
}

/**
 * @param {string} text  message utilisateur
 * @param {object} ctx   { project, photos, score, pricing }
 * @returns {{text:string, bullets?:string[], actions:Array, intent:string}}
 */
export function respond(text, ctx = {}){
  const t = norm(text);
  const intent = detectIntent(text);
  const { project = {}, photos = [], score = null, pricing = null } = ctx;
  const content = project.content || null;

  switch (intent){
    case 'tone': {
      const key = Object.keys(TONE_WORDS).find(k => t.includes(k));
      const id = TONE_WORDS[key] || 'premium';
      const label = toneOf(id).label;
      return {
        intent, text:`Je peux repasser toute l’annonce sur un ton ${label.toLowerCase()} : titre, accroche, descriptions et appel à l’action sont réécrits à partir des mêmes informations, sans rien ajouter au logement.`,
        actions:[{ id:'setTone', label:`Appliquer le ton ${label}`, payload:{ tone:id }, primary:true }],
      };
    }
    case 'titles': {
      const n = (t.match(/(\d+)/) || [])[1] || 5;
      return {
        intent,
        text:`Voici ${n} pistes de titres construites sur vos atouts déclarés. Le titre retenu s’applique en un clic ; les autres restent disponibles à l’étape Annonce.`,
        actions:[{ id:'proposeTitles', label:`Proposer ${n} titres`, payload:{ count:Number(n) }, primary:true }],
      };
    }
    case 'audience': {
      const key = Object.keys(AUDIENCE_WORDS).find(k => t.includes(k));
      const id = AUDIENCE_WORDS[key] || 'couple';
      const label = audienceOf(id)?.label || id;
      const suggestedTone = { pro:'professionnel', luxe:'luxe', famille:'familial',
                              couple:'chaleureux', budget:'direct', touristes:'touristique' }[id];
      const actions = [{ id:'setAudience', label:`Cibler ${label}`, payload:{ audience:id }, primary:true }];
      if (suggestedTone) actions.push({ id:'setToneAndAudience', label:`Cibler ${label} et passer au ton ${toneOf(suggestedTone).label}`,
                                        payload:{ audience:id, tone:suggestedTone } });
      return {
        intent,
        text:`Je recentre le positionnement sur « ${label} » : les arguments, le ton et l’ordre des points forts sont réalignés sur cette cible. Aucun élément du logement n’est ajouté au passage.`,
        actions,
      };
    }
    case 'shorten':
      return {
        intent,
        text:`La description longue fait ${words(content?.longDescription || '')} mots. Je peux la ramener à l’essentiel en conservant les faits : capacité, équipements forts, localisation, conditions.`,
        actions:[{ id:'resize', label:'Raccourcir la description', payload:{ factor:0.6 }, primary:true },
                 { id:'setTone', label:'Passer en ton minimaliste', payload:{ tone:'minimaliste' } }],
      };
    case 'lengthen':
      return {
        intent,
        text:'Je développe la description à partir des informations disponibles. Les zones encore vides resteront marquées « Information manquante » plutôt que comblées par de l’invention.',
        actions:[{ id:'resize', label:'Développer la description', payload:{ factor:1.5 }, primary:true }],
      };
    case 'improve': {
      const list = (score?.improvements || []).slice(0, 5).map(i => `${i.text} (+${i.gain} pts)`);
      return {
        intent,
        text: score
          ? `Score actuel : ${score.total}/100 (${score.levelLabel}). Potentiel estimé : ${score.potential}/100. Priorités :`
          : 'Générez d’abord l’annonce : le score et les priorités seront calculés à partir du contenu réel.',
        bullets:list,
        actions:[{ id:'openStep', label:'Ouvrir l’optimisation', payload:{ step:9 }, primary:true }],
      };
    }
    case 'photos': {
      const weak = photos.filter(p => (p.analysis?.scores?.score || 0) < 55);
      const mid  = photos.filter(p => { const s = p.analysis?.scores?.score || 0; return s >= 55 && s < 70; });
      const bullets = [
        ...weak.map(p => `À refaire — ${p.label || p.filename} (${p.analysis?.scores?.score || 0}/100) : ${(p.analysis?.recommendations || []).map(r => r.text).slice(0, 2).join(', ')}`),
        ...mid.map(p => `À retravailler — ${p.label || p.filename} (${p.analysis?.scores?.score || 0}/100)`),
      ];
      return {
        intent,
        text: photos.length
          ? (bullets.length ? 'Voici les photos à reprendre en priorité :' : 'Aucune photo sous le seuil critique. La galerie tient la route.')
          : 'Aucune photo importée pour l’instant. Huit à quinze photos sont nécessaires pour une annonce crédible.',
        bullets,
        actions:[{ id:'openStep', label:'Ouvrir les photos', payload:{ step:3 }, primary:true }],
      };
    }
    case 'score':
      return {
        intent,
        text: score
          ? `Listing Score : ${score.total}/100 — ${score.levelLabel}.`
          : 'Le score se calcule après la génération de l’annonce.',
        bullets: score ? Object.entries(score.parts).map(([k, p]) => `${k} : ${p.value}/${p.max}`) : [],
        actions:[{ id:'openStep', label:'Voir le détail', payload:{ step:9 } }],
      };
    case 'price':
      return {
        intent,
        text: pricing?.ok
          ? `Recommandation interne : ${num(pricing.recommended)} ${project.property?.currency === 'USD' ? '$' : '€'} par nuit (fourchette ${num(pricing.floor)} – ${num(pricing.ceiling)}). Positionnement : ${pricing.positioning}. Cette estimation s’appuie sur vos saisies, pas sur des relevés de marché.`
          : 'Renseignez un prix de référence dans le module Pricing : la recommandation en découle.',
        actions:[{ id:'openStep', label:'Ouvrir le pricing', payload:{ step:8 }, primary:true }],
      };
    case 'platform':
      return {
        intent,
        text:'Je peux adapter le contenu au format d’une plateforme précise, ou produire toutes les versions d’un coup. Chaque adaptateur applique ses propres limites de longueur et ses sections.',
        actions:[{ id:'openStep', label:'Choisir les plateformes', payload:{ step:6 }, primary:true },
                 { id:'setPlatforms', label:'Générer pour toutes les plateformes', payload:{ platforms:'all' } }],
      };
    case 'missing': {
      const list = (content?.missing || []).map(m => `${m.label} — ${m.why}`);
      return {
        intent,
        text: list.length ? 'Informations encore attendues :' : 'Aucune information obligatoire ne manque.',
        bullets:list.slice(0, 8),
        actions: list.length ? [{ id:'openStep', label:'Compléter la fiche', payload:{ step:1 }, primary:true }] : [],
      };
    }
    case 'regenerate':
      return {
        intent,
        text:'Je relance une génération complète avec une nouvelle variation de formulation. Les faits restent identiques ; seule la rédaction change.',
        actions:[{ id:'regenerate', label:'Régénérer l’annonce', payload:{}, primary:true }],
      };
    case 'export':
      return {
        intent,
        text:'Export disponible en texte, JSON, CSV et PDF, avec une version par plateforme sélectionnée.',
        actions:[{ id:'openStep', label:'Ouvrir l’export', payload:{ step:13 }, primary:true }],
      };
    case 'demo':
      return {
        intent,
        text:'Le mode démo crée un projet fictif complet — logement, photos de démonstration, annonce, score et aperçu — clairement identifié comme démonstration.',
        actions:[{ id:'demo', label:'Générer une démo', payload:{}, primary:true }],
      };
    case 'help':
    default:
      return {
        intent:'help',
        text:'Je travaille sur ce projet. Exemples de demandes que je traite :',
        bullets:[
          'Rends cette annonce plus premium',
          'Donne-moi 5 meilleurs titres',
          'Cible davantage les couples',
          'Rends la description plus courte',
          'Que dois-je améliorer ?',
          'Quelles photos dois-je refaire ?',
          'Optimise cette annonce pour une clientèle professionnelle',
        ],
        actions:[],
      };
  }
}

export const SUGGESTIONS = [
  'Rends cette annonce plus premium',
  'Donne-moi 5 meilleurs titres',
  'Cible davantage les couples',
  'Rends la description plus courte',
  'Que dois-je améliorer ?',
  'Quelles photos dois-je refaire ?',
  'Optimise cette annonce pour une clientèle professionnelle',
];

export { TONES, AUDIENCES, PLANS };
