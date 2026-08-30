import type { Metadata } from 'next';
import { AccountShell, NotConnected } from '@/components/account/AccountShell';

export const metadata: Metadata = {
  title: 'Commandes boutique',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AccountShell title="Commandes boutique" current="/compte/commandes">
      <NotConnected what="Aucune commande boutique" />
    </AccountShell>
  );
}
