'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { useCart } from '@/lib/cart';
import { site } from '@/content/site';
import { price, delay } from '@/lib/format';
import { postJson } from '@/lib/runtime';

/* Tunnel de commande.
 *
 * Le formulaire est complet et validé, mais l'étape de paiement est
 * volontairement bloquée : aucune infrastructure de paiement n'est
 * configurée, donc on ne demande AUCUNE donnée bancaire et on n'affiche
 * jamais de confirmation d'achat. Voir app/api/commande/route.ts. */

interface Form {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
}

const EMPTY: Form = {
  email: '',
  firstName: '',
  lastName: '',
  address: '',
  postalCode: '',
  city: '',
  country: 'France',
  phone: '',
};

export default function CheckoutPage() {
  const cart = useCart();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function validate(): boolean {
    const next: Partial<Record<keyof Form, string>> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) next.email = 'Adresse e-mail invalide.';
    if (form.firstName.trim().length < 2) next.firstName = 'Prénom requis.';
    if (form.lastName.trim().length < 2) next.lastName = 'Nom requis.';
    if (form.address.trim().length < 5) next.address = 'Adresse requise.';
    if (!/^\d{5}$/.test(form.postalCode.trim())) next.postalCode = 'Code postal à 5 chiffres.';
    if (form.city.trim().length < 2) next.city = 'Ville requise.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!validate()) return;
    setSending(true);
    const { message } = await postJson(
      '/api/commande',
      { lines: cart.lines, promo: cart.promo, customer: form },
      "Le paiement n'est pas encore raccordé. Aucune commande n'a été créée et aucun montant n'a été débité.",
    );
    setNotice(message);
    setSending(false);
  }

  if (!cart.ready) {
    return (
      <div className="shell py-14" aria-busy="true">
        <div className="h-12 w-56 animate-pulse bg-paper-sunk" />
      </div>
    );
  }

  if (cart.detailed.length === 0) {
    return (
      <div className="shell flex min-h-[55vh] flex-col justify-center py-16">
        <h1 className="text-h2 font-semibold tracking-[-0.025em]">Aucune commande en cours</h1>
        <p className="measure mt-5 text-lead text-mineral">
          Ton panier est vide : il n&apos;y a rien à régler.
        </p>
        <ButtonLink href="/shop" className="mt-8 self-start">
          Voir le catalogue
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="shell py-14 lg:py-20">
      <h1 className="text-h1 font-semibold tracking-[-0.03em]">Commande</h1>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
          <fieldset className="flex flex-col gap-5 border-t border-mineral-line pt-6">
            <legend className="sr-only">Coordonnées</legend>
            <h2 className="text-h4 font-medium tracking-[-0.015em]">Coordonnées</h2>
            <Field label="E-mail" error={errors.email} required
              hint="Sert au suivi de commande et au reçu.">
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} invalid={invalid} type="email"
                  autoComplete="email" value={form.email} onChange={set('email')} />
              )}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Prénom" error={errors.firstName} required>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} aria-describedby={describedBy} invalid={invalid}
                    autoComplete="given-name" value={form.firstName} onChange={set('firstName')} />
                )}
              </Field>
              <Field label="Nom" error={errors.lastName} required>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} aria-describedby={describedBy} invalid={invalid}
                    autoComplete="family-name" value={form.lastName} onChange={set('lastName')} />
                )}
              </Field>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-5 border-t border-mineral-line pt-6">
            <legend className="sr-only">Livraison</legend>
            <h2 className="text-h4 font-medium tracking-[-0.015em]">Livraison</h2>
            <Field label="Adresse" error={errors.address} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} invalid={invalid}
                  autoComplete="street-address" value={form.address} onChange={set('address')} />
              )}
            </Field>
            <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
              <Field label="Code postal" error={errors.postalCode} required>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} aria-describedby={describedBy} invalid={invalid} inputMode="numeric"
                    autoComplete="postal-code" value={form.postalCode} onChange={set('postalCode')} />
                )}
              </Field>
              <Field label="Ville" error={errors.city} required>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} aria-describedby={describedBy} invalid={invalid}
                    autoComplete="address-level2" value={form.city} onChange={set('city')} />
                )}
              </Field>
            </div>
            <Field label="Pays" required>
              {({ id }) => (
                <Select id={id} value={form.country} onChange={set('country')}>
                  <option>France</option>
                  <option>Belgique</option>
                  <option>Suisse</option>
                  <option>Luxembourg</option>
                </Select>
              )}
            </Field>
            <Field label="Téléphone" hint="Demandé par le transporteur pour la livraison.">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} type="tel" autoComplete="tel"
                  value={form.phone} onChange={set('phone')} />
              )}
            </Field>
          </fieldset>

          <fieldset className="border-t border-mineral-line pt-6">
            <legend className="sr-only">Paiement</legend>
            <h2 className="text-h4 font-medium tracking-[-0.015em]">Paiement</h2>
            <p className="measure mt-4 text-small text-mineral">
              Le prestataire de paiement n&apos;est pas encore raccordé à cette version du site.
              Aucun champ bancaire ne t&apos;est demandé et aucune commande ne peut aboutir.
              Le bouton ci-dessous vérifie le formulaire puis te le confirme.
            </p>

            <Button type="submit" size="lg" className="mt-6 w-full" disabled={sending}>
              {sending ? 'Vérification…' : 'Valider la commande'}
            </Button>

            {notice ? (
              <p role="status" className="mt-4 rounded-xs border border-oxide/30 bg-oxide-wash px-4 py-3 text-small text-oxide">
                {notice}
              </p>
            ) : null}
          </fieldset>
        </form>

        <aside aria-labelledby="recap-commande" className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="recap-commande" className="text-h4 font-medium tracking-[-0.015em]">
            Ta commande
          </h2>
          <ul className="mt-6 flex flex-col gap-4 border-t border-mineral-line pt-5">
            {cart.detailed.map((l) => (
              <li key={`${l.slug}-${l.eu}`} className="flex justify-between gap-4 text-small">
                <span>
                  <span className="block">
                    {l.brand} {l.model}
                  </span>
                  <span className="block text-mineral">
                    Taille {l.eu} · ×{l.qty}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{price(l.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 flex flex-col gap-3 border-t border-mineral-line pt-5 text-small">
            {cart.discountCents > 0 ? (
              <div className="flex justify-between gap-4 text-verdigris">
                <dt>Code {cart.promo}</dt>
                <dd className="tabular-nums">−{price(cart.discountCents)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-mineral">Livraison</dt>
              <dd className="tabular-nums">
                {cart.shippingCents === 0 ? 'Offerte' : price(cart.shippingCents)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-mineral-line pt-4 text-body font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">{price(cart.totalCents)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-small text-mineral">
            Livraison estimée en {delay(site.shipping.deliveryDays)} après expédition.
          </p>
          <Link
            href="/panier"
            className="mt-4 inline-block text-small underline decoration-mineral-line underline-offset-4 hover:decoration-ink"
          >
            Modifier le panier
          </Link>
        </aside>
      </div>
    </div>
  );
}
