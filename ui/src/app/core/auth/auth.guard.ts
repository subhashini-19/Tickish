import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

// Route guard — protects routes that require authentication.
// Angular calls this before activating the route.
// If the user isn't signed in, redirect to /login.
// This is the Angular equivalent of the authenticate middleware in Express.

export const authGuard: CanActivateFn = () => {
  const msalService = inject(MsalService);
  const router = inject(Router);

  const accounts = msalService.instance.getAllAccounts();

  if (accounts.length > 0) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
