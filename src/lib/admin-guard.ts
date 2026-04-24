// Guard partagé pour les pages /admin/*. Redirige vers /auth/login/ avec :
//   - ?redirect=<chemin demandé>  → reprise après login
//   - ?reason=need-admin          → signal à la page login d'afficher
//     un message clair si l'user est déjà loggé mais avec le mauvais
//     email (évite le redirect loop silencieux qui laisse croire que
//     le login est cassé)
//
// Usage dans chaque page admin :
//   const guard = requireAdmin(Astro); if (guard) return guard;

import type { AstroGlobal } from 'astro';

export const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

export function requireAdmin(Astro: AstroGlobal): Response | null {
  const user = Astro.locals.user;
  if (user && user.email === ADMIN_EMAIL) return null;

  const target = encodeURIComponent(Astro.url.pathname + Astro.url.search);
  const reason = user ? 'need-admin' : 'need-login';
  return Astro.redirect(`/auth/login/?redirect=${target}&reason=${reason}`);
}
