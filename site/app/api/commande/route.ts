import { NextResponse } from 'next/server';

/* Création de commande.
 *
 * À CONNECTER — Stripe (ou équivalent) :
 *  1. `npm i stripe`
 *  2. Renseigne STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET.
 *  3. Remplace le bloc ci-dessous par une Checkout Session :
 *       const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
 *       const session = await stripe.checkout.sessions.create({ ... });
 *       return NextResponse.json({ url: session.url });
 *  4. Ajoute app/api/webhooks/stripe/route.ts pour décrémenter le stock
 *     et déclencher l'e-mail de confirmation à `checkout.session.completed`.
 *
 * IMPORTANT : le montant doit être recalculé ICI depuis le catalogue,
 * jamais repris du client. Le panier envoyé n'est qu'une intention. */

export async function POST(request: Request) {
  try {
    await request.json();
  } catch {
    return NextResponse.json({ message: 'Requête illisible.' }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      {
        message:
          "Le paiement n'est pas encore raccordé. Aucune commande n'a été créée et aucun montant n'a été débité.",
        code: 'PAYMENT_NOT_CONFIGURED',
      },
      { status: 501 },
    );
  }

  return NextResponse.json({ message: 'Commande créée.' });
}
