/* Fournisseur IA — appelle l'API Claude depuis le SERVEUR uniquement.
 *
 * La clé vit dans la variable d'environnement ANTHROPIC_API_KEY et ne quitte
 * jamais ce processus : le frontend n'appelle que /api/*.
 *
 * Le SDK officiel est une dépendance optionnelle : s'il n'est pas installé,
 * le serveur répond « non configuré » et l'application bascule sur son moteur
 * local, sans interruption pour l'utilisateur.
 */

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 16000);

let clientPromise = null;
let sdkAvailable = null;

async function client(){
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!clientPromise){
    clientPromise = import('@anthropic-ai/sdk')
      .then(mod => { sdkAvailable = true; const Anthropic = mod.default; return new Anthropic(); })
      .catch(err => {
        sdkAvailable = false;
        console.warn('[ia] SDK @anthropic-ai/sdk absent — mode local côté navigateur. (' + err.message + ')');
        return null;
      });
  }
  return clientPromise;
}

export async function status(){
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  if (hasKey) await client();
  return {
    configured: hasKey && sdkAvailable !== false,
    provider: hasKey ? 'anthropic' : null,
    model: hasKey ? MODEL : null,
    sdk: sdkAvailable === null ? 'non chargé' : sdkAvailable ? 'installé' : 'absent',
  };
}

/* ---------- Consigne système commune ----------
   La règle de véracité est portée par le prompt ET vérifiée côté application :
   toute valeur absente doit rester marquée « Information manquante ». */
const SYSTEM = `Tu rédiges des annonces de location courte durée pour des professionnels francophones.

Règles absolues :
- N'invente JAMAIS une caractéristique du logement. N'utilise que les faits fournis dans le JSON d'entrée.
- Si une information nécessaire manque, écris exactement « [Information manquante : <champ> ] » au lieu de la deviner.
- N'invente ni commerce, ni distance, ni point d'intérêt : n'utilise que ceux listés dans "attractions".
- Aucun emoji. Pas de superlatif invérifiable. Français naturel, orienté réservation.
- Respecte le ton demandé et les limites de longueur indiquées.`;

function factsPayload(project, options){
  return JSON.stringify({
    logement: project.property,
    positionnement: project.positioning,
    plateformes: project.platforms,
    prix: project.pricing,
    nombre_de_photos: project.photoCount ?? null,
    ton_demande: options.tone || project.positioning?.tone || 'premium',
  }, null, 2);
}

/* Schéma de l'annonce — `strict: true` garantit un JSON conforme. */
const LISTING_TOOL = {
  name: 'publier_annonce',
  description: 'Renvoie l’annonce complète structurée.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title','titles','hook','shortDescription','longDescription','highlights','rooms',
               'services','location','activities','practical','rules','checkin','checkout',
               'instructions','tips','faq','cta'],
    properties: {
      title: { type:'string' },
      titles: { type:'array', items:{ type:'string' } },
      hook: { type:'string' },
      shortDescription: { type:'string' },
      longDescription: { type:'string' },
      highlights: { type:'array', items:{ type:'string' } },
      rooms: { type:'array', items:{ type:'object', additionalProperties:false,
        required:['name','text'], properties:{ name:{type:'string'}, text:{type:'string'} } } },
      services: { type:'array', items:{ type:'string' } },
      location: { type:'string' },
      activities: { type:'array', items:{ type:'string' } },
      practical: { type:'array', items:{ type:'object', additionalProperties:false,
        required:['k','v'], properties:{ k:{type:'string'}, v:{type:'string'} } } },
      rules: { type:'array', items:{ type:'string' } },
      checkin: { type:'string' },
      checkout: { type:'string' },
      instructions: { type:'array', items:{ type:'string' } },
      tips: { type:'array', items:{ type:'string' } },
      faq: { type:'array', items:{ type:'object', additionalProperties:false,
        required:['q','a'], properties:{ q:{type:'string'}, a:{type:'string'} } } },
      cta: { type:'string' },
    },
  },
};

export async function generate({ project, options = {} }){
  const c = await client();
  if (!c) return { error:'not_configured' };

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    tools: [LISTING_TOOL],
    tool_choice: { type:'tool', name:'publier_annonce' },
    messages: [{
      role:'user',
      content: `Rédige l’annonce complète à partir de ces informations, sans rien ajouter :\n\n${factsPayload(project, options)}`,
    }],
  });

  const block = response.content.find(b => b.type === 'tool_use');
  if (!block) return { error:'empty_response' };

  return {
    content: { ...block.input, meta:{ engine:'server', model: response.model, generatedAt: Date.now() } },
    model: response.model,
    usage: response.usage,
  };
}

export async function rewrite({ project, section, instruction, options = {} }){
  const c = await client();
  if (!c) return { error:'not_configured' };

  const current = project.content?.[section] ?? '';
  const response = await c.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM + '\n\nTu réécris UNE section. Réponds uniquement par le texte réécrit, sans préambule.',
    messages: [{
      role:'user',
      content: `Section : ${section}\nConsigne : ${instruction}\n\nTexte actuel :\n${current}\n\n` +
               `Faits disponibles (ne rien ajouter au-delà) :\n${factsPayload(project, options)}`,
    }],
  });

  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  return { text, model: response.model };
}

export async function chat({ messages = [], project = null }){
  const c = await client();
  if (!c) return { error:'not_configured' };

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM + '\n\nTu assistes un professionnel sur son projet d’annonce. Réponses courtes et actionnables.',
    messages: [
      ...(project ? [{ role:'user', content:`Contexte du projet :\n${factsPayload(project, {})}` },
                     { role:'assistant', content:'Contexte reçu.' }] : []),
      ...messages.map(m => ({ role: m.role === 'me' ? 'user' : 'assistant', content: String(m.text || '') })),
    ],
  });

  return {
    reply: response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim(),
    actions: [],
    model: response.model,
  };
}

/* L'analyse d'image tourne dans le navigateur (mesures réelles sur les pixels).
   Ce point d'entrée existe pour brancher un service de vision sans toucher au
   frontend ; il répond « non configuré » tant qu'aucun n'est câblé. */
export async function vision(){
  return { error:'not_configured', detail:'Analyse photo assurée localement par le navigateur.' };
}
