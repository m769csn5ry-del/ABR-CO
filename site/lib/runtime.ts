/* Mode démonstration statique.
 *
 * Sur GitHub Pages il n'y a pas de serveur : les routes d'API n'existent pas.
 * Plutôt que de laisser un `fetch` échouer et afficher « connexion impossible »
 * — ce qui serait trompeur —, l'interface affiche directement le même message
 * « non raccordé » qu'en mode serveur. Rien n'est simulé dans un cas comme
 * dans l'autre : aucune commande n'est créée, aucun montant débité. */

export const IS_STATIC_DEMO = process.env.NEXT_PUBLIC_DEMO_STATIC === '1';

/** Réponse d'une soumission de formulaire, quelle que soit l'origine. */
export interface SubmitResult {
  ok: boolean;
  message: string;
}

/**
 * Poste sur une route d'API, ou renvoie le message « non raccordé » de
 * démonstration si aucun serveur n'est disponible.
 */
export async function postJson(
  url: string,
  body: unknown,
  demoMessage: string,
): Promise<SubmitResult> {
  if (IS_STATIC_DEMO) return { ok: false, message: demoMessage };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    return {
      ok: res.ok,
      message: data.message ?? (res.ok ? 'Enregistré.' : 'Envoi impossible pour le moment.'),
    };
  } catch {
    return { ok: false, message: 'Connexion impossible. Réessaie dans un instant.' };
  }
}

/**
 * Préfixe un chemin de `public/` par le basePath du déploiement.
 *
 * Nécessaire parce que `next/image` en mode `unoptimized` (export statique)
 * laisse le `src` tel quel : sans ce préfixe, `/produits/x.jpg` est demandé
 * à la racine du domaine et renvoie 404 sous GitHub Pages.
 * Les URL absolues et les blob/data sont laissées intactes.
 */
export function asset(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  if (!base) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
