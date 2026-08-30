'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Choice, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { IconCheck } from '@/components/ui/Icon';
import { PhotoUpload, type UploadedPhoto } from './PhotoUpload';
import { CARE_ISSUES, CARE_MATERIALS, services, serviceBySlug } from '@/content/services';
import { site } from '@/content/site';
import { classNames, delay, price } from '@/lib/format';
import { postJson } from '@/lib/runtime';

/* ------------------------------------------------------------------ *
 * Parcours de commande d'entretien — neuf étapes.
 *
 * Choix de conception :
 *  · une seule question majeure par écran, pour que le pouce suffise ;
 *  · rien n'est perdu en revenant en arrière, l'état est global ;
 *  · la validation se fait à la sortie de l'étape, pas à chaque frappe ;
 *  · le titre de l'étape reçoit le focus au changement, sinon un lecteur
 *    d'écran ne saurait pas que la page a changé ;
 *  · la barre de progression est la « coupe » du système graphique ;
 *  · l'étape 9 ne simule aucun paiement : elle poste sur /api/entretien,
 *    qui répond 501 tant que rien n'est raccordé.
 * ------------------------------------------------------------------ */

const STEPS = [
  'Prestation',
  'Ta paire',
  'Matière',
  'Ce qui ne va pas',
  'Photos',
  'Dépôt ou envoi',
  'Coordonnées',
  'Récapitulatif',
  'Validation',
] as const;

interface State {
  service: string;
  brand: string;
  model: string;
  material: string;
  issues: string[];
  issueDetail: string;
  photos: UploadedPhoto[];
  handover: 'depot' | 'envoi' | '';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  postalCode: string;
  city: string;
  consent: boolean;
}

const EMPTY: State = {
  service: '',
  brand: '',
  model: '',
  material: '',
  issues: [],
  issueDetail: '',
  photos: [],
  handover: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  postalCode: '',
  city: '',
  consent: false,
};

type Errors = Partial<Record<keyof State, string>>;

