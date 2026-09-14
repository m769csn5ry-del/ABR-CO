/* Point d'entrée du moteur d'analyse : mesure, détecte, note. */
import { measure } from './text.js';
import { detect } from './rules.js';
import { score } from './score.js';

/**
 * @param {{title,description}} listing
 * @param {object} context { market, professional, photoCount, photoAverage,
 *                           photoCoverage, weakPhotos, hasTarget, hasAngle }
 */
export function analyze(listing, context = {}){
  const measures = measure(listing || {});
  const problems = detect(measures, context);
  const result = score(measures, problems, context);
  return {
    measures, problems, score: result,
    summary:{
      total: result.total, potential: result.potential, gain: result.gain,
      level: result.level,
      critical: problems.filter(p => p.severity === 'critical').length,
      major: problems.filter(p => p.severity === 'major').length,
      top: problems.slice(0, 3).map(p => ({ id:p.id, title:p.explanation, action:p.action, impact:p.impact })),
    },
    engine:{ version: result.version, analyzedAt: Date.now() },
  };
}

export { measure, detect, score };
export * from './score.js';
export { CATEGORIES, SEVERITY_LABELS } from './rules.js';
