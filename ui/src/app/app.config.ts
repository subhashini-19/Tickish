import {
  ApplicationConfig,
  provideAppInitializer,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MsalGuard,
  MsalService,
  MsalBroadcastService,
} from '@azure/msal-angular';
import {
  PublicClientApplication,
  InteractionType,
  BrowserCacheLocation,
  LogLevel,
  IPublicClientApplication,
} from '@azure/msal-browser';
import { Apollo } from 'apollo-angular';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { apolloProvider } from './core/graphql/graphql.config';
import { environment } from '../environments/environment';

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.msal.clientId,
      authority: environment.msal.authority,
      redirectUri: environment.msal.redirectUri,
      postLogoutRedirectUri: environment.msal.postLogoutRedirectUri,
      knownAuthorities: ['todoappusers.ciamlogin.com'],
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false,
      },
    },
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),

    { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
    {
      provide: MSAL_GUARD_CONFIG,
      useValue: {
        interactionType: InteractionType.Redirect,
        authRequest: { scopes: ['offline_access'] },
      },
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService,

    provideAppInitializer(async () => {
      const msalService = inject(MsalService);
      await msalService.instance.initialize();
      const accounts = msalService.instance.getAllAccounts();
      if (accounts.length > 0 && !msalService.instance.getActiveAccount()) {
        msalService.instance.setActiveAccount(accounts[0]);
      }
    }),

    apolloProvider,
    Apollo,
  ],
};
