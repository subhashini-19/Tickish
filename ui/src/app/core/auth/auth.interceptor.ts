import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { from, switchMap, catchError, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';

// The HTTP interceptor is Angular's equivalent of Express middleware — it sits in the
// request pipeline and can modify every outgoing request.
// Here it acquires an access token silently (from MSAL's cache) and attaches it
// as a Bearer token. The user never sees this happen.
//
// Silent token acquisition works because MSAL caches tokens in localStorage.
// When the token is near expiry, MSAL refreshes it transparently using the refresh token.

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // Only intercept requests to our API — don't attach tokens to third-party calls
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const msalService = inject(MsalService);
  const account = msalService.instance.getAllAccounts()[0];

  if (!account) {
    return next(req); // not logged in — let the API return 401
  }

  return from(
    msalService.instance.acquireTokenSilent({
      scopes: [environment.apiScope],
      account,
    })
  ).pipe(
    switchMap((result) => {
      // Clone the request with the Authorization header — requests are immutable
      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${result.accessToken}` },
      });
      return next(authReq);
    }),
    catchError((err) => {
      console.error('Token acquisition failed:', err);
      return EMPTY;
    })
  );
};