export function CareWizard() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<State>(EMPTY);

  /* La landing envoie ?prestation=deep-clean. Lu après montage pour que la
     page reste entièrement prérendue (cf. ShopBrowser). */
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('prestation') ?? '';
    if (serviceBySlug(asked)) setState((s) => ({ ...s, service: asked }));
  }, []);
  const [errors, setErrors] = useState<Errors>({});
  const [submitState, setSubmitState] = useState<
    { kind: 'idle' | 'sending' } | { kind: 'blocked' | 'error' | 'done'; message: string }
  >({ kind: 'idle' });
  const headingRef = useRef<HTMLHeadingElement>(null);

  const service = serviceBySlug(state.service);
  const isQuote = service?.billing === 'devis';

  const set = <K extends keyof State>(key: K, value: State[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validateStep(index: number): boolean {
    const next: Errors = {};
    if (index === 0 && !state.service) next.service = 'Choisis une prestation pour continuer.';
    if (index === 1) {
      if (state.brand.trim().length < 2) next.brand = 'Indique la marque.';
      if (state.model.trim().length < 1) next.model = 'Indique le modèle.';
    }
    if (index === 2 && !state.material) next.material = 'Choisis une matière, ou « Je ne sais pas ».';
    if (index === 3 && state.issues.length === 0)
      next.issues = 'Sélectionne au moins un point à traiter.';
    if (index === 5 && !state.handover) next.handover = 'Choisis le dépôt ou l\'envoi.';
    if (index === 6) {
      if (state.firstName.trim().length < 2) next.firstName = 'Prénom requis.';
      if (state.lastName.trim().length < 2) next.lastName = 'Nom requis.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(state.email)) next.email = 'Adresse e-mail invalide.';
      if (state.handover === 'envoi' && !/^\d{5}$/.test(state.postalCode.trim()))
        next.postalCode = 'Code postal à 5 chiffres.';
      if (!state.consent) next.consent = 'Nécessaire pour traiter ta demande.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goTo(index: number) {
    setStep(index);
    // Le focus part sur le titre : c'est ce qui annonce le changement d'étape.
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function next() {
    if (!validateStep(step)) return;
    // L'étape 5 (photos) est facultative : on la traverse sans blocage.
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  function back() {
    setErrors({});
    goTo(Math.max(step - 1, 0));
  }

  const totalLabel = useMemo(() => {
    if (!service) return null;
    if (service.fromCents === null) return 'Chiffré après diagnostic';
    const shipping = state.handover === 'envoi' ? site.shipping.careReturnCents : 0;
    return `${price(service.fromCents + shipping)}${shipping ? ' (retour compris)' : ''}`;
  }, [service, state.handover]);

  async function submit() {
    setSubmitState({ kind: 'sending' });
    {
      const { ok, message } = await postJson(
        '/api/entretien',
        {
          service: state.service,
          brand: state.brand,
          model: state.model,
          material: state.material,
          issues: state.issues,
          issueDetail: state.issueDetail,
          photoCount: state.photos.length,
          handover: state.handover,
          customer: {
            firstName: state.firstName,
            lastName: state.lastName,
            email: state.email,
            phone: state.phone,
            postalCode: state.postalCode,
            city: state.city,
          },
        },
        "L'atelier n'est pas encore raccordé : ta demande n'a pas été enregistrée et aucun montant n'a été débité. Il manque la boîte de réception et le stockage des photos.",
      );
      setSubmitState({ kind: ok ? 'done' : 'blocked', message });
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_19rem] lg:gap-16">
      <div>
        {/* -------- Progression : la coupe -------- */}
        <div className="mb-10">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-small font-medium">
              Étape {step + 1} sur {STEPS.length}
              <span className="text-mineral"> · {STEPS[step]}</span>
            </p>
            <p className="text-small tabular-nums text-mineral">{Math.round(progress)} %</p>
          </div>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-valuetext={`Étape ${step + 1} sur ${STEPS.length} : ${STEPS[step]}`}
            className="mt-3 h-px w-full bg-mineral-line"
          >
            <div
              className="h-px origin-left bg-verdigris transition-transform duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ transform: `scaleX(${progress / 100})`, width: '100%' }}
            />
          </div>
        </div>

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-h3 font-semibold tracking-[-0.025em] focus:outline-none"
        >
          {
            [
              'Quelle prestation ?',
              'Quelle paire ?',
              'Quelle matière ?',
              "Qu'est-ce qui ne va pas ?",
              'Ajoute des photos',
              'Dépôt ou envoi ?',
              'Tes coordonnées',
              'Récapitulatif',
              isQuote ? 'Demande de devis' : 'Validation',
            ][step]
          }
        </h2>

        <div className="mt-8">
          {/* ---------- 1. Prestation ---------- */}
          {step === 0 ? (
            <div className="flex flex-col gap-3">
              {services.map((s) => {
                const on = state.service === s.slug;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => set('service', s.slug)}
                    aria-pressed={on}
                    className={classNames(
                      'press flex flex-col gap-2 rounded-xs border p-5 text-left transition-[border-color,background-color] duration-[180ms]',
                      on
                        ? 'border-verdigris bg-verdigris-wash'
                        : 'border-mineral-line bg-paper-raised hover:border-mineral',
                    )}
                  >
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-h4 font-medium tracking-[-0.015em]">{s.name}</span>
                      <span className="text-body tabular-nums">
                        {s.fromCents === null ? (
                          <span className="text-verdigris">Sur devis</span>
                        ) : (
                          <>
                            <span className="text-small text-mineral">dès </span>
                            {price(s.fromCents)}
                          </>
                        )}
                      </span>
                    </span>
                    <span className="text-small text-mineral">{s.summary}</span>
                    <span className="text-small text-mineral">{delay(s.durationDays)}</span>
                  </button>
                );
              })}
              {errors.service ? (
                <p role="alert" className="text-small text-oxide">
                  {errors.service}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* ---------- 2. Marque et modèle ---------- */}
          {step === 1 ? (
            <div className="flex max-w-lg flex-col gap-6">
              <Field label="Marque" error={errors.brand} required>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={state.brand}
                    onChange={(e) => set('brand', e.target.value)}
                    placeholder="Nike, adidas, New Balance…"
                  />
                )}
              </Field>
              <Field label="Modèle" error={errors.model} required
                hint="Le nom sur la boîte ou l'étiquette de languette, si tu l'as.">
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={state.model}
                    onChange={(e) => set('model', e.target.value)}
                    placeholder="Air Max 1, Samba OG, 990v6…"
                  />
                )}
              </Field>
            </div>
          ) : null}

          {/* ---------- 3. Matière ---------- */}
          {step === 2 ? (
            <div className="flex max-w-lg flex-col gap-4">
              <p className="text-small text-mineral">
                Le protocole en dépend entièrement. Si tu ne sais pas, dis-le : on
                l&apos;identifiera au diagnostic.
              </p>
              <Field label="Matière principale" error={errors.material} required>
                {({ id, describedBy, invalid }) => (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={state.material}
                    onChange={(e) => set('material', e.target.value)}
                  >
                    <option value="">Choisir…</option>
                    {CARE_MATERIALS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          ) : null}

          {/* ---------- 4. Problèmes ---------- */}
          {step === 3 ? (
            <div className="flex flex-col gap-5">
              <p className="text-small text-mineral">Plusieurs réponses possibles.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CARE_ISSUES.map((issue) => (
                  <Choice
                    key={issue.id}
                    type="checkbox"
                    checked={state.issues.includes(issue.id)}
                    onChange={() =>
                      set(
                        'issues',
                        state.issues.includes(issue.id)
                          ? state.issues.filter((i) => i !== issue.id)
                          : [...state.issues, issue.id],
                      )
                    }
                  >
                    {issue.label}
                  </Choice>
                ))}
              </div>
              {errors.issues ? (
                <p role="alert" className="text-small text-oxide">
                  {errors.issues}
                </p>
              ) : null}
              <div className="max-w-lg">
                <Field label="Précisions" hint="Origine de la tache, ancienneté, produit déjà essayé…">
                  {({ id, describedBy }) => (
                    <Textarea
                      id={id}
                      aria-describedby={describedBy}
                      value={state.issueDetail}
                      onChange={(e) => set('issueDetail', e.target.value)}
                    />
                  )}
                </Field>
              </div>
            </div>
          ) : null}

          {/* ---------- 5. Photos ---------- */}
          {step === 4 ? (
            <div className="flex flex-col gap-5">
              <p className="measure text-small text-mineral">
                Facultatif, mais c&apos;est ce qui nous permet de te dire à l&apos;avance ce qui est
                atteignable. Sans photo, le diagnostic se fait à réception.
              </p>
              <PhotoUpload photos={state.photos} onChange={(p) => set('photos', p)} />
            </div>
          ) : null}

          {/* ---------- 6. Dépôt ou envoi ---------- */}
          {step === 5 ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => set('handover', 'depot')}
                aria-pressed={state.handover === 'depot'}
                className={classNames(
                  'press flex flex-col gap-2 rounded-xs border p-5 text-left transition-[border-color,background-color] duration-[180ms]',
                  state.handover === 'depot'
                    ? 'border-verdigris bg-verdigris-wash'
                    : 'border-mineral-line bg-paper-raised hover:border-mineral',
                )}
              >
                <span className="text-h4 font-medium tracking-[-0.015em]">Dépôt à l&apos;atelier</span>
                <span className="text-small text-mineral">
                  {site.address
                    ? `${site.address.street}, ${site.address.postalCode} ${site.address.city}`
                    : "L'adresse et les horaires s'afficheront ici une fois renseignés dans la configuration du site."}
                </span>
                <span className="text-small text-verdigris">Pas de frais de retour.</span>
              </button>

              <button
                type="button"
                onClick={() => set('handover', 'envoi')}
                aria-pressed={state.handover === 'envoi'}
                className={classNames(
                  'press flex flex-col gap-2 rounded-xs border p-5 text-left transition-[border-color,background-color] duration-[180ms]',
                  state.handover === 'envoi'
                    ? 'border-verdigris bg-verdigris-wash'
                    : 'border-mineral-line bg-paper-raised hover:border-mineral',
                )}
              >
                <span className="text-h4 font-medium tracking-[-0.015em]">Envoi postal</span>
                <span className="text-small text-mineral">
                  Tu reçois les instructions et l&apos;adresse après validation. L&apos;envoi vers
                  l&apos;atelier est à ta charge.
                </span>
                <span className="text-small text-mineral">
                  Retour : {price(site.shipping.careReturnCents)}
                </span>
              </button>

              {errors.handover ? (
                <p role="alert" className="text-small text-oxide">
                  {errors.handover}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* ---------- 7. Coordonnées ---------- */}
          {step === 6 ? (
            <div className="flex max-w-lg flex-col gap-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Prénom" error={errors.firstName} required>
                  {({ id, describedBy, invalid }) => (
                    <Input id={id} aria-describedby={describedBy} invalid={invalid}
                      autoComplete="given-name" value={state.firstName}
                      onChange={(e) => set('firstName', e.target.value)} />
                  )}
                </Field>
                <Field label="Nom" error={errors.lastName} required>
                  {({ id, describedBy, invalid }) => (
                    <Input id={id} aria-describedby={describedBy} invalid={invalid}
                      autoComplete="family-name" value={state.lastName}
                      onChange={(e) => set('lastName', e.target.value)} />
                  )}
                </Field>
              </div>
              <Field label="E-mail" error={errors.email} required
                hint="C'est par là que passent le diagnostic et le suivi.">
                {({ id, describedBy, invalid }) => (
                  <Input id={id} aria-describedby={describedBy} invalid={invalid} type="email"
                    autoComplete="email" value={state.email}
                    onChange={(e) => set('email', e.target.value)} />
                )}
              </Field>
              <Field label="Téléphone">
                {({ id }) => (
                  <Input id={id} type="tel" autoComplete="tel" value={state.phone}
                    onChange={(e) => set('phone', e.target.value)} />
                )}
              </Field>

              {state.handover === 'envoi' ? (
                <div className="grid gap-6 sm:grid-cols-[8rem_1fr]">
                  <Field label="Code postal" error={errors.postalCode} required>
                    {({ id, describedBy, invalid }) => (
                      <Input id={id} aria-describedby={describedBy} invalid={invalid}
                        inputMode="numeric" autoComplete="postal-code" value={state.postalCode}
                        onChange={(e) => set('postalCode', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Ville" required>
                    {({ id }) => (
                      <Input id={id} autoComplete="address-level2" value={state.city}
                        onChange={(e) => set('city', e.target.value)} />
                    )}
                  </Field>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <Choice
                  type="checkbox"
                  checked={state.consent}
                  onChange={() => set('consent', !state.consent)}
                >
                  J&apos;accepte que ces informations servent à traiter ma demande.
                </Choice>
                {errors.consent ? (
                  <p role="alert" className="text-small text-oxide">
                    {errors.consent}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ---------- 8. Récapitulatif ---------- */}
          {step === 7 ? (
            <dl className="border-t border-mineral-line">
              {[
                ['Prestation', service ? `${service.name} · ${delay(service.durationDays)}` : '—'],
                ['Paire', `${state.brand} ${state.model}`],
                ['Matière', state.material],
                [
                  'À traiter',
                  state.issues
                    .map((id) => CARE_ISSUES.find((i) => i.id === id)?.label ?? id)
                    .join(', '),
                ],
                ['Précisions', state.issueDetail || '—'],
                ['Photos', state.photos.length ? `${state.photos.length} ajoutée(s)` : 'Aucune'],
                ['Remise de la paire', state.handover === 'depot' ? "Dépôt à l'atelier" : 'Envoi postal'],
                [
                  'Contact',
                  `${state.firstName} ${state.lastName} · ${state.email}${state.phone ? ` · ${state.phone}` : ''}`,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-1 border-b border-mineral-line py-4 sm:grid-cols-[11rem_1fr] sm:gap-6"
                >
                  <dt className="text-small text-mineral">{label}</dt>
                  <dd className="text-body text-pretty">{value}</dd>
                </div>
              ))}
              <div className="grid gap-1 border-b border-mineral-line py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
                <dt className="text-small text-mineral">Montant</dt>
                <dd className="text-body font-medium">{totalLabel}</dd>
              </div>
            </dl>
          ) : null}

          {/* ---------- 9. Validation ---------- */}
          {step === 8 ? (
            <div className="flex max-w-xl flex-col gap-5">
              {isQuote ? (
                <p className="measure text-body text-mineral">
                  Un <strong className="font-medium text-ink">Restore</strong> ne se chiffre pas à
                  l&apos;avance : le prix dépend de ce qu&apos;on trouve. Ta demande part à
                  l&apos;atelier, tu reçois le diagnostic photographié et le devis, et rien ne
                  démarre sans ton accord.
                </p>
              ) : (
                <p className="measure text-body text-mineral">
                  Ta demande part à l&apos;atelier. Le paiement en ligne n&apos;est pas encore
                  raccordé à cette version du site : aucun montant ne te sera débité ici, et
                  aucune donnée bancaire ne t&apos;est demandée.
                </p>
              )}

              <Button
                variant="care"
                size="lg"
                onClick={submit}
                disabled={submitState.kind === 'sending' || submitState.kind === 'done'}
              >
                {submitState.kind === 'sending'
                  ? 'Envoi…'
                  : isQuote
                    ? 'Envoyer ma demande de devis'
                    : 'Envoyer ma demande'}
              </Button>

              {'message' in submitState ? (
                <p
                  role="status"
                  className={classNames(
                    'rounded-xs border px-4 py-3 text-small',
                    submitState.kind === 'done'
                      ? 'border-verdigris/30 bg-verdigris-wash text-verdigris-deep'
                      : 'border-oxide/30 bg-oxide-wash text-oxide',
                  )}
                >
                  {submitState.kind === 'done' ? (
                    <span className="flex items-start gap-2">
                      <IconCheck className="mt-0.5 size-4 shrink-0" />
                      {submitState.message}
                    </span>
                  ) : (
                    submitState.message
                  )}
                </p>
              ) : null}

              <p className="text-small text-mineral">
                Une fois la demande enregistrée, tu suivras ta paire depuis{' '}
                <Link href="/suivi" className="underline decoration-mineral-line underline-offset-4 hover:decoration-ink">
                  le suivi d&apos;atelier
                </Link>
                , en neuf étapes.
              </p>
            </div>
          ) : null}
        </div>

        {/* -------- Navigation -------- */}
        <div className="mt-12 flex items-center justify-between gap-4 border-t border-mineral-line pt-6">
          <Button variant="quiet" onClick={back} disabled={step === 0}>
            Retour
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="care" onClick={next}>
              {step === 7 ? 'Tout est exact' : 'Continuer'}
            </Button>
          ) : (
            <span className="text-small text-mineral">Dernière étape</span>
          )}
        </div>
      </div>

      {/* -------- Résumé latéral -------- */}
      <aside aria-labelledby="resume" className="lg:sticky lg:top-28 lg:self-start">
        <h2 id="resume" className="text-small font-medium">
          Ta demande
        </h2>
        <dl className="mt-5 flex flex-col gap-3 border-t border-mineral-line pt-5 text-small">
          <div className="flex justify-between gap-4">
            <dt className="text-mineral">Prestation</dt>
            <dd className="text-right">{service?.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mineral">Paire</dt>
            <dd className="text-right">
              {state.brand || state.model ? `${state.brand} ${state.model}`.trim() : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mineral">Délai</dt>
            <dd className="text-right">{service ? delay(service.durationDays) : '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-mineral-line pt-3 font-medium">
            <dt>Montant</dt>
            <dd className="text-right">{totalLabel ?? '—'}</dd>
          </div>
        </dl>
        <p className="mt-5 text-small text-mineral">
          Les délais courent à partir de la réception de la paire à l&apos;atelier.
        </p>
      </aside>
    </div>
  );
}
