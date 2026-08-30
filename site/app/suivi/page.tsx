'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { StatusTimeline } from '@/components/care/StatusTimeline';

/* Suivi d'atelier sans compte : la référence suffit. Un client qui a commandé
   en deux minutes ne doit pas créer un compte pour savoir où est sa paire.
 *
 * À CONNECTER : lire la commande en base à partir de la référence, puis passer
 * le statut réel à <StatusTimeline current={...} />. La frise est complète :
 * seule la source du statut change. Aucun faux dossier n'est fabriqué ici. */

function Suivi() {
  const router = useRouter();
  const params = useSearchParams();
  const asked = (params.get('ref') ?? '').toUpperCase();
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = reference.trim().toUpperCase();
    if (!/^NF-[A-Z0-9]{4,8}$/.test(value)) {
      setError("La référence ressemble à NF-XXXXXX, telle qu'elle figure dans ton e-mail.");
      return;
    }
    router.push(`/suivi?ref=${value}`);
  }

  if (asked) {
    return (
      <>
        <h1 className="text-h2 font-semibold tracking-[-0.025em]">Aucun dossier pour {asked}</h1>
        <p className="measure mt-5 text-lead text-mineral">
          La base des prestations n&apos;est pas encore raccordée : aucune référence ne peut
          être retrouvée. Une fois connectée, cette page affichera l&apos;étape en cours parmi
          les neuf ci-dessous.
        </p>

        <section aria-labelledby="etapes" className="mt-14">
          <h2 id="etapes" className="text-h4 font-medium tracking-[-0.015em]">
            Les neuf étapes du suivi
          </h2>
          <div className="mt-6 max-w-2xl">
            <StatusTimeline current="Diagnostic" />
          </div>
          <p className="measure mt-6 text-small text-mineral">
            Aperçu de la frise, positionnée sur « Diagnostic » à titre d&apos;illustration.
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink href="/suivi" variant="quiet">
            Essayer une autre référence
          </ButtonLink>
          <ButtonLink href="/contact" variant="care">
            Nous écrire
          </ButtonLink>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-h1 font-semibold tracking-[-0.03em]">Suivre ma paire</h1>
      <p className="measure mt-5 text-lead text-mineral">
        Entre la référence reçue par e-mail. Pas besoin de compte.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-10 flex max-w-sm flex-col gap-5">
        <Field label="Référence" error={error} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                setError(null);
              }}
              placeholder="NF-A1B2C3"
              autoComplete="off"
              className="uppercase"
            />
          )}
        </Field>
        <Button type="submit" variant="care" className="self-start">
          Voir le suivi
        </Button>
      </form>
    </>
  );
}

export default function TrackingPage() {
  return (
    <div className="shell py-14 lg:py-20">
      <Suspense fallback={<div className="h-64" aria-hidden="true" />}>
        <Suivi />
      </Suspense>
    </div>
  );
}
