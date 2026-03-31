export const environment = {
  production: false,
  apiUrl: 'tickish-api.azurewebsites.net',
  msal: {
    // UI app registration client ID — from Entra portal (App registrations → your UI app)
    clientId: '9a47834c-659c-4b13-9acb-4b8105521f68',
    authority: 'https://todoappusers.ciamlogin.com/bc4899c5-a308-4874-b570-d33b01a4d30d',
    redirectUri: 'https://polite-stone-08cded10f.4.azurestaticapps.net/redirect',
    postLogoutRedirectUri: 'https://polite-stone-08cded10f.4.azurestaticapps.net',

  },
  // The API's client ID is used to construct the scope Angular requests
  // Format: api://{apiClientId}/{scopeName}
  apiScope: 'api://381075c3-9a35-48e7-afbd-ccf708a52648/Todos.ReadWrite',
};
