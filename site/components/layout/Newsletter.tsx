'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { postJson } from '@/lib/runtime';

/* Inscription à la lettre. Le formulaire est réel et validé côté client,
   puis posté sur /api/newsletter. Tant qu'aucun prestataire d'emailing
   n'est configuré, la route répond 501 et le message le dit franchement :
   on n'affiche jamais une confirmation d'inscription qui n'a pas eu lieu. */

type State = { kind: 'idle' | 'sending' } | { kind: 'done' | 'error'; message: string };

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setState({ kind: 'error', message: 'Cette adresse ne semble pas valide.' });
      return;
    }
    setState({ kind: 'sending' });
    const { ok, message } = await postJson(
      '/api/newsletter',
      { email },
      "L'inscription n'est pas encore active : le service d'envoi n'est pas raccordé. Rien n'a été enregistré.",
    );
    setState({ kind: ok ? 'done' : 'error', message });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="newsletter" className="text-small text-mineral">
        Nouveaux arrivages, retours en stock et offres d&apos;entretien. Deux envois par mois au plus.
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="newsletter"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@adresse.fr"
          autoComplete="email"
          className="min-h-11 w-full rounded-xs border border-mineral-line bg-paper-raised px-3.5 py-2.5
                     text-small placeholder:text-mineral/70 transition-[border-color] duration-[180ms]
                     hover:border-mineral focus:border-ink focus:outline-none"
        />
        <Button type="submit" variant="quiet" disabled={state.kind === 'sending'} className="shrink-0">
          {state.kind === 'sending' ? 'Envoi…' : "S'inscrire"}
        </Button>
      </div>
      <p
        aria-live="polite"
        className={
          state.kind === 'error'
            ? 'text-small text-oxide'
            : state.kind === 'done'
              ? 'text-small text-verdigris'
              : 'sr-only'
        }
      >
        {'message' in state ? state.message : ''}
      </p>
    </form>
  );
}
