'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

/* Suivi d'atelier sans compte : la référence suffit. Un client qui a
   commandé en deux minutes ne doit pas créer un compte pour savoir où
   est sa paire. */

export default function TrackingPage() {
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = reference.trim().toUpperCase();
    if (!/^NF-[A-Z0-9]{4,8}$/.test(value)) {
      setError('La référence ressemble à NF-XXXXXX, telle qu\'elle figure dans ton e-mail.');
      return;
    }
    router.push(`/suivi/${value}`);
  }

  return (
    <div className="shell py-14 lg:py-20">
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
    </div>
  );
}
