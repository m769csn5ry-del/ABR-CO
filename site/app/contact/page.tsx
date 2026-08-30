'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { site } from '@/content/site';
import { postJson } from '@/lib/runtime';
import { classNames } from '@/lib/format';

/* Le formulaire est réel et validé. L'envoi passe par /api/contact, qui
   répond 501 tant qu'aucune boîte de réception n'est configurée : on
   n'affiche jamais « message envoyé » si rien n'est parti. */

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [status, setStatus] = useState<
    { kind: 'idle' | 'sending' } | { kind: 'ok' | 'ko'; message: string }
  >({ kind: 'idle' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = 'Indique ton nom.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) next.email = 'Adresse e-mail invalide.';
    if (form.message.trim().length < 10) next.message = 'Décris ta demande en quelques mots.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus({ kind: 'sending' });
    const { ok, message } = await postJson(
      '/api/contact',
      form,
      "Le formulaire n'est pas encore raccordé à une boîte de réception. Ton message n'a pas été envoyé.",
    );
    setStatus({ kind: ok ? 'ok' : 'ko', message });
  }

  return (
    <div className="shell py-14 lg:py-20">
      <h1 className="text-h1 font-semibold tracking-[-0.03em]">Contact</h1>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_20rem] lg:gap-20">
        <form onSubmit={onSubmit} noValidate className="flex max-w-lg flex-col gap-6">
          <Field label="Nom" error={errors.name} required>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} invalid={invalid} autoComplete="name"
                value={form.name} onChange={set('name')} />
            )}
          </Field>
          <Field label="E-mail" error={errors.email} required>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} invalid={invalid} type="email"
                autoComplete="email" value={form.email} onChange={set('email')} />
            )}
          </Field>
          <Field label="Message" error={errors.message} required
            hint="Pour une question sur une paire, précise la marque et le modèle.">
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={6}
                value={form.message} onChange={set('message')} />
            )}
          </Field>

          <Button type="submit" disabled={status.kind === 'sending'} className="self-start">
            {status.kind === 'sending' ? 'Envoi…' : 'Envoyer'}
          </Button>

          {'message' in status ? (
            <p
              role="status"
              className={classNames(
                'rounded-xs border px-4 py-3 text-small',
                status.kind === 'ok'
                  ? 'border-verdigris/30 bg-verdigris-wash text-verdigris-deep'
                  : 'border-oxide/30 bg-oxide-wash text-oxide',
              )}
            >
              {status.message}
            </p>
          ) : null}
        </form>

        <aside className="flex flex-col gap-8">
          <div className="border-t border-ink pt-5">
            <h2 className="text-h4 font-medium tracking-[-0.015em]">Coordonnées</h2>
            <dl className="mt-4 flex flex-col gap-3 text-small">
              <div>
                <dt className="text-mineral">E-mail</dt>
                <dd>
                  {site.email ? (
                    <a href={`mailto:${site.email}`} className="underline underline-offset-4">
                      {site.email}
                    </a>
                  ) : (
                    <span className="text-mineral/70">À renseigner</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-mineral">Téléphone</dt>
                <dd>{site.phone ?? <span className="text-mineral/70">À renseigner</span>}</dd>
              </div>
              <div>
                <dt className="text-mineral">Atelier</dt>
                <dd>
                  {site.address ? (
                    <>
                      {site.address.street}
                      <br />
                      {site.address.postalCode} {site.address.city}
                    </>
                  ) : (
                    <span className="text-mineral/70">À renseigner</span>
                  )}
                </dd>
              </div>
              {site.openingHours.length > 0 ? (
                <div>
                  <dt className="text-mineral">Horaires</dt>
                  <dd>
                    {site.openingHours.map((h) => (
                      <span key={h} className="block">
                        {h}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-5 text-small text-mineral">
              Ces informations se renseignent dans <code className="text-ink">content/site.ts</code>.
              Rien n&apos;a été inventé ici.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
