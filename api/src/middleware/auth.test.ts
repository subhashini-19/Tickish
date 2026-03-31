import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from './auth';
import { errorHandler } from './errorHandler';
import 'express-async-errors';

// Note: jest.mock is hoisted before const declarations, so we use inline literals here
jest.mock('../config/env', () => ({
  config: {
    nodeEnv: 'test',
    azure: {
      tenantId: 'test-tenant',
      clientId: 'test-client-id',
      appInsightsConnectionString: '',
    },
    elasticsearch: { node: '', apiKey: '' },
  },
}));

// Mock jwks-rsa — we don't want real network calls to Azure in tests
jest.mock('jwks-rsa', () =>
  jest.fn(() => ({
    getSigningKey: (_kid: string, cb: (err: Error | null, key?: any) => void) => {
      cb(null, { getPublicKey: () => 'mock-public-key' });
    },
  }))
);

// Mock jwt.verify so we fully control what the middleware "sees" as a decoded token.
// This isolates the middleware logic from JWT crypto — we test claim handling, not RSA maths.
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn(),
}));

const mockedVerify = jwt.verify as jest.Mock;

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/protected', authenticate, (req, res) => {
    res.json({ userId: req.user?.oid, email: req.user?.email });
  });
  app.use(errorHandler);
  return app;
}

describe('authenticate middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when Authorization header is not Bearer', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Basic sometoken');
    expect(res.status).toBe(401);
  });

  it('attaches user claims to req.user on valid token', async () => {
    mockedVerify.mockImplementation((_token, _getKey, _opts, cb) => {
      cb(null, {
        oid: 'user-object-id-123',
        name: 'Test User',
        preferred_username: 'test@example.com',
      });
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid.mock.token');

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-object-id-123');
    expect(res.body.email).toBe('test@example.com');
  });

  it('returns 401 when token verification fails', async () => {
    mockedVerify.mockImplementation((_token, _getKey, _opts, cb) => {
      cb(new Error('invalid signature'));
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer bad.token.here');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when token is expired', async () => {
    mockedVerify.mockImplementation((_token, _getKey, _opts, cb) => {
      cb(new Error('jwt expired'));
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer expired.token');

    expect(res.status).toBe(401);
  });

  it('returns 401 when oid claim is missing', async () => {
    mockedVerify.mockImplementation((_token, _getKey, _opts, cb) => {
      cb(null, { name: 'No OID User' }); // valid token but missing oid
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer token.without.oid');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
