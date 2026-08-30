import type { Metadata } from 'next';
import { AuthForm } from '@/components/account/AuthForm';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="shell py-14 lg:py-20">
      <h1 className="text-h1 font-semibold tracking-[-0.03em]">Mot de passe oublié</h1>
      <div className="mt-10">
        <AuthForm mode="oubli" />
      </div>
    </div>
  );
}
