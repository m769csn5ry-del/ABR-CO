/* Rédaction des messages adressés aux prospects et aux clients.
 *
 * Chaque message est construit à partir de données réelles du dossier ou du
 * prospect. Aucune promesse chiffrée n'est inventée : quand une donnée manque,
 * la phrase qui s'y rapporte disparaît au lieu d'être comblée.
 *
 * Rien n'est envoyé : aucun service de messagerie n'est connecté. Ces textes
 * sont des brouillons à relire, copier et envoyer depuis votre propre boîte.
 */

import { leadStatus } from './crm.js';
import * as M from './money.js';

const DAY = 86400000;
const days = (ms) => Math.floor(ms / DAY);
const num = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));

/* Marqueurs d'une raison sociale : « Bonjour Agence » est pire qu'un
   « Bonjour » nu. Dans le doute, on ne suppose pas de prénom. */
const COMPANY = /\b(agence|sarl|sas|sasu|sci|eurl|immobilier|immo|conciergerie|gestion|groupe|cabinet|société|societe|associés|associes|partners|invest|patrimoine)\b/i;

/**
 * Prénom d'usage. Renvoyé seulement quand le nom ressemble à celui d'une
 * personne : deux mots au plus, aucun marqueur de société, pas de parenthèse.
 */
const firstName = (name) => {
  const n = String(name || '').trim();
  if (!n || COMPANY.test(n) || /[(),]/.test(n)) return '';
  const parts = n.split(/\s+/);
  if (parts.length > 3) return '';
  return parts[0];
};

const clean = (lines) => lines.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();

/* ---------- Relance d'un prospect ---------- */
/**
 * Le numéro de relance découle du nombre de messages déjà préparés : le ton
 * se resserre, et la troisième propose explicitement d'en rester là.
 */
export function followUpDraft(lead){
  const attempt = Math.min(3, (lead.followUpCount || 0) + 1);
  const st = leadStatus(lead.status);
  const last = lead.lastContactAt || lead.updatedAt || lead.createdAt;
  const idle = days(Date.now() - last);
  const who = firstName(lead.name);
  const hello = who ? `Bonjour ${who},` : 'Bonjour,';

  const bodies = {
    1: clean([
      hello,
      st.id === 'audit_sent'
        ? 'Je vous ai transmis l’audit de votre annonce la semaine dernière. Avez-vous eu le temps de le parcourir ?'
        : 'Je me permets de revenir vers vous au sujet de l’optimisation de vos annonces.',
      'Si le sujet est d’actualité, dites-moi simplement quel créneau vous arrange cette semaine : quinze minutes suffisent pour faire le tour.',
      'Bien à vous,',
    ]),
    2: clean([
      hello,
      `Je n’ai pas eu de retour depuis ${idle} jours, ce qui est bien normal à cette période.`,
      'Deux possibilités : le sujet n’est pas prioritaire en ce moment, et je comprends parfaitement — ou il l’est mais le moment n’est pas le bon. Dans les deux cas, un mot de votre part me suffit.',
      'Bien à vous,',
    ]),
    3: clean([
      hello,
      'Dernier message de ma part sur ce sujet : je ne veux pas encombrer votre boîte.',
      'Si l’optimisation de vos annonces revient sur la table dans quelques mois, écrivez-moi, je reprendrai le dossier là où nous l’avons laissé. Sans réponse, je clôture de mon côté.',
      'Bien à vous,',
    ]),
  };

  return {
    attempt,
    subject: attempt === 1
      ? 'Suite à notre échange'
      : attempt === 2 ? 'Est-ce toujours d’actualité ?' : 'Je clôture de mon côté',
    body: bodies[attempt],
    reason: `${st.label} depuis ${idle} jour(s).`,
  };
}

/* ---------- Envoi d'un audit ---------- */
/** Ce message ne cite que des chiffres issus de l'analyse réellement exécutée. */
export function auditDraft(dossier, clientName = ''){
  const a = dossier.analysis;
  if (!a) return null;
  const who = firstName(clientName || '');
  const critical = a.problems.filter(p => p.severity === 'critical').length;
  const major = a.problems.filter(p => p.severity === 'major').length;
  const top = a.problems.slice(0, 3);

  return {
    subject: `Audit de votre annonce — ${dossier.name}`,
    body: clean([
      who ? `Bonjour ${who},` : 'Bonjour,',
      `J’ai passé votre annonce « ${dossier.name} » au crible. Elle obtient ${a.score.total} sur 100 selon la grille que j’utilise, et le potentiel atteignable en l’état des informations disponibles est de ${a.score.potential}.`,
      critical || major
        ? `J’ai relevé ${critical ? `${critical} point${critical > 1 ? 's' : ''} critique${critical > 1 ? 's' : ''}` : ''}${critical && major ? ' et ' : ''}${major ? `${major} point${major > 1 ? 's' : ''} important${major > 1 ? 's' : ''}` : ''}.`
        : 'Aucun point critique n’est ressorti.',
      top.length ? `Les trois premiers, par ordre d’impact :\n\n${top.map((p, i) => `${i + 1}. ${p.explanation}`).join('\n')}` : '',
      'Le rapport complet détaille chaque point et ce qu’il faut faire. Dites-moi si vous voulez que je m’en occupe.',
      'Bien à vous,',
    ]),
    reason: `Analyse du ${new Date(a.engine.analyzedAt).toLocaleDateString('fr-FR')}.`,
  };
}

