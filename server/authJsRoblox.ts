import type { Express, Request, Response } from 'express';
import { ExpressAuth, type ExpressAuthConfig } from '@auth/express';
import { Auth, createActionURL, setEnvDefaults } from '@auth/core';
import type { OAuthConfig } from '@auth/core/providers';
import {
  loadOrGenerateMoonOAuthKeys,
  rotateMoonOAuthKeys,
  getPublicOAuthKeysInfo,
  getAuthSecretList,
} from './moonOAuthKeys';

export interface MoonOAuthProfile extends Record<string, any> {
  sub: string;
  preferred_username?: string;
  name?: string;
  nickname?: string;
  picture?: string;
  roblox_id?: string | null;
  is_verified?: boolean;
  auth_provider?: string;
  provider_label?: string;
}

export interface HydrateUserFn {
  (userId: number, fallbackUsername?: string, fallbackDisplayName?: string): Promise<any>;
}

export function getAppBaseUrl(req?: Request, port: string | number = 3000): string {
  if (req) {
    const fwdHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim();
    const fwdProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
    if (fwdHost) {
      return `${fwdProto || 'https'}://${fwdHost}`;
    }
  }
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (req) {
    const proto = req.protocol || 'https';
    const host = req.get('host') || `localhost:${port}`;
    return `${proto}://${host}`;
  }
  return `http://localhost:${port}`;
}

/**
 * Custom Auth.js Provider for our self-hosted Moon OAuth 2.0 Server
 * Structured following: https://authjs.dev/guides/configuring-oauth-providers#adding-a-new-built-in-provider
 */
export function MoonProvider(options: {
  clientId: string;
  clientSecret: string;
  externalBaseUrl: string;
  internalPort: string | number;
}): OAuthConfig<MoonOAuthProfile> {
  const internalBase = `http://127.0.0.1:${options.internalPort}`;
  return {
    id: 'moon',
    name: 'Moon OAuth',
    type: 'oauth',
    issuer: `${options.externalBaseUrl}/oauth`,
    authorization: {
      url: `${options.externalBaseUrl}/oauth/authorize`,
      params: {
        scope: 'openid profile',
      },
    },
    token: `${internalBase}/oauth/token`,
    userinfo: `${internalBase}/oauth/userinfo`,
    checks: ['pkce', 'state'],
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    profile(profile) {
      return {
        id: profile.sub,
        name:
          profile.nickname ||
          profile.name ||
          profile.preferred_username ||
          'MoonUser',
        email: `${profile.sub}@moon.oauth.local`,
        image: profile.picture || null,
      };
    },
  };
}

function buildAuthConfig(port: string | number): ExpressAuthConfig {
  const keys = loadOrGenerateMoonOAuthKeys();
  const baseUrl = getAppBaseUrl(undefined, port);
  const isHttps = baseUrl.startsWith('https://') || process.env.NODE_ENV === 'production';

  const iframeCookieOptions = {
    httpOnly: true,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    secure: isHttps,
  };

  return {
    basePath: '/auth',
    secret: getAuthSecretList(keys),
    trustHost: true,
    logger: {
      error(error) {
        const msg = String((error as any)?.cause?.message || error?.message || '');
        if (error?.name === 'JWTSessionError' && msg.includes('no matching decryption secret')) {
          console.warn('[auth] Stale or undecryptable session cookie detected; clearing cookie.');
          return;
        }
        console.error(error);
      },
      warn(code) {
        console.warn(`[auth][warn][${code}]`);
      },
      debug() {},
    },
    providers: [
      MoonProvider({
        clientId: keys.clientId,
        clientSecret: keys.clientSecret,
        externalBaseUrl: baseUrl,
        internalPort: port,
      }),
    ],
    session: {
      strategy: 'jwt',
      maxAge: 7 * 24 * 60 * 60,
    },
    cookies: isHttps
      ? {
          sessionToken: {
            name: '__Secure-authjs.session-token',
            options: iframeCookieOptions,
          },
          callbackUrl: {
            name: '__Secure-authjs.callback-url',
            options: iframeCookieOptions,
          },
          csrfToken: {
            name: 'authjs.csrf-token',
            options: iframeCookieOptions,
          },
          pkceCodeVerifier: {
            name: '__Secure-authjs.pkce.code_verifier',
            options: iframeCookieOptions,
          },
          state: {
            name: '__Secure-authjs.state',
            options: iframeCookieOptions,
          },
          nonce: {
            name: '__Secure-authjs.nonce',
            options: iframeCookieOptions,
          },
        }
      : undefined,
    callbacks: {
      async jwt({ token, profile, account }) {
        if (profile) {
          const p = profile as MoonOAuthProfile;
          token.moonSub = String(p.sub || account?.providerAccountId || '');
          token.moonUsername = String(p.preferred_username || p.name || token.name || 'MoonUser');
          token.moonDisplayName = String(p.nickname || p.name || token.name || 'Moon User');
          token.moonAvatar = String(p.picture || token.picture || '');
          token.robloxId = p.roblox_id ? String(p.roblox_id) : '';
          token.isVerified = !!p.is_verified;
          token.providerLabel = String(p.provider_label || 'Moon OAuth');
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).moonSub = token.moonSub || '';
          (session.user as any).moonUsername = token.moonUsername || session.user.name || '';
          (session.user as any).moonDisplayName = token.moonDisplayName || session.user.name || '';
          (session.user as any).moonAvatar = token.moonAvatar || session.user.image || '';
          (session.user as any).robloxId = token.robloxId || '';
          (session.user as any).isVerified = !!token.isVerified;
          (session.user as any).providerLabel = token.providerLabel || 'Moon OAuth';
        }
        return session;
      },
    },
  };
}

