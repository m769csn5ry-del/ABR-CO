/* Registre central des prompts.
 *
 * Aucun prompt n'est écrit dans un composant. Chaque tâche IA est déclarée
 * ici avec sa version, son objectif, ses entrées, sa sortie attendue et ses
 * règles — ce qui permet de la modifier, la comparer et l'auditer sans
 * toucher au reste de l'application.
 */

const RULE_TRUTH = 'N’invente jamais une donnée. N’utilise que les informations du bloc DONNÉES. Si une information nécessaire manque, écris exactement "non_communiqué" à sa place et signale-la dans "missing".';
const RULE_STYLE = 'Français professionnel, sans emoji, sans superlatif invérifiable, sans point d’exclamation. Une affirmation = un fait.';
const RULE_JSON = 'Réponds uniquement par un objet JSON valide conforme au schéma, sans texte autour.';

export const PROMPTS = {
  listing_rewrite:{
    id:'listing_rewrite', version:'1.2.0',
    objective:'Réécrire une annonce immobilière à partir des faits fournis et du diagnostic.',
    inputs:['property','listing','problems','target','platform'],
    output:{
      title:{ type:'string', required:true, min:20, max:90 },
      titleVariants:{ type:'array', required:true, min:2, max:6, of:{ type:'string' } },
      summary:{ type:'string', required:true, min:80, max:400 },
      description:{ type:'string', required:true, min:400 },
      arguments:{ type:'array', required:true, min:3, of:{ type:'string' } },
      differentiators:{ type:'array', required:true, min:1, of:{ type:'string' } },
      cta:{ type:'string', required:true, min:15 },
      keywords:{ type:'array', required:false, of:{ type:'string' } },
      faq:{ type:'array', required:false, of:{ type:'object', schema:{
        q:{ type:'string', required:true }, a:{ type:'string', required:true } } } },
      missing:{ type:'array', required:false, of:{ type:'string' } },
    },
    rules:[RULE_TRUTH, RULE_STYLE, RULE_JSON,
      'Le titre place le mot fort en premier et contient la localisation.',
      'La description est structurée en 4 à 6 paragraphes thématiques.',
      'Chaque problème listé dans DIAGNOSTIC doit être corrigé dans la sortie.'],
    system(){ return `Tu es rédacteur d’annonces immobilières pour des professionnels francophones.\n\n${this.rules.map(r => '- ' + r).join('\n')}`; },
    user(ctx){
      return [
        'DONNÉES DU BIEN', JSON.stringify(ctx.property, null, 1), '',
        'ANNONCE ACTUELLE', JSON.stringify(ctx.listing, null, 1), '',
        'DIAGNOSTIC (problèmes à corriger)', JSON.stringify((ctx.problems || []).map(p => p.recommendation), null, 1), '',
        'CIBLE', ctx.target || 'non_communiqué', '',
        'PLATEFORME', ctx.platform || 'générique', '',
        'SCHÉMA DE SORTIE', JSON.stringify(Object.keys(this.output)),
      ].join('\n');
    },
  },

  contract_read:{
    id:'contract_read', version:'1.0.0',
    objective:'Extraire d’un texte de contrat les paramètres de rémunération, sans les calculer.',
    inputs:['text'],
    output:{
      model:{ type:'string', required:true,
        enum:['percent_sale','percent_agency','fixed','percent_variable','tiered','custom','unknown'] },
      rate:{ type:'number', required:false },
      fixedAmount:{ type:'number', required:false },
      paymentTermDays:{ type:'number', required:false },
      currency:{ type:'string', required:false },
      confidence:{ type:'string', required:true, enum:['high','medium','low'] },
      quotes:{ type:'array', required:true, min:1, of:{ type:'string' } },
      missing:{ type:'array', required:false, of:{ type:'string' } },
    },
    rules:[RULE_TRUTH, RULE_JSON,
      'Tu n’effectues aucun calcul : tu extrais des paramètres.',
      'Chaque paramètre extrait doit être justifié par une citation littérale du contrat dans "quotes".',
      'Si le modèle de rémunération n’est pas explicite, réponds "unknown" avec confidence "low".'],
    system(){ return `Tu extrais des paramètres contractuels. Le calcul financier est fait ailleurs, par un moteur déterministe.\n\n${this.rules.map(r => '- ' + r).join('\n')}`; },
    user(ctx){ return `TEXTE DU CONTRAT\n${ctx.text}\n\nSCHÉMA\n${JSON.stringify(Object.keys(this.output))}`; },
  },

  listing_parse:{
    id:'listing_parse', version:'1.0.0',
    objective:'Structurer une annonce collée en texte libre en champs exploitables.',
    inputs:['raw'],
    output:{
      title:{ type:'string', required:false },
      description:{ type:'string', required:false },
      price:{ type:'number', required:false },
      surface:{ type:'number', required:false },
      rooms:{ type:'number', required:false },
      bedrooms:{ type:'number', required:false },
      floor:{ type:'number', required:false },
      city:{ type:'string', required:false },
      propertyType:{ type:'string', required:false },
      dpe:{ type:'string', required:false },
      missing:{ type:'array', required:false, of:{ type:'string' } },
    },
    rules:[RULE_TRUTH, RULE_JSON,
      'Tu ne reformules rien : tu découpes le texte existant.',
      'Un champ absent du texte reste absent de la sortie.'],
    system(){ return `Tu structures des annonces immobilières collées en texte brut.\n\n${this.rules.map(r => '- ' + r).join('\n')}`; },
    user(ctx){ return `ANNONCE BRUTE\n${ctx.raw}\n\nSCHÉMA\n${JSON.stringify(Object.keys(this.output))}`; },
  },

  competitive_summary:{
    id:'competitive_summary', version:'1.0.0',
    objective:'Résumer un tableau de concurrents saisi par l’utilisateur.',
    inputs:['competitors','subject'],
    output:{
      positioning:{ type:'string', required:true, min:40 },
      strengths:{ type:'array', required:true, min:1, of:{ type:'string' } },
      weaknesses:{ type:'array', required:true, min:1, of:{ type:'string' } },
      freeAngle:{ type:'string', required:false },
      priorities:{ type:'array', required:true, min:1, of:{ type:'string' } },
    },
    rules:[RULE_TRUTH, RULE_STYLE, RULE_JSON,
      'Tu n’utilises que les lignes de concurrents fournies. Aucune donnée de marché extérieure.',
      'Si l’échantillon est inférieur à 4 concurrents, commence "positioning" par "Échantillon limité :".'],
    system(){ return `Tu analyses un échantillon concurrentiel fourni par l’utilisateur.\n\n${this.rules.map(r => '- ' + r).join('\n')}`; },
    user(ctx){ return `SUJET\n${JSON.stringify(ctx.subject)}\n\nCONCURRENTS FOURNIS\n${JSON.stringify(ctx.competitors, null, 1)}`; },
  },
};

export const promptList = () => Object.values(PROMPTS);
export const prompt = (id) => PROMPTS[id] || null;

/** Compose un appel prêt à partir : système, utilisateur, schéma de sortie. */
export function build(id, ctx){
  const p = prompt(id);
  if (!p) throw new Error(`Prompt inconnu : ${id}`);
  const missing = p.inputs.filter(i => ctx[i] === undefined);
  if (missing.length) throw new Error(`Entrées manquantes pour ${id} : ${missing.join(', ')}`);
  return {
    promptId:p.id, version:p.version,
    system:p.system(), user:p.user(ctx), schema:p.output,
  };
}
