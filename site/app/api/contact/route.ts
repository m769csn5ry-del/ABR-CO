import { NextResponse } from 'next/server';

/* Formulaire de contact.
 * À CONNECTER : CONTACT_INBOX + un service d'envoi (Resend, Postmark…). */

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; message?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: 'Requête illisible.' }, { status: 400 });
  }

  const { name, email, message } = body;
  if (
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
    typeof message !== 'string' ||
    message.trim().length < 10
  ) {
    return NextResponse.json({ message: 'Formulaire incomplet.' }, { status: 400 });
  }

  if (!process.env.CONTACT_INBOX) {
    return NextResponse.json(
      {
        message:
          "Le formulaire n'est pas encore raccordé à une boîte de réception. Ton message n'a pas été envoyé.",
      },
      { status: 501 },
    );
  }

  // ---- À implémenter : envoi vers CONTACT_INBOX --------------------

  return NextResponse.json({ message: 'Message envoyé. Réponse sous 48 h ouvrées.' });
}
