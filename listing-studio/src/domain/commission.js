/* Moteur de commissions.
 *
 * Principe : le calcul financier est déterministe et exécuté par des règles,
 * jamais par un modèle de langage. L'IA peut lire un contrat et proposer une
 * configuration ; c'est ce module qui calcule, et lui seul.
 *
 * Chaque calcul renvoie sa TRACE : la suite d'opérations, avec le libellé, la
 * valeur d'entrée et le montant produit. Une commission doit pouvoir être
 * réexpliquée à un client, ou vérifiée deux ans plus tard.
 */

import * as M from './money.js';

export const ENGINE_VERSION = '1.0.0';

/* ---------- Modèles de rémunération ---------- */
export const MODELS = {
  percent_sale: {
    id:'percent_sale', label:'Pourcentage du prix de vente',
    describe:(c) => `${c.rate} % du prix de la transaction`,
    fields:['rate'],
    base:(tx) => ({ amount: tx.amount, label:'Prix de la transaction' }),
  },
  percent_agency: {
    id:'percent_agency', label:'Pourcentage de la commission d’agence',
    describe:(c) => `${c.rate} % de la commission encaissée par l’agence`,
    fields:['rate'],
    base:(tx) => ({ amount: tx.agencyCommission, label:'Commission de l’agence' }),
  },
  fixed: {
    id:'fixed', label:'Montant fixe',
    describe:(c, cur) => `Forfait de ${M.format(M.money(c.fixedAmount, cur))}`,
    fields:['fixedAmount'],
    base:() => null,
  },
  percent_variable: {
    id:'percent_variable', label:'Pourcentage variable selon le montant',
    describe:(c) => `Taux variable selon ${(c.tiers || []).length} seuil(s)`,
    fields:['tiers'],
    base:(tx) => ({ amount: tx.amount, label:'Prix de la transaction' }),
  },
  tiered: {
    id:'tiered', label:'Commission par palier (marginale)',
    describe:(c) => `${(c.tiers || []).length} palier(s) appliqués par tranche`,
    fields:['tiers'],
    base:(tx) => ({ amount: tx.amount, label:'Prix de la transaction' }),
  },
  custom: {
    id:'custom', label:'Modèle personnalisé',
    describe:() => 'Combinaison de règles',
    fields:['rules'],
    base:(tx) => ({ amount: tx.amount, label:'Prix de la transaction' }),
  },
};
export const modelList = () => Object.values(MODELS);
export const model = (id) => MODELS[id] || null;

/* ---------- Statuts ---------- */
export const STATUSES = ['pending','estimated','due','paid','overdue','cancelled'];
export const STATUS_LABELS = {
  pending:'En attente', estimated:'Estimée', due:'Exigible',
  paid:'Payée', overdue:'En retard', cancelled:'Annulée',
};
/** Transitions autorisées : une commission ne saute pas d'état. */
export const STATUS_FLOW = {
  pending:['estimated','cancelled'],
  estimated:['due','cancelled','estimated'],
  due:['paid','overdue','cancelled'],
  overdue:['paid','cancelled'],
  paid:[],
  cancelled:[],
};
export const canTransition = (from, to) => (STATUS_FLOW[from] || []).includes(to);

/* ---------- Erreurs de configuration ---------- */
export class CommissionConfigError extends Error {
  constructor(message, field){ super(message); this.name='CommissionConfigError'; this.field=field; }
}

