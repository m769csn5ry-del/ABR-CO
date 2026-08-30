import { NextResponse } from 'next/server';

/* Inscription à la lettre.
 *
 * À CONNECTER : renseigne NEWSLETTER_API_KEY et NEWSLETTER_LIST_ID, puis
 * remplace le bloc marqué par l'appel à ton prestataire (Brevo, Resend
 * Audiences, Klaviyo…). Tant que la variable est absente, la route répond
 * 501 : le site ne prétend jamais avoir enregistré une inscription. */

export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = (await request.json()) as { email?: unknown });
  } catch {
    return NextResponse.json({ message: 'Requête illisible.' }, { status: 400 });
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ message: 'Adresse e-mail invalide.' }, { status: 400 });
  }

  if (!process.env.NEWSLETTER_API_KEY) {
    return NextResponse.json(
      {
        message:
          "L'inscription n'est pas encore active : le service d'envoi n'est pas raccordé. Rien n'a été enregistré.",
      },
      { status: 501 },
    );
  }

  // ---- À implémenter avec le prestataire choisi -------------------
  // await fetch('https://api.exemple.com/contacts', { ... });
  // ------------------------------------------------------------------

  return NextResponse.json({ message: 'Inscription enregistrée. À bientôt.' });
}
