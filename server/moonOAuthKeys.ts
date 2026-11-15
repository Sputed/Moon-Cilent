import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface MoonOAuthKeyBundle {
  clientId: string;
  clientSecret: string;
  authSecret: string;
  previousAuthSecrets?: string[];
  signingKey: {
    kid: string;
    alg: 'RS256';
    publicKeyPem: string;
    privateKeyPem: string;
    publicJwk: Record<string, any>;
  };
  createdAt: string;
  rotatedAt: string;
}

const KEYS_FILE_PATH = path.resolve(process.cwd(), '.moon-oauth-keys.json');

let cachedKeys: MoonOAuthKeyBundle | null = null;

function generateFreshKeyBundle(existingClientId?: string): MoonOAuthKeyBundle {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const kid = `moon-rs256-${crypto.randomBytes(6).toString('hex')}`;
  const rawJwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' }) as Record<string, any>;
  const publicJwk = {
    ...rawJwk,
    kid,
    use: 'sig',
    alg: 'RS256',
  };

  const now = new Date().toISOString();
  const clientId =
    existingClientId ||
    process.env.MOON_OAUTH_CLIENT_ID?.trim() ||
    `moon_${crypto.randomBytes(8).toString('hex')}`;
  const clientSecret =
    process.env.MOON_OAUTH_CLIENT_SECRET?.trim() ||
    `msk_${crypto.randomBytes(24).toString('hex')}`;
  const authSecret =
    process.env.AUTH_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

  return {
    clientId,
    clientSecret,
    authSecret,
    previousAuthSecrets: [],
    signingKey: {
      kid,
      alg: 'RS256',
      publicKeyPem: publicKey,
      privateKeyPem: privateKey,
      publicJwk,
    },
    createdAt: now,
    rotatedAt: now,
  };
}

function persistKeysToDisk(bundle: MoonOAuthKeyBundle) {
  try {
    fs.writeFileSync(KEYS_FILE_PATH, JSON.stringify(bundle, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
  } catch (err) {
    console.warn('Could not persist .moon-oauth-keys.json to disk (using in-memory keys):', err);
  }
}

export function loadOrGenerateMoonOAuthKeys(): MoonOAuthKeyBundle {
  if (cachedKeys) return cachedKeys;

  try {
    if (fs.existsSync(KEYS_FILE_PATH)) {
      const raw = fs.readFileSync(KEYS_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as MoonOAuthKeyBundle;
      if (
        parsed?.clientId &&
        parsed?.clientSecret &&
        parsed?.authSecret &&
        parsed?.signingKey?.privateKeyPem &&
        parsed?.signingKey?.publicJwk?.kid
      ) {
        // Respect explicit env var overrides if provided
        if (process.env.MOON_OAUTH_CLIENT_ID?.trim()) {
          parsed.clientId = process.env.MOON_OAUTH_CLIENT_ID.trim();
        }
        if (process.env.MOON_OAUTH_CLIENT_SECRET?.trim()) {
          parsed.clientSecret = process.env.MOON_OAUTH_CLIENT_SECRET.trim();
        }
        if (process.env.AUTH_SECRET?.trim()) {
          parsed.authSecret = process.env.AUTH_SECRET.trim();
        }
        cachedKeys = parsed;
        return cachedKeys;
      }
    }
  } catch {
    // Regenerate fresh keys if existing key file is corrupted
  }

  const fresh = generateFreshKeyBundle();
  persistKeysToDisk(fresh);
  cachedKeys = fresh;
  return cachedKeys;
}

export function rotateMoonOAuthKeys(): MoonOAuthKeyBundle {
  const prev = loadOrGenerateMoonOAuthKeys();
  const next = generateFreshKeyBundle(prev.clientId);
  const rotatedSecrets = [
    prev.authSecret,
    ...(Array.isArray(prev.previousAuthSecrets) ? prev.previousAuthSecrets : []),
  ]
    .filter((s) => Boolean(s) && s !== next.authSecret)
    .slice(0, 5);
  next.previousAuthSecrets = Array.from(new Set(rotatedSecrets));
  next.createdAt = prev.createdAt;
  next.rotatedAt = new Date().toISOString();
  persistKeysToDisk(next);
  cachedKeys = next;
  return cachedKeys;
}

export function getAuthSecretList(keys?: MoonOAuthKeyBundle): string[] {
  const active = keys || loadOrGenerateMoonOAuthKeys();
  const list = [
    active.authSecret,
    ...(Array.isArray(active.previousAuthSecrets) ? active.previousAuthSecrets : []),
  ].filter(Boolean);
  return Array.from(new Set(list));
}

export function getPublicOAuthKeysInfo(baseUrl: string) {
  const keys = loadOrGenerateMoonOAuthKeys();
  const fingerprint = crypto
    .createHash('sha256')
    .update(keys.signingKey.publicKeyPem)
    .digest('hex')
    .slice(0, 16)
    .match(/.{1,4}/g)
    ?.join(':')
    .toUpperCase();

  const tail = keys.clientSecret.slice(-4);
  const clientSecretMasked = `${keys.clientSecret.slice(0, 6)}••••${tail}`;

  return {
    clientId: keys.clientId,
    clientSecretMasked,
    kid: keys.signingKey.kid,
    algorithm: keys.signingKey.alg,
    keyFingerprint: fingerprint || '',
    jwksUri: `${baseUrl}/oauth/jwks`,
    discoveryUri: `${baseUrl}/oauth/.well-known/openid-configuration`,
    createdAt: keys.createdAt,
    rotatedAt: keys.rotatedAt,
  };
}

export function signJwtRs256(payload: Record<string, any>, keys?: MoonOAuthKeyBundle): string {
  const active = keys || loadOrGenerateMoonOAuthKeys();
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: active.signingKey.kid,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .sign('RSA-SHA256', Buffer.from(signingInput, 'utf8'), active.signingKey.privateKeyPem)
    .toString('base64url');

  return `${signingInput}.${signature}`;
}