/** Vérifie qu'un contrat est calculable AVANT d'en dépendre. */
export function validateConfig(config){
  const problems = [];
  const m = model(config?.model);
  if (!m) return [{ field:'model', message:'Modèle de rémunération inconnu.' }];

  if (m.fields.includes('rate')){
    const r = Number(config.rate);
    if (!isFinite(r) || r <= 0) problems.push({ field:'rate', message:'Taux manquant ou nul.' });
    if (r > 100) problems.push({ field:'rate', message:'Un taux supérieur à 100 % est refusé.' });
  }
  if (m.fields.includes('fixedAmount')){
    if (!Number.isInteger(config.fixedAmount) || config.fixedAmount <= 0)
      problems.push({ field:'fixedAmount', message:'Montant forfaitaire manquant (en centimes).' });
  }
  if (m.fields.includes('tiers')){
    const t = config.tiers;
    if (!Array.isArray(t) || !t.length) problems.push({ field:'tiers', message:'Aucun palier défini.' });
    else {
      let last = -1;
      t.forEach((tier, i) => {
        if (!isFinite(Number(tier.upTo)) && tier.upTo !== null)
          problems.push({ field:`tiers[${i}].upTo`, message:'Seuil invalide.' });
        if (!isFinite(Number(tier.rate)))
          problems.push({ field:`tiers[${i}].rate`, message:'Taux de palier invalide.' });
        const bound = tier.upTo === null ? Infinity : Number(tier.upTo);
        if (bound <= last) problems.push({ field:`tiers[${i}].upTo`, message:'Les seuils doivent être croissants.' });
        last = bound;
      });
      if (t[t.length - 1]?.upTo !== null)
        problems.push({ field:'tiers', message:'Le dernier palier doit être ouvert (upTo: null).' });
    }
  }
  if (config.minAmount != null && config.maxAmount != null && config.minAmount > config.maxAmount)
    problems.push({ field:'minAmount', message:'Le plancher dépasse le plafond.' });
  return problems;
}

/* ---------- Calcul ---------- */
/**
 * @param {object} contract  { model, rate, fixedAmount, tiers, minAmount, maxAmount, vatRate, currency }
 * @param {object} tx        { amount:Money, agencyCommission:Money|null, currency }
 * @returns {{ok:boolean, amount:Money, trace:Array, ...}}
 */
