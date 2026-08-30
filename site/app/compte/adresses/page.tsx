import type { Metadata } from 'next';
import { AccountShell, NotConnected } from '@/components/account/AccountShell';

export const metadata: Metadata = {
  title: 'Adresses',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AccountShell title="Adresses" current="/compte/adresses">
      <NotConnected what="Aucune adresse enregistrée" />
    </AccountShell>
  );
}
