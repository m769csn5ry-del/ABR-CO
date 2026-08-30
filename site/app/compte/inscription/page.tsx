import type { Metadata } from 'next';
import { AuthForm } from '@/components/account/AuthForm';

export const metadata: Metadata = {
  title: 'Créer un compte',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="shell py-14 lg:py-20">
      <h1 className="text-h1 font-semibold tracking-[-0.03em]">Créer un compte</h1>
      <div className="mt-10">
        <AuthForm mode="inscription" />
      </div>
    </div>
  );
}
