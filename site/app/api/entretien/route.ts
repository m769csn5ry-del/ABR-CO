import { NextResponse } from 'next/server';

/* Demande de prestation d'atelier.
 *
 * À CONNECTER :
 *  1. Stockage des photos (S3, Cloudflare R2, UploadThing…) — le parcours
 *     envoie aujourd'hui le NOMBRE de photos, pas les fichiers ; passe le
 *     formulaire en multipart et pousse les fichiers ici.
 *  2. Persistance de la demande (base de données) + génération de la
 *     référence de suivi.
 *  3. E-mail de confirmation au client et notification à l'atelier.
 *  4. Pour un Restore : envoi du devis après diagnostic, hors de ce flux.
 *
 * Tant que CARE_INBOX est absent, la route répond 501 : aucune demande
 * n'est enregistrée et le parcours le dit explicitement. */

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Requête illisible.' }, { status: 400 });
  }

  const customer = body.customer as { email?: unknown } | undefined;
  if (
    typeof body.service !== 'string' ||
    !body.service ||
    typeof customer?.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email)
  ) {
    return NextResponse.json({ message: 'Demande incomplète.' }, { status: 400 });
  }

  if (!process.env.CARE_INBOX) {
    return NextResponse.json(
      {
        message:
          "L'atelier n'est pas encore raccordé : ta demande n'a pas été enregistrée et aucun montant n'a été débité. Il manque la boîte de réception et le stockage des photos.",
        code: 'CARE_NOT_CONFIGURED',
      },
      { status: 501 },
    );
  }

  // ---- À implémenter : persistance + e-mails ------------------------

  return NextResponse.json({
    message: 'Demande enregistrée. Tu reçois les instructions par e-mail.',
  });
}
