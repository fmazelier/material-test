import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '@core/services/auth.service';

export const authGuard: CanMatchFn = async (route, segments): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.init();

  if (authService.isLoggedIn()) {
    const requiredRoles = route.data?.['roles'] as string[] | undefined;

    if (requiredRoles?.length && !requiredRoles.some((role) => authService.hasRealmRole(role))) {
      return router.parseUrl('/forbidden');
    }

    return true;
  }

  const targetPath = `/${segments.map((segment) => segment.path).join('/')}`;
  await authService.login(targetPath);

  return false;
};
