import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  azure: {
    tenantId: process.env.AZURE_TENANT_ID || '',
    tenantDomain: process.env.AZURE_TENANT_DOMAIN || '',  // e.g. todoappusers.ciamlogin.com
    clientId: process.env.AZURE_API_CLIENT_ID || '',
    appInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '',
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || '',
    apiKey: process.env.ELASTICSEARCH_API_KEY || '',
  },
};

// Fail fast on missing critical config — catches deployment mistakes early
const required = ['MONGO_URI', 'AZURE_TENANT_ID', 'AZURE_TENANT_DOMAIN', 'AZURE_API_CLIENT_ID'];

if (config.nodeEnv !== 'test') {
  required.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });
}
