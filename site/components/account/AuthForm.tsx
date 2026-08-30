'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

/* Formulaires d'authentification.
 *
 * Complets et validés côté client, mais aucun fournisseur d'identité
 * n'est raccordé : la soumission le dit franchement plutôt que de faire
 * semblant d'ouvrir une session. */

type Mode = 'connexion' | 'inscription' | 'oubli';

const COPY: Record<Mode, { cta: string; notice: string }> = {
  connexion: {
    cta: 'Se connecter',
    notice:
      "L'authentification n'est pas raccordée : aucune session n'a été ouverte et aucun compte n'existe.",
  },
  inscription: {
    cta: 'Créer mon compte',
    notice:
      "L'authentification n'est pas raccordée : aucun compte n'a été créé et rien n'a été enregistré.",
  },
  oubli: {
    cta: 'Recevoir le lien',
    notice: "L'envoi n'est pas raccordé : aucun e-mail de réinitialisation n'a été envoyé.",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [notice, setNotice] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) next.email = 'Adresse e-mail invalide.';
    if (mode !== 'oubli' && password.length < 8) next.password = 'Huit caractères au minimum.';
    if (mode === 'inscription' && name.trim().length < 2) next.name = 'Indique ton prénom.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setNotice(COPY[mode].notice);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-sm flex-col gap-6">
      {mode === 'inscription' ? (
        <Field label="Prénom" error={errors.name} required>
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-describedby={describedBy} invalid={invalid}
              autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </Field>
      ) : null}

      <Field label="E-mail" error={errors.email} required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} aria-describedby={describedBy} invalid={invalid} type="email"
            autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
      </Field>

      {mode !== 'oubli' ? (
        <Field
          label="Mot de passe"
          error={errors.password}
          required
          hint={mode === 'inscription' ? 'Huit caractères au minimum.' : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-describedby={describedBy} invalid={invalid} type="password"
              autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
      ) : null}

      <Button type="submit" className="self-start">
        {COPY[mode].cta}
      </Button>

      {notice ? (
        <p role="status" className="rounded-xs border border-oxide/30 bg-oxide-wash px-4 py-3 text-small text-oxide">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-mineral-line pt-5 text-small text-mineral">
        {mode !== 'connexion' ? (
          <Link href="/compte/connexion" className="underline decoration-mineral-line underline-offset-4 hover:text-ink">
            J&apos;ai déjà un compte
          </Link>
        ) : null}
        {mode !== 'inscription' ? (
          <Link href="/compte/inscription" className="underline decoration-mineral-line underline-offset-4 hover:text-ink">
            Créer un compte
          </Link>
        ) : null}
        {mode !== 'oubli' ? (
          <Link href="/compte/mot-de-passe-oublie" className="underline decoration-mineral-line underline-offset-4 hover:text-ink">
            Mot de passe oublié
          </Link>
        ) : null}
      </div>
    </form>
  );
}
