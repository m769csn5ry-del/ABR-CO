import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountShell } from '@/components/account/AccountShell';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Mon compte',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <AccountShell
      title="Mon compte"
      intro="Tes commandes boutique, tes prestations d'atelier et tes adresses au même endroit."
      current="/compte"
    >
      <div className="rounded-xs border border-mineral-line bg-paper-raised px-5 py-6">
        <h2 className="text-h4 font-medium tracking-[-0.015em]">Tu n&apos;es pas connecté</h2>
        <p className="measure mt-3 text-small text-mineral">
          L&apos;authentification n&apos;est pas encore raccordée : les écrans existent, mais
          aucun compte ne peut être créé pour l&apos;instant.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/compte/connexion">Se connecter</ButtonLink>
          <ButtonLink href="/compte/inscription" variant="quiet">
            Créer un compte
          </ButtonLink>
        </div>
      </div>

      <div className="mt-10 border-t border-mineral-line pt-8">
        <h2 className="text-h4 font-medium tracking-[-0.015em]">Sans compte</h2>
        <p className="measure mt-3 text-small text-mineral">
          Le suivi d&apos;une prestation d&apos;atelier ne demande pas de compte : la référence
          reçue par e-mail suffit.
        </p>
        <Link
          href="/suivi"
          className="mt-5 inline-block text-small underline decoration-mineral-line underline-offset-4 hover:decoration-ink"
        >
          Suivre ma paire avec une référence
        </Link>
      </div>
    </AccountShell>
  );
}
