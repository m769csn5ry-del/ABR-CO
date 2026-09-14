/* Validation des sorties IA.
 *
 * Une réponse de modèle est une donnée non fiable tant qu'elle n'a pas été
 * vérifiée. Ce module décrit les formes attendues, rejette ce qui ne s'y
 * conforme pas, et ne laisse jamais une sortie invalide atteindre la base ou
 * l'interface.
 */

export class SchemaError extends Error {
  constructor(problems){
    super(`Sortie invalide : ${problems[0]?.message || 'forme inattendue'}`);
    this.name = 'SchemaError'; this.problems = problems;
  }
}

const typeOf = (v) => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;

/** Schéma minimal : { field: {type, required, min, max, items, of, enum} } */
export function validate(value, schema, path = ''){
  const problems = [];
  if (typeOf(value) !== 'object'){
    return [{ path: path || '.', message:'Un objet était attendu.' }];
  }
  Object.entries(schema).forEach(([key, rule]) => {
    const v = value[key];
    const here = path ? `${path}.${key}` : key;
    if (v === undefined || v === null || v === ''){
      if (rule.required) problems.push({ path:here, message:`Champ obligatoire manquant : ${key}.` });
      return;
    }
    const t = typeOf(v);
    if (rule.type && t !== rule.type){
      problems.push({ path:here, message:`${key} : ${rule.type} attendu, ${t} reçu.` });
      return;
    }
    if (rule.type === 'string'){
      if (rule.min && v.trim().length < rule.min) problems.push({ path:here, message:`${key} trop court (${v.length} < ${rule.min}).` });
      if (rule.max && v.length > rule.max) problems.push({ path:here, message:`${key} trop long (${v.length} > ${rule.max}).` });
      if (rule.enum && !rule.enum.includes(v)) problems.push({ path:here, message:`${key} : valeur hors liste.` });
    }
    if (rule.type === 'array'){
      if (rule.min && v.length < rule.min) problems.push({ path:here, message:`${key} : ${rule.min} élément(s) attendu(s).` });
      if (rule.max && v.length > rule.max) problems.push({ path:here, message:`${key} : maximum ${rule.max} éléments.` });
      if (rule.of) v.forEach((item, i) => {
        if (typeOf(item) !== rule.of.type) problems.push({ path:`${here}[${i}]`, message:`élément ${rule.of.type} attendu.` });
        else if (rule.of.type === 'object' && rule.of.schema)
          problems.push(...validate(item, rule.of.schema, `${here}[${i}]`));
      });
    }
  });
  return problems;
}

export const isValid = (value, schema) => validate(value, schema).length === 0;

export function assertValid(value, schema){
  const problems = validate(value, schema);
  if (problems.length) throw new SchemaError(problems);
  return value;
}

/** Extrait un objet JSON d'une réponse textuelle, sans faire confiance au format. */
export function extractJSON(text){
  if (typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{'), end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try{ return JSON.parse(candidate.slice(start, end + 1)); }catch{ return null; }
}

/** Garde-fou de véracité : refuse une sortie citant des faits non fournis. */
export function checkNoInvention(output, allowedFacts){
  const problems = [];
  const haystack = JSON.stringify(output).toLowerCase();
  // Les nombres suivis de m² ou € doivent exister dans les faits fournis.
  const claimed = haystack.match(/\d+[\d\s.,]*\s?(m²|€|euros)/g) || [];
  const allowed = JSON.stringify(allowedFacts).toLowerCase();
  claimed.forEach(c => {
    const digits = c.replace(/[^\d]/g, '');
    if (digits.length >= 2 && !allowed.includes(digits))
      problems.push({ path:'output', message:`Valeur « ${c.trim()} » absente des informations fournies.` });
  });
  return problems;
}