function renderPopupHtml(payload: Record<string, any>) {
  const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');
  const ok = payload.type === 'ROBLOX_OAUTH_SUCCESS';
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Moon Client — Moon OAuth</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #202124; color: #f8f9fa; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <div style="text-align: center; padding: 28px; max-width: 360px;">
      <div style="width: 12px; height: 12px; border-radius: 999px; background: ${ok ? '#34a853' : '#ea4335'}; margin: 0 auto 14px;"></div>
      <p style="font-size: 14px; font-weight: 600; margin: 0 0 6px;">
        ${ok ? 'Signed in with Moon OAuth!' : 'Authorization did not complete'}
      </p>
      <p style="font-size: 12px; color: #9aa0a6; margin: 0;">
        ${ok ? 'Returning to Moon Client...' : (payload.error || 'You can close this window.')}
      </p>
    </div>
    <script>
      if (window.opener) {
        window.opener.postMessage(${safeJson}, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script>
  </body>
</html>`;
}

export function registerAuthJsMoon(
  app: Express,
  port: string | number,
  hydrateRobloxUserById: HydrateUserFn
) {
  app.set('trust proxy', true);

  let authConfig = buildAuthConfig(port);

  // Handle trailing-slash variations for Auth.js Moon callback
  app.get('/auth/callback/moon/', (req, _res, next) => {
    req.url = req.url.replace('/auth/callback/moon/', '/auth/callback/moon');
    next();
  });

  // Ensure @auth/express toWebRequest uses the external forwarded host (dev & shared proxy domains)
  app.use('/auth/*', (req, _res, next) => {
    const fwdHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim();
    if (fwdHost) {
      req.headers.host = fwdHost;
    } else if (
      (!req.headers.host || req.headers.host.startsWith('localhost')) &&
      process.env.APP_URL
    ) {
      try {
        const parsedAppUrl = new URL(process.env.APP_URL);
        req.headers.host = parsedAppUrl.host;
        if (!req.headers['x-forwarded-proto']) {
          req.headers['x-forwarded-proto'] = parsedAppUrl.protocol.replace(':', '');
        }
      } catch {
        // Ignore invalid APP_URL
      }
    }
    next();
  });

  // Mount dynamic ExpressAuth wrapper so key rotation updates Auth.js config immediately
  app.use('/auth/*', (req, res, next) => {
    return ExpressAuth(authConfig)(req, res, next);
  });

  /**
   * GET /api/oauth/roblox/status & /api/oauth/moon/status
   * Reports self-hosted Moon OAuth + Auth.js status, callback URL, and active cryptographic key metadata
   */
  app.get(['/api/oauth/roblox/status', '/api/oauth/moon/status'], (req: Request, res: Response) => {
    const baseUrl = getAppBaseUrl(req, port);
    const redirectUri = `${baseUrl}/auth/callback/moon`;

    res.json({
      engine: 'moon-oauth-authjs',
      configured: true,
      openCloudConfigured: !!process.env.ROBLOX_OPEN_CLOUD_API_KEY?.trim(),
      redirectUri,
      missing: [],
      keys: getPublicOAuthKeysInfo(baseUrl),
    });
  });

  /**
   * POST /api/oauth/moon/keys/rotate
   * Generates a fresh RSA-2048 JWKS signing keypair, OAuth client secret, and Auth.js session secret
   */
  app.post('/api/oauth/moon/keys/rotate', (req: Request, res: Response) => {
    rotateMoonOAuthKeys();
    authConfig = buildAuthConfig(port);
    const baseUrl = getAppBaseUrl(req, port);
    res.json({
      rotated: true,
      keys: getPublicOAuthKeysInfo(baseUrl),
    });
  });

async function resolveAuthJsSession(
  req: Request,
  res: Response,
  authConfig: ExpressAuthConfig
) {
  setEnvDefaults(process.env, authConfig, true);
  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (typeof val === 'string') headers.set(key, val);
    else if (Array.isArray(val) && val.length > 0) headers.set(key, val.join(', '));
  }
  const fwdHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim();
  if (fwdHost) {
    headers.set('host', fwdHost);
  } else if ((!headers.get('host') || headers.get('host')?.startsWith('localhost')) && process.env.APP_URL) {
    try {
      const parsedAppUrl = new URL(process.env.APP_URL);
      headers.set('host', parsedAppUrl.host);
    } catch {
      // Ignore invalid APP_URL
    }
  }

  const url = createActionURL(
    'session',
    req.protocol || 'https',
    headers,
    process.env,
    authConfig
  );
  const response = await Auth(
    new Request(url, { headers: { cookie: req.headers.cookie ?? '' } }),
    authConfig
  );

  // Forward Set-Cookie headers (rolling expiry updates & automatic cleanup of undecryptable stale cookies)
  const setCookies = response.headers.getSetCookie?.() || [];
  for (const sc of setCookies) {
    res.append('Set-Cookie', sc);
  }

  if (response.status !== 200) return null;
  const data = await response.json().catch(() => null);
  if (!data || !Object.keys(data).length) return null;
  return data;
}

  /**
   * GET /api/oauth/roblox/session & /api/oauth/moon/session
   * Retrieves the Auth.js session and forwards Set-Cookie cleanup headers on stale cookies
   */
  app.get(['/api/oauth/roblox/session', '/api/oauth/moon/session'], async (req: Request, res: Response) => {
    const openCloudConfigured = !!process.env.ROBLOX_OPEN_CLOUD_API_KEY?.trim();

    try {
      const session = await resolveAuthJsSession(req, res, authConfig);
      if (!session?.user) {
        return res.json({
          authenticated: false,
          account: null,
          oauthConfigured: true,
          openCloudConfigured,
        });
      }

      const userAny = session.user as Record<string, any>;
      const numericRobloxId = Number(userAny.robloxId || '');

      if (numericRobloxId > 0) {
        try {
          const account = await hydrateRobloxUserById(
            numericRobloxId,
            userAny.moonUsername || userAny.name,
            userAny.moonDisplayName || userAny.name
          );
          return res.json({
            authenticated: true,
            account: {
              ...account,
              role: 'Moon OAuth · Linked Roblox',
              lastActive: 'Signed in via Moon OAuth',
            },
            oauthConfigured: true,
            openCloudConfigured,
          });
        } catch {
          // Fall back to OAuth user claims if Roblox profile lookup transiently fails
        }
      }

      return res.json({
        authenticated: true,
        account: {
          id: String(userAny.moonSub || userAny.id || 'moon-user'),
          username: String(userAny.moonUsername || userAny.name || 'MoonUser'),
          displayName: String(userAny.moonDisplayName || userAny.name || 'Moon User'),
          avatarUrl: String(userAny.moonAvatar || userAny.image || ''),
          description: 'Authenticated with self-hosted Moon OAuth 2.0 + Auth.js (PKCE S256 & RS256).',
          createdDate: 'Moon OAuth Identity',
          friendsCount: 0,
          followersCount: 0,
          followingsCount: 0,
          presence: 'Online',
          isPremium: !!userAny.isVerified,
          isVerified: !!userAny.isVerified,
          role: String(userAny.providerLabel || 'Moon OAuth Account'),
          lastActive: 'Signed in via Moon OAuth',
        },
        oauthConfigured: true,
        openCloudConfigured,
      });
    } catch (err: any) {
      console.error('Auth.js getSession error:', err);
      return res.json({
        authenticated: false,
        account: null,
        oauthConfigured: true,
        openCloudConfigured,
      });
    }
  });

  /**
   * GET /oauth-complete & /oauth-complete/
   * Popup completion bridge rendered after Auth.js completes /auth/callback/moon
   */
  app.get(['/oauth-complete', '/oauth-complete/'], (req: Request, res: Response) => {
    const errParam =
      (req.query.error as string) || (req.query.error_description as string) || '';
    const payload = errParam
      ? { type: 'ROBLOX_OAUTH_ERROR', error: errParam }
      : { type: 'ROBLOX_OAUTH_SUCCESS' };
    res.send(renderPopupHtml(payload));
  });
}
