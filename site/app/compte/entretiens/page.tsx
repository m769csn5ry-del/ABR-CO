import type { Metadata } from 'next';
import { AccountShell, NotConnected } from '@/components/account/AccountShell';

export const metadata: Metadata = {
  title: 'Prestations atelier',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AccountShell title="Prestations atelier" current="/compte/entretiens">
      <NotConnected what="Aucune prestation en cours" />
    </AccountShell>
  );
}