/* ---------- Remise d'une version optimisée ---------- */
export function deliveryDraft(dossier, clientName = ''){
  const before = dossier.analysis?.score;
  const after = dossier.optimization?.score;
  if (!after) return null;
  const who = firstName(clientName || '');
  const gain = before ? after.total - before.total : null;
  const missing = dossier.optimization?.content?.missing || [];

  return {
    subject: `Version optimisée — ${dossier.name}`,
    body: clean([
      who ? `Bonjour ${who},` : 'Bonjour,',
      `Voici la version retravaillée de « ${dossier.name} ».`,
      before && gain !== null
        ? `Sur la même grille, elle passe de ${before.total} à ${after.total} sur 100${gain > 0 ? `, soit ${gain} points gagnés` : ''}.`
        : `Elle obtient ${after.total} sur 100 sur ma grille d’évaluation.`,
      missing.length
        ? `Quelques informations me manquent encore, et je préfère ne rien écrire que j’ignore : ${missing.join(', ')}. Dès que vous me les donnez, je complète le texte et le score monte d’autant.`
        : '',
      'Relisez-la : rien ne part en ligne sans votre accord.',
      'Bien à vous,',
    ]),
    reason: 'Version générée, en attente de validation.',
  };
}

/* ---------- Relance d'une commission ---------- */
export function paymentDraft(commissionRow, clientName = ''){
  const amount = M.deserialize(commissionRow.gross || commissionRow.amount);
  const late = commissionRow.dueAt ? days(Date.now() - commissionRow.dueAt) : 0;
  const who = firstName(clientName || '');

  return {
    subject: late > 0 ? 'Relance de règlement' : 'Règlement à venir',
    body: clean([
      who ? `Bonjour ${who},` : 'Bonjour,',
      late > 0
        ? `Je reviens vers vous au sujet du règlement de ${amount ? M.format(amount) : 'la commission'}, dont l’échéance était le ${new Date(commissionRow.dueAt).toLocaleDateString('fr-FR')}, soit il y a ${late} jour${late > 1 ? 's' : ''}.`
        : `Pour information, le règlement de ${amount ? M.format(amount) : 'la commission'} arrive à échéance le ${new Date(commissionRow.dueAt).toLocaleDateString('fr-FR')}.`,
      'Un oubli arrive ; si le virement est déjà parti, ne tenez pas compte de ce message. Sinon, dites-moi ce qui bloque, on trouvera une solution.',
      'Bien à vous,',
    ]),
    reason: late > 0 ? `En retard de ${late} jour(s).` : 'Échéance à venir.',
  };
}

/* ---------- Message de prospection ---------- */
/**
 * Le seul message qui s'adresse à quelqu'un qui ne nous connaît pas. Il ne
 * cite aucun chiffre sur son bien : nous n'avons rien analysé.
 */
export function prospectionDraft({ name = '', city = '', support = 'votre annonce' } = {}){
  const who = firstName(name);
  return {
    subject: 'Une remarque sur votre annonce',
    body: clean([
      who ? `Bonjour ${who},` : 'Bonjour,',
      // Pas de participe accordé : le genre de l'expéditeur ne se devine pas.
      `J’ai vu ${support}${city ? ` à ${city}` : ''}.`,
      'Je travaille sur la rédaction et la présentation des annonces immobilières : structure du texte, informations attendues par les acheteurs, ordre des photos. Rien de révolutionnaire, mais l’écart entre une annonce correcte et une annonce travaillée se voit sur le nombre de contacts.',
      'Si vous voulez, je regarde la vôtre et je vous dis ce que j’en pense, sans engagement. Répondez-moi simplement « oui » et je m’en occupe.',
      'Bien à vous,',
    ]),
    reason: 'Premier contact : aucune donnée sur le bien n’est citée.',
  };
}

export const DRAFT_KINDS = [
  { id:'followup',    label:'Relance de prospect' },
  { id:'audit',       label:'Envoi de l’audit' },
  { id:'delivery',    label:'Remise de la version optimisée' },
  { id:'payment',     label:'Relance de règlement' },
  { id:'prospection', label:'Premier contact' },
];
