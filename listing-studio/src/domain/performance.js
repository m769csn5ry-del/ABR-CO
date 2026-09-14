/* Performances et attribution.
 *
 * Mesurer avant et après, et ne jamais présenter une corrélation comme une
 * preuve de causalité : le module calcule l'écart, indique la période
 * d'observation et signale explicitement quand l'échantillon est trop faible
 * pour conclure.
 */

export const METRICS = [
  { id:'views',     label:'Vues',        unit:'', higherIsBetter:true },
  { id:'contacts',  label:'Contacts',    unit:'', higherIsBetter:true },
  { id:'requests',  label:'Demandes',    unit:'', higherIsBetter:true },
  { id:'visits',    label:'Visites',     unit:'', higherIsBetter:true },
  { id:'offers',    label:'Offres',      unit:'', higherIsBetter:true },
  { id:'bookings',  label:'Réservations',unit:'', higherIsBetter:true },
  { id:'daysOnMarket', label:'Jours en ligne', unit:'j', higherIsBetter:false },
];
export const metric = (id) => METRICS.find(m => m.id === id) || null;

/** Un relevé : période, phase (before|after), valeurs par métrique. */
export function createReading({ dossierId, phase, from, to, values = {}, source = 'manual' }){
  return { dossierId, phase, from, to, values, source, recordedAt: Date.now() };
}

const perDay = (value, from, to) => {
  const spanDays = Math.max(1, (to - from) / 86400000);
  return value / spanDays;
};

/**
 * Compare les relevés avant et après, normalisés par jour d'exposition —
 * sans quoi une période plus longue produirait mécaniquement de meilleurs
 * chiffres.
 */
export function compare(readings = []){
  const before = readings.filter(r => r.phase === 'before');
  const after = readings.filter(r => r.phase === 'after');
  const out = { metrics:[], hasBefore:before.length > 0, hasAfter:after.length > 0, reliability:'insufficient' };

  if (!before.length || !after.length){
    out.note = !before.length
      ? 'Aucun relevé avant optimisation : l’écart ne peut pas être calculé.'
      : 'Aucun relevé après optimisation : attendez au moins deux semaines de diffusion.';
    return out;
  }

  const sumPhase = (list, id) => list.reduce((acc, r) => {
    const v = Number(r.values?.[id]);
    return isFinite(v) ? acc + perDay(v, r.from, r.to) : acc;
  }, 0);
  const spanOf = (list) => list.reduce((acc, r) => acc + Math.max(1, (r.to - r.from) / 86400000), 0);

  METRICS.forEach(m => {
    const b = sumPhase(before, m.id), a = sumPhase(after, m.id);
    if (!b && !a) return;
    const delta = a - b;
    const pct = b ? (delta / b) * 100 : null;
    out.metrics.push({
      id:m.id, label:m.label, higherIsBetter:m.higherIsBetter,
      beforePerDay: Math.round(b * 100) / 100,
      afterPerDay: Math.round(a * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      deltaPct: pct === null ? null : Math.round(pct),
      improved: m.higherIsBetter ? delta > 0 : delta < 0,
    });
  });

  const totalDays = spanOf(before) + spanOf(after);
  const volume = out.metrics.reduce((s, m) => s + m.beforePerDay + m.afterPerDay, 0);
  out.reliability = totalDays >= 28 && volume >= 20 ? 'good'
                  : totalDays >= 14 ? 'indicative' : 'insufficient';
  out.note = {
    good:'Période d’observation suffisante pour une lecture d’écart.',
    indicative:'Période courte : l’écart est indicatif, pas conclusif.',
    insufficient:'Échantillon trop faible : aucune conclusion ne peut être tirée.',
  }[out.reliability];
  out.disclaimer = 'Les écarts observés sont corrélés à l’optimisation, sans qu’une causalité puisse être établie : saisonnalité, prix et concurrence évoluent en parallèle.';
  return out;
}

/** Chaîne d'attribution : ce qui relie une optimisation à un résultat. */
export function attributionChain({ dossier, versions = [], readings = [], transaction = null, commission = null }){
  const published = versions.find(v => v.status === 'published') || versions[versions.length - 1] || null;
  return {
    dossierId: dossier?.id || null,
    clientId: dossier?.clientId || null,
    optimizedAt: published?.createdAt || null,
    publishedAt: dossier?.publishedAt || null,
    versionId: published?.id || null,
    changes: published?.changeSummary || [],
    scoreBefore: dossier?.analysis?.score?.total ?? null,
    scoreAfter: dossier?.optimization?.score?.total ?? null,
    readings: readings.length,
    transactionId: transaction?.id || null,
    transactionAt: transaction?.closedAt || null,
    commissionId: commission?.id || null,
    complete: Boolean(published && dossier?.publishedAt && transaction && commission),
  };
}
