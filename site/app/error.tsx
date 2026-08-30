'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';

/* Écran d'erreur. On dit ce qui s'est passé, on propose de réessayer,
   et on n'affiche jamais la pile technique au visiteur. */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // À CONNECTER : remonter l'erreur à un service de suivi (Sentry…).
    console.error(error);
  }, [error]);

  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-20">
      <h1 className="text-h2 font-semibold tracking-[-0.025em]">Quelque chose a lâché</h1>
      <p className="measure mt-5 text-lead text-mineral">
        La page n&apos;a pas pu s&apos;afficher. Ce n&apos;est pas de ton fait — réessaie, et si
        cela persiste, écris-nous.
      </p>
      {error.digest ? (
        <p className="mt-4 text-small text-mineral">
          Référence technique : <span className="tabular-nums">{error.digest}</span>
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <ButtonLink href="/" variant="quiet">
          Retour à l&apos;accueil
        </ButtonLink>
      </div>
    </div>
  );
}
