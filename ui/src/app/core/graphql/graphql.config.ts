import { ApplicationConfig } from '@angular/core';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { environment } from '../../../environments/environment';

// Apollo Angular connects to the same /graphql endpoint on the Node API.
// HttpLink uses Angular's HttpClient under the hood — this means the
// HTTP interceptor we configure for MSAL automatically attaches the Bearer
// token to GraphQL requests too. One interceptor protects everything.
export const apolloProvider: ApplicationConfig['providers'][number] = {
  provide: APOLLO_OPTIONS,
  useFactory: (httpLink: HttpLink) => ({
    cache: new InMemoryCache({
      typePolicies: {
        Todo: { keyFields: ['id'] },
      },
    }),
    link: httpLink.create({ uri: `${environment.apiUrl}/graphql` }),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  }),
  deps: [HttpLink],
};
