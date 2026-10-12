import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth, User, authState } from '@angular/fire/auth';
import { Observable, catchError, filter, from, map, of, switchMap, take, timeout } from 'rxjs';

/**
 * Guarda de rol para el panel del nutriólogo.
 *
 * El claim `role` lo asigna el Admin SDK (ver `server/index.py`:
 * `auth.set_custom_user_claims(...)`). Es la MISMA fuente de verdad que
 * usa el backend Flask (`require_role("admin")`) y que validan las
 * `firestore.rules`, de modo que UI, backend y base de datos coinciden.
 *
 * Los claims viven en el ID token, así que tras un `set_custom_user_claims`
 * hay que forzar refresco con `user.getIdTokenResult(true)` (o re-login).
 */
export const adminGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    // Espera a que Auth restaure la sesión (relevante en recarga dura).
    filter((user): user is User => user !== null),
    take(1),
    switchMap((user) =>
      from(user.getIdTokenResult()).pipe(map((result) => result.claims?.['role'] === 'admin'))
    ),
    map((isAdmin) => (isAdmin ? true : router.createUrlTree(['/ascenso/dashboard']))),
    // Si Auth nunca resuelve (red caída / sesión corrupta), no dejamos
    // la navegación colgada para siempre.
    timeout({ first: 10000 }),
    catchError(() => of(router.createUrlTree(['/ascenso/sign-in'])))
  );
};