export function compute(contract, tx){
  const cur = tx?.amount?.currency || contract?.currency || 'EUR';
  const problems = validateConfig(contract);
  if (problems.length)
    return { ok:false, problems, amount:M.zero(cur), trace:[], engineVersion:ENGINE_VERSION };

  const m = model(contract.model);
  const trace = [];
  const step = (label, detail, amount) => { trace.push({ label, detail, amount: M.serialize(amount) }); return amount; };

  let result;

  if (contract.model === 'fixed'){
    result = step('Forfait contractuel', m.describe(contract, cur), M.money(contract.fixedAmount, cur));
  } else {
    const baseSpec = m.base(tx);
    const base = baseSpec?.amount;
    if (!base || typeof base.amount !== 'number')
      return { ok:false, problems:[{ field:'transaction',
        message: contract.model === 'percent_agency'
          ? 'Commission d’agence non renseignée sur la transaction.'
          : 'Montant de transaction manquant.' }], amount:M.zero(cur), trace, engineVersion:ENGINE_VERSION };

    step('Base de calcul', baseSpec.label, base);

    if (contract.model === 'percent_sale' || contract.model === 'percent_agency'){
      result = step(`Application du taux`, `${contract.rate} % de la base`, M.percentOf(base, contract.rate));
    }

    if (contract.model === 'percent_variable'){
      const tier = contract.tiers.find(t => t.upTo === null || base.amount <= Number(t.upTo));
      step('Palier retenu', tier.upTo === null
        ? `Au-delà de ${M.format(M.money(Number(contract.tiers[contract.tiers.length - 2]?.upTo || 0), cur))}`
        : `Jusqu’à ${M.format(M.money(Number(tier.upTo), cur))}`, base);
      result = step('Application du taux', `${tier.rate} % sur la totalité`, M.percentOf(base, tier.rate));
    }

    if (contract.model === 'tiered'){
      let remaining = base.amount, floor = 0, total = M.zero(cur);
      for (const tier of contract.tiers){
        if (remaining <= 0) break;
        const ceiling = tier.upTo === null ? Infinity : Number(tier.upTo);
        const slice = Math.min(remaining, ceiling - floor);
        if (slice <= 0) continue;
        const part = M.percentOf(M.money(slice, cur), tier.rate);
        step(`Tranche ${M.formatShort(M.money(floor, cur))} – ${ceiling === Infinity ? '∞' : M.formatShort(M.money(ceiling, cur))}`,
             `${tier.rate} % sur ${M.format(M.money(slice, cur))}`, part);
        total = M.add(total, part);
        remaining -= slice; floor = ceiling;
      }
      result = step('Total des tranches', 'Somme des paliers', total);
    }

    if (contract.model === 'custom'){
      let total = M.zero(cur);
      for (const rule of (contract.rules || [])){
        let part = M.zero(cur);
        if (rule.type === 'percent') part = M.percentOf(base, rule.value);
        else if (rule.type === 'fixed') part = M.money(rule.value, cur);
        else if (rule.type === 'percent_agency' && tx.agencyCommission)
          part = M.percentOf(tx.agencyCommission, rule.value);
        else continue;
        step(rule.label || 'Règle', rule.type === 'fixed' ? 'Montant fixe' : `${rule.value} %`, part);
        total = M.add(total, part);
      }
      result = step('Total des règles', 'Somme des composantes', total);
    }
  }

  // Plancher et plafond contractuels
  if (contract.minAmount != null && result.amount < contract.minAmount)
    result = step('Plancher contractuel', 'Montant relevé au minimum prévu', M.money(contract.minAmount, cur));
  if (contract.maxAmount != null && result.amount > contract.maxAmount)
    result = step('Plafond contractuel', 'Montant ramené au maximum prévu', M.money(contract.maxAmount, cur));

  const net = result;
  let vat = null, gross = net;
  if (contract.vatRate){
    vat = M.percentOf(net, contract.vatRate);
    gross = M.add(net, vat);
    step('TVA', `${contract.vatRate} % sur ${M.format(net)}`, vat);
    step('Total TTC', 'Net plus TVA', gross);
  }

  return {
    ok:true, problems:[],
    amount: net, vat, gross,
    currency: cur,
    model: contract.model,
    modelLabel: m.label,
    description: m.describe(contract, cur),
    trace,
    inputs:{
      transactionAmount: M.serialize(tx.amount),
      agencyCommission: M.serialize(tx.agencyCommission),
      rate: contract.rate ?? null,
      fixedAmount: contract.fixedAmount ?? null,
      tiers: contract.tiers ?? null,
      vatRate: contract.vatRate ?? null,
    },
    engineVersion: ENGINE_VERSION,
    computedAt: Date.now(),
  };
}

/** Échéance : date due + délai contractuel de paiement. */
export function dueDate(transactionClosedAt, paymentTermDays = 30){
  const d = new Date(transactionClosedAt || Date.now());
  d.setDate(d.getDate() + Number(paymentTermDays || 0));
  return d.getTime();
}

/** Une commission exigible dont l'échéance est dépassée bascule en retard. */
export function deriveStatus(commission, now = Date.now()){
  if (commission.status === 'due' && commission.dueAt && now > commission.dueAt) return 'overdue';
  return commission.status;
}

/** Agrégats par statut, pour le tableau de bord. */
export function summarize(commissions, currencyCode = 'EUR'){
  const out = { byStatus:{}, total:M.zero(currencyCode), receivable:M.zero(currencyCode), paid:M.zero(currencyCode) };
  STATUSES.forEach(s => { out.byStatus[s] = { count:0, amount:M.zero(currencyCode) }; });
  commissions.forEach(c => {
    const amount = M.deserialize(c.amount) || M.zero(currencyCode);
    if (amount.currency !== currencyCode) return;   // pas d'addition entre devises
    const status = deriveStatus(c);
    out.byStatus[status].count++;
    out.byStatus[status].amount = M.add(out.byStatus[status].amount, amount);
    if (status !== 'cancelled') out.total = M.add(out.total, amount);
    if (status === 'due' || status === 'overdue') out.receivable = M.add(out.receivable, amount);
    if (status === 'paid') out.paid = M.add(out.paid, amount);
  });
  return out;
}
