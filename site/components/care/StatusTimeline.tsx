import { CARE_STATUSES, type CareStatus } from '@/lib/types';
import { classNames } from '@/lib/format';

/* Frise de suivi d'atelier.
 *
 * Le client doit comprendre en un coup d'œil où est sa paire : l'étape
 * courante est la seule en encre pleine, les précédentes sont cochées,
 * les suivantes restent lisibles mais en retrait. On ne masque jamais
 * la suite du parcours — savoir ce qui reste fait partie de l'info. */

const DETAIL: Record<CareStatus, string> = {
  'Commande reçue': "Ta demande est enregistrée. Les instructions partent par e-mail.",
  'Paire attendue': "On attend ta paire — dépôt à l'atelier ou colis en route.",
  'Paire reçue': "La paire est arrivée et identifiée avec ta référence.",
  Diagnostic: "Photographiée sous toutes ses faces et examinée matière par matière.",
  'Nettoyage en cours': "Traitement en atelier, selon le protocole de la matière.",
  Contrôle: "Séchage complet, puis vérification du résultat contre les photos du diagnostic.",
  Prête: "Terminée, lacée et emballée.",
  'Expédiée / récupérable': "En route vers toi, ou disponible à l'atelier.",
  Terminée: "Dossier clos. Merci.",
};

export function StatusTimeline({ current }: { current: CareStatus }) {
  const index = CARE_STATUSES.indexOf(current);

  return (
    <ol className="border-t border-mineral-line">
      {CARE_STATUSES.map((status, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li
            key={status}
            aria-current={active ? 'step' : undefined}
            className={classNames(
              'flex gap-4 border-b border-mineral-line py-4 sm:gap-6',
              !done && !active && 'opacity-55',
            )}
          >
            {/* Repère : la graduation du système graphique. */}
            <span aria-hidden="true" className="mt-2 flex w-6 shrink-0 justify-center">
              <span
                className={classNames(
                  'block',
                  active
                    ? 'h-2.5 w-2.5 rounded-pill bg-verdigris'
                    : done
                      ? 'h-px w-6 bg-verdigris'
                      : 'h-px w-3 bg-mineral-line',
                )}
              />
            </span>

            <div className="flex-1">
              <p
                className={classNames(
                  'text-body',
                  active ? 'font-medium text-verdigris' : done ? 'text-ink' : 'text-mineral',
                )}
              >
                {status}
                {active ? <span className="sr-only"> — étape en cours</span> : null}
                {done ? <span className="sr-only"> — terminée</span> : null}
              </p>
              <p className="mt-1 text-small text-mineral">{DETAIL[status]}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
