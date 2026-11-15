import crypto from 'crypto';
import express, { type Express, type Request, type Response } from 'express';
import {
  loadOrGenerateMoonOAuthKeys,
  getPublicOAuthKeysInfo,
  signJwtRs256,
} from './moonOAuthKeys';

export interface MoonOAuthUser {
  sub: string;
  username: string;
  displayName: string;
  picture: string;
  robloxId?: string;
  isVerified?: boolean;
  providerLabel: string;
}

interface PendingAuthRequest {
  id: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  createdAt: number;
}

interface AuthCodeRecord {
  code: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  user: MoonOAuthUser;
  expiresAt: number;
}

interface AccessTokenRecord {
  token: string;
  refreshToken: string;
  clientId: string;
  scope: string;
  user: MoonOAuthUser;
  expiresAt: number;
}

function escapeHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderConsentPage(authReq: PendingAuthRequest, errorMsg?: string): string {
  const scopes = authReq.scope.split(/\s+/).filter(Boolean);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Moon OAuth 2.0 — Authorize Access</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: #202124;
        color: #f1f3f4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .card {
        width: 100%;
        max-width: 440px;
        background: #282a2d;
        border: 1px solid #3c4043;
        border-radius: 24px;
        padding: 26px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.45);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 18px;
      }
      .logo-tile {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: linear-gradient(135deg, #1a73e8, #0f172a);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .brand-title {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .brand-sub {
        font-size: 11px;
        color: #9aa0a6;
        margin-top: 2px;
      }
      .tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        background: #202124;
        padding: 4px;
        border-radius: 12px;
        margin-bottom: 16px;
      }
      .tab-btn {
        border: 0;
        border-radius: 9px;
        padding: 8px 10px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        background: transparent;
        color: #9aa0a6;
        transition: all 0.15s;
      }
      .tab-btn.active {
        background: #303134;
        color: #8ab4f8;
      }
      .panel { display: none; }
      .panel.active { display: block; }
      label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #9aa0a6;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 6px;
      }
      .input-row {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
      }
      input[type="text"] {
        width: 100%;
        height: 38px;
        padding: 0 12px;
        border-radius: 11px;
        border: 1px solid #3c4043;
        background: #202124;
        color: #f1f3f4;
        font-size: 13px;
        outline: none;
      }
      input[type="text"]:focus {
        border-color: #1a73e8;
      }
      .btn-lookup {
        height: 38px;
        padding: 0 14px;
        border-radius: 11px;
        border: 1px solid #3c4043;
        background: #303134;
        color: #e8eaed;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .btn-lookup:hover { background: #3c4043; }
      .quick-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 14px;
      }
      .quick-chip {
        border: 1px solid #3c4043;
        background: #202124;
        color: #bdc1c6;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11px;
        cursor: pointer;
      }
      .quick-chip:hover { border-color: #8ab4f8; color: #8ab4f8; }
      .preview-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 14px;
        background: #202124;
        border: 1px solid #3c4043;
        margin-bottom: 14px;
      }
      .preview-avatar {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        object-fit: cover;
        background: #1a73e8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: white;
        font-size: 15px;
        flex-shrink: 0;
      }
      .meta-box {
        padding: 12px;
        border-radius: 14px;
        background: rgba(26, 115, 232, 0.08);
        border: 1px solid rgba(138, 180, 248, 0.25);
        font-size: 11px;
        color: #bdc1c6;
        margin-bottom: 18px;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 3px 0;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #8ab4f8;
      }
      .error-banner {
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(234, 67, 53, 0.14);
        border: 1px solid rgba(234, 67, 53, 0.4);
        color: #f28b82;
        font-size: 12px;
        margin-bottom: 14px;
      }
      .actions {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 10px;
      }
      .btn-cancel {
        height: 40px;
        border-radius: 12px;
        border: 1px solid #3c4043;
        background: transparent;
        color: #bdc1c6;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-cancel:hover { background: #303134; }
      .btn-approve {
        height: 40px;
        border-radius: 12px;
        border: 0;
        background: #1a73e8;
        color: white;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      .btn-approve:hover { background: #1557b0; }
      .btn-approve:disabled { background: #5f6368; cursor: not-allowed; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">
        <div class="logo-tile">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" fill="#ffffff"/>
          </svg>
        </div>
        <div>
          <div class="brand-title">Moon OAuth 2.0 Authorization</div>
          <div class="brand-sub">Self-hosted OAuth provider · RS256 JWT + PKCE S256</div>
        </div>
      </div>

      ${errorMsg ? `<div class="error-banner">${escapeHtml(errorMsg)}</div>` : ''}

      <div class="tabs">
        <button type="button" class="tab-btn active" id="tab-moon" onclick="switchMode('moon')">Moon Identity</button>
        <button type="button" class="tab-btn" id="tab-roblox" onclick="switchMode('roblox')">Link Roblox Profile</button>
      </div>

      <form method="POST" action="/oauth/authorize/decision" id="oauth-form">
        <input type="hidden" name="reqId" value="${escapeHtml(authReq.id)}" />
        <input type="hidden" name="mode" id="input-mode" value="moon" />
        <input type="hidden" name="sub" id="input-sub" value="" />
        <input type="hidden" name="picture" id="input-picture" value="" />
        <input type="hidden" name="robloxId" id="input-roblox-id" value="" />
        <input type="hidden" name="isVerified" id="input-verified" value="false" />

        <div class="panel active" id="panel-moon">
          <label for="moon-username">Moon Username</label>
          <div class="input-row">
            <input type="text" id="moon-username" name="moonUsername" placeholder="Enter your username (e.g. MoonPilot)" value="MoonPilot" required />
          </div>
          <label for="moon-display">Display Name</label>
          <div class="input-row">
            <input type="text" id="moon-display" name="moonDisplayName" placeholder="Display Name" value="Moon Pilot" />
          </div>
        </div>

        <div class="panel" id="panel-roblox">
          <label for="rbx-username">Real Roblox Username</label>
          <div class="input-row">
            <input type="text" id="rbx-username" name="robloxUsername" placeholder="e.g. Builderman or Stickmasterluke" />
            <button type="button" class="btn-lookup" onclick="lookupRobloxUser()">Verify</button>
          </div>
          <div class="quick-row">
            <button type="button" class="quick-chip" onclick="quickPick('Roblox')">@Roblox</button>
            <button type="button" class="quick-chip" onclick="quickPick('Builderman')">@Builderman</button>
            <button type="button" class="quick-chip" onclick="quickPick('Stickmasterluke')">@Stickmasterluke</button>
          </div>
          <div class="preview-card" id="rbx-preview" style="display:none;">
            <img id="rbx-avatar" class="preview-avatar" src="" alt="Avatar" />
            <div>
              <div id="rbx-name" style="font-size:13px;font-weight:700;"></div>
              <div id="rbx-meta" style="font-size:11px;color:#9aa0a6;"></div>
            </div>
          </div>
          <div id="rbx-status" style="font-size:11px;color:#9aa0a6;margin-bottom:10px;"></div>
        </div>

        <div class="meta-box">
          <div class="meta-row">
            <span>Client Application</span>
            <span class="mono">${escapeHtml(authReq.clientId)}</span>
          </div>
          <div class="meta-row">
            <span>Scopes Requested</span>
            <span class="mono">${escapeHtml(scopes.join(', ') || 'openid profile')}</span>
          </div>
          <div class="meta-row">
            <span>PKCE Protection</span>
            <span class="mono">${authReq.codeChallenge ? escapeHtml(authReq.codeChallengeMethod || 'S256') : 'Active'}</span>
          </div>
        </div>

        <div class="actions">
          <button type="submit" name="decision" value="deny" class="btn-cancel" formnovalidate>Deny</button>
          <button type="submit" name="decision" value="approve" class="btn-approve" id="approve-btn">Authorize &amp; Sign In</button>
        </div>
      </form>
    </div>

    <script>
      var currentMode = 'moon';

      function switchMode(mode) {
        currentMode = mode;
        document.getElementById('input-mode').value = mode;
        document.getElementById('tab-moon').classList.toggle('active', mode === 'moon');
        document.getElementById('tab-roblox').classList.toggle('active', mode === 'roblox');
        document.getElementById('panel-moon').classList.toggle('active', mode === 'moon');
        document.getElementById('panel-roblox').classList.toggle('active', mode === 'roblox');
        document.getElementById('moon-username').required = (mode === 'moon');
      }

      async function quickPick(name) {
        document.getElementById('rbx-username').value = name;
        await lookupRobloxUser();
      }

      async function lookupRobloxUser() {
        var username = document.getElementById('rbx-username').value.trim();
        var statusEl = document.getElementById('rbx-status');
        var previewEl = document.getElementById('rbx-preview');
        if (!username) {
          statusEl.textContent = 'Enter a Roblox username first.';
          return;
        }
        statusEl.textContent = 'Resolving Roblox account...';
        try {
          var res = await fetch('/oauth/resolve-user?username=' + encodeURIComponent(username));
          var data = await res.json();
          if (!res.ok) {
            previewEl.style.display = 'none';
            statusEl.style.color = '#f28b82';
            statusEl.textContent = data.error || 'Account not found.';
            return;
          }
          document.getElementById('input-sub').value = data.id;
          document.getElementById('input-roblox-id').value = data.id;
          document.getElementById('input-picture').value = data.avatarUrl || '';
          document.getElementById('input-verified').value = data.hasVerifiedBadge ? 'true' : 'false';
          document.getElementById('rbx-username').value = data.username;
          document.getElementById('rbx-avatar').src = data.avatarUrl || '';
          document.getElementById('rbx-name').textContent = data.displayName + (data.hasVerifiedBadge ? ' ✓' : '');
          document.getElementById('rbx-meta').textContent = '@' + data.username + ' · ID #' + data.id;
          previewEl.style.display = 'flex';
          statusEl.style.color = '#81c995';
          statusEl.textContent = 'Ready to authorize as @' + data.username;
        } catch (err) {
          statusEl.style.color = '#f28b82';
          statusEl.textContent = 'Could not reach Roblox directory.';
        }
      }
    </script>
  </body>
</html>`;
}

function renderOAuthErrorHtml(title: string, detail: string): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>${escapeHtml(title)}</title></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#202124;color:#f1f3f4;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="max-width:400px;background:#282a2d;border:1px solid #3c4043;border-radius:20px;padding:24px;text-align:center;">
      <div style="font-size:15px;font-weight:700;color:#f28b82;margin-bottom:8px;">${escapeHtml(title)}</div>
      <div style="font-size:13px;color:#9aa0a6;">${escapeHtml(detail)}</div>
    </div>
  </body>
</html>`;
}

function computeS256Challenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

async function resolveRobloxProfileQuick(username: string) {
  const userLookup = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });
  if (!userLookup.ok) {
    throw new Error('Roblox user directory unavailable');
  }
  const json = (await userLookup.json()) as {
    data?: { id: number; name: string; displayName: string; hasVerifiedBadge: boolean }[];
  };
  const found = json.data?.[0];
  if (!found) {
    throw new Error(`Roblox user "${username}" not found.`);
  }
  const thumbRes = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${found.id}&size=150x150&format=Png&isCircular=false`
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const avatarUrl = (thumbRes as any)?.data?.[0]?.imageUrl || '';
  return {
    id: String(found.id),
    username: found.name,
    displayName: found.displayName || found.name,
    hasVerifiedBadge: !!found.hasVerifiedBadge,
    avatarUrl,
  };
}

export function registerMoonOAuthServer(app: Express, port: string | number) {
  // Ensure RSA-2048 JWKS keys + OAuth client credentials exist on disk / memory
  loadOrGenerateMoonOAuthKeys();

  const pendingRequests = new Map<string, PendingAuthRequest>();
  const authCodes = new Map<string, AuthCodeRecord>();
  const accessTokens = new Map<string, AccessTokenRecord>();
  const refreshTokens = new Map<string, { clientId: string; scope: string; user: MoonOAuthUser; expiresAt: number }>();

  // Garbage collect expired OAuth artifacts periodically
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of pendingRequests.entries()) {
      if (now - v.createdAt > 10 * 60 * 1000) pendingRequests.delete(k);
    }
    for (const [k, v] of authCodes.entries()) {
      if (now > v.expiresAt) authCodes.delete(k);
    }
    for (const [k, v] of accessTokens.entries()) {
      if (now > v.expiresAt) accessTokens.delete(k);
    }
    for (const [k, v] of refreshTokens.entries()) {
      if (now > v.expiresAt) refreshTokens.delete(k);
    }
  }, 60 * 1000).unref();

  const router = express.Router();
  router.use(express.urlencoded({ extended: true }));
  router.use(express.json());

  const getIssuerOrigin = (req: Request): string => {
    const fwdProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
    const fwdHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim();
    if (fwdHost) {
      return `${fwdProto || 'https'}://${fwdHost}`;
    }
    if (process.env.APP_URL?.trim()) {
      return process.env.APP_URL.trim().replace(/\/+$/, '');
    }
    return `http://localhost:${port}`;
  };

  /**
   * GET /oauth/.well-known/openid-configuration
   */
  router.get('/.well-known/openid-configuration', (req: Request, res: Response) => {
    const origin = getIssuerOrigin(req);
    res.json({
      issuer: `${origin}/oauth`,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      userinfo_endpoint: `${origin}/oauth/userinfo`,
      jwks_uri: `${origin}/oauth/jwks`,
      revocation_endpoint: `${origin}/oauth/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: ['openid', 'profile'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    });
  });

  /**
   * GET /oauth/jwks
   * Public JSON Web Key Set (RFC 7517) for RS256 token verification
   */
  router.get('/jwks', (_req: Request, res: Response) => {
    const activeKeys = loadOrGenerateMoonOAuthKeys();
    res.json({
      keys: [activeKeys.signingKey.publicJwk],
    });
  });

  /**
   * GET /oauth/resolve-user
   * Helper for the consent UI to verify real Roblox accounts live
   */
  router.get('/resolve-user', async (req: Request, res: Response) => {
    const username = String(req.query.username || '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    try {
      const profile = await resolveRobloxProfileQuick(username);
      res.json(profile);
    } catch (err: any) {
      res.status(404).json({ error: err.message || 'User not found' });
    }
  });

  /**
   * GET /oauth/authorize
   * OAuth 2.0 Authorization Endpoint (RFC 6749 §4.1.1)
   * Supports JSON handshake (?format=json) for in-app iframe consent modal + standalone HTML mode
   */
  router.get('/authorize', (req: Request, res: Response) => {
    const activeKeys = loadOrGenerateMoonOAuthKeys();
    const clientId = String(req.query.client_id || '').trim();
    const redirectUri = String(req.query.redirect_uri || '').trim();
    const responseType = String(req.query.response_type || '').trim();
    const scope = String(req.query.scope || 'openid profile').trim();
    const state = String(req.query.state || '').trim();
    const codeChallenge = String(req.query.code_challenge || '').trim();
    const codeChallengeMethod = String(req.query.code_challenge_method || 'S256').trim();
    const wantsJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');

    if (!clientId || clientId !== activeKeys.clientId) {
      if (wantsJson) {
        return res.status(400).json({ error: 'invalid_client', error_description: `Unknown client_id "${clientId}".` });
      }
      return res
        .status(400)
        .send(renderOAuthErrorHtml('Invalid OAuth Client', `Unknown client_id "${clientId}".`));
    }
    if (!redirectUri) {
      if (wantsJson) {
        return res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri parameter is required.' });
      }
      return res
        .status(400)
        .send(renderOAuthErrorHtml('Missing Redirect URI', 'redirect_uri parameter is required.'));
    }
    if (responseType !== 'code') {
      if (wantsJson) {
        return res.status(400).json({ error: 'unsupported_response_type', error_description: 'Only response_type=code is supported.' });
      }
      return res
        .status(400)
        .send(renderOAuthErrorHtml('Unsupported Response Type', 'Only response_type=code is supported.'));
    }

    const reqId = crypto.randomBytes(16).toString('hex');
    const authReq: PendingAuthRequest = {
      id: reqId,
      clientId,
      redirectUri,
      scope,
      state,
      codeChallenge,
      codeChallengeMethod,
      createdAt: Date.now(),
    };
    pendingRequests.set(reqId, authReq);

    if (wantsJson) {
      const origin = getIssuerOrigin(req);
      return res.json({
        reqId,
        clientId,
        scopes: scope.split(/\s+/).filter(Boolean),
        codeChallenge: codeChallenge ? `${codeChallenge.slice(0, 14)}...` : '',
        codeChallengeMethod,
        redirectUri,
        keys: getPublicOAuthKeysInfo(origin),
      });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(renderConsentPage(authReq));
  });

  /**
   * POST /oauth/authorize/decision
   * Processes user consent (approve or deny) and issues authorization code
   */
  router.post('/authorize/decision', async (req: Request, res: Response) => {
    const wantsJson = req.headers.accept?.includes('application/json');
    const {
      reqId,
      decision,
      mode,
      moonUsername,
      moonDisplayName,
      robloxUsername,
      robloxId,
      picture,
      isVerified,
    } = req.body as Record<string, string>;

    const pending = pendingRequests.get(String(reqId || ''));
    if (!pending) {
      if (wantsJson) {
        return res.status(400).json({ error: 'Authorization request expired. Please try again.' });
      }
      return res
        .status(400)
        .send(renderOAuthErrorHtml('Authorization Request Expired', 'Please return to Moon Client and start sign-in again.'));
    }

    const callbackUrl = new URL(pending.redirectUri);

    if (decision !== 'approve') {
      pendingRequests.delete(pending.id);
      callbackUrl.searchParams.set('error', 'access_denied');
      callbackUrl.searchParams.set('error_description', 'User denied access on Moon OAuth.');
      if (pending.state) callbackUrl.searchParams.set('state', pending.state);
      if (wantsJson) {
        return res.json({ ok: false, denied: true, callbackUrl: callbackUrl.toString() });
      }
      return res.redirect(callbackUrl.toString());
    }

    let user: MoonOAuthUser;

    if (mode === 'roblox') {
      const targetName = String(robloxUsername || '').trim();
      if (!targetName && !robloxId) {
        if (wantsJson) {
          return res.status(400).json({ error: 'Please enter a valid Roblox username to authorize.' });
        }
        return res
          .status(400)
          .send(renderConsentPage(pending, 'Please enter a valid Roblox username to authorize.'));
      }
      try {
        if (robloxId && targetName) {
          user = {
            sub: String(robloxId),
            robloxId: String(robloxId),
            username: targetName,
            displayName: targetName,
            picture: picture || '',
            isVerified: isVerified === 'true',
            providerLabel: 'Moon OAuth · Linked Roblox',
          };
        } else {
          const resolved = await resolveRobloxProfileQuick(targetName);
          user = {
            sub: resolved.id,
            robloxId: resolved.id,
            username: resolved.username,
            displayName: resolved.displayName,
            picture: resolved.avatarUrl,
            isVerified: resolved.hasVerifiedBadge,
            providerLabel: 'Moon OAuth · Linked Roblox',
          };
        }
      } catch (err: any) {
        if (wantsJson) {
          return res.status(400).json({ error: err.message || 'Could not verify Roblox profile.' });
        }
        return res
          .status(400)
          .send(renderConsentPage(pending, err.message || 'Could not verify Roblox profile.'));
      }
    } else {
      const cleanUser = String(moonUsername || '').trim().replace(/^@+/, '');
      if (!cleanUser) {
        if (wantsJson) {
          return res.status(400).json({ error: 'Please enter a Moon username.' });
        }
        return res
          .status(400)
          .send(renderConsentPage(pending, 'Please enter a Moon username.'));
      }
      const cleanDisplay = String(moonDisplayName || '').trim() || cleanUser;
      const stableHash = crypto.createHash('sha256').update(cleanUser.toLowerCase()).digest('hex').slice(0, 12);
      user = {
        sub: `moon-${stableHash}`,
        username: cleanUser,
        displayName: cleanDisplay,
        picture: '',
        isVerified: true,
        providerLabel: 'Moon OAuth Account',
      };
    }

    pendingRequests.delete(pending.id);

    const code = crypto.randomBytes(24).toString('base64url');
    authCodes.set(code, {
      code,
      clientId: pending.clientId,
      redirectUri: pending.redirectUri,
      scope: pending.scope,
      codeChallenge: pending.codeChallenge,
      codeChallengeMethod: pending.codeChallengeMethod,
      user,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    callbackUrl.searchParams.set('code', code);
    if (pending.state) callbackUrl.searchParams.set('state', pending.state);

    if (wantsJson) {
      return res.json({
        ok: true,
        callbackUrl: `${callbackUrl.pathname}${callbackUrl.search}`,
      });
    }
    return res.redirect(callbackUrl.toString());
  });

  /**
   * POST /oauth/token
   * OAuth 2.0 Token Endpoint (RFC 6749 §4.1.3 + PKCE RFC 7636)
   * Signs RS256 JWT access_token and id_token using generated RSA-2048 private key
   */
  router.post('/token', (req: Request, res: Response) => {
    const activeKeys = loadOrGenerateMoonOAuthKeys();
    let clientId = String(req.body?.client_id || '').trim();
    let clientSecret = String(req.body?.client_secret || '').trim();

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Basic ')) {
      try {
        const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        if (colonIdx !== -1) {
          clientId = decodeURIComponent(decoded.slice(0, colonIdx).replace(/\+/g, ' '));
          clientSecret = decodeURIComponent(decoded.slice(colonIdx + 1).replace(/\+/g, ' '));
        }
      } catch {
        return res.status(401).json({ error: 'invalid_client' });
      }
    }

    if (clientId !== activeKeys.clientId || clientSecret !== activeKeys.clientSecret) {
      return res.status(401).json({ error: 'invalid_client', error_description: 'Client authentication failed.' });
    }

    const grantType = String(req.body?.grant_type || '');
    const issuerOrigin = getIssuerOrigin(req);
    const expiresIn = 3600;
    const nowSec = Math.floor(Date.now() / 1000);

    if (grantType === 'refresh_token') {
      const rt = String(req.body?.refresh_token || '');
      const rtRecord = refreshTokens.get(rt);
      if (!rtRecord || rtRecord.clientId !== clientId || Date.now() > rtRecord.expiresAt) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired refresh_token.' });
      }
      refreshTokens.delete(rt);

      const nextAccessToken = signJwtRs256(
        {
          iss: `${issuerOrigin}/oauth`,
          sub: rtRecord.user.sub,
          aud: clientId,
          scope: rtRecord.scope,
          preferred_username: rtRecord.user.username,
          iat: nowSec,
          exp: nowSec + expiresIn,
          jti: crypto.randomUUID(),
        },
        activeKeys
      );
      const nextRefreshToken = crypto.randomBytes(32).toString('base64url');
      accessTokens.set(nextAccessToken, {
        token: nextAccessToken,
        refreshToken: nextRefreshToken,
        clientId,
        scope: rtRecord.scope,
        user: rtRecord.user,
        expiresAt: Date.now() + expiresIn * 1000,
      });
      refreshTokens.set(nextRefreshToken, {
        clientId,
        scope: rtRecord.scope,
        user: rtRecord.user,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      return res.json({
        access_token: nextAccessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: nextRefreshToken,
        scope: rtRecord.scope,
      });
    }

    if (grantType !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    const code = String(req.body?.code || '');
    const redirectUri = String(req.body?.redirect_uri || '');
    const codeVerifier = String(req.body?.code_verifier || '');

    const record = authCodes.get(code);
    if (!record) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or already used authorization code.' });
    }
    authCodes.delete(code);

    if (Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code expired.' });
    }
    if (record.clientId !== clientId || (redirectUri && record.redirectUri !== redirectUri)) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch.' });
    }

    if (record.codeChallenge) {
      if (!codeVerifier) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'Missing PKCE code_verifier.' });
      }
      const computed =
        record.codeChallengeMethod === 'S256'
          ? computeS256Challenge(codeVerifier)
          : codeVerifier;
      if (computed !== record.codeChallenge) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE code_verifier verification failed.' });
      }
    }

    const accessToken = signJwtRs256(
      {
        iss: `${issuerOrigin}/oauth`,
        sub: record.user.sub,
        aud: clientId,
        scope: record.scope,
        preferred_username: record.user.username,
        roblox_id: record.user.robloxId || null,
        iat: nowSec,
        exp: nowSec + expiresIn,
        jti: crypto.randomUUID(),
      },
      activeKeys
    );

    const idToken = signJwtRs256(
      {
        iss: `${issuerOrigin}/oauth`,
        sub: record.user.sub,
        aud: clientId,
        preferred_username: record.user.username,
        name: record.user.displayName,
        picture: record.user.picture,
        roblox_id: record.user.robloxId || null,
        iat: nowSec,
        exp: nowSec + expiresIn,
      },
      activeKeys
    );

    const refreshToken = crypto.randomBytes(32).toString('base64url');

    accessTokens.set(accessToken, {
      token: accessToken,
      refreshToken,
      clientId,
      scope: record.scope,
      user: record.user,
      expiresAt: Date.now() + expiresIn * 1000,
    });
    refreshTokens.set(refreshToken, {
      clientId,
      scope: record.scope,
      user: record.user,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      access_token: accessToken,
      id_token: idToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: record.scope,
    });
  });

  /**
   * GET /oauth/userinfo
   * Protected UserInfo Endpoint (Bearer access_token)
   */
  router.get('/userinfo', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'invalid_token' });
    }
    const token = authHeader.slice(7).trim();
    const record = accessTokens.get(token);
    if (!record || Date.now() > record.expiresAt) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    const u = record.user;
    return res.json({
      sub: u.sub,
      preferred_username: u.username,
      name: u.displayName,
      nickname: u.displayName,
      picture: u.picture,
      roblox_id: u.robloxId || null,
      is_verified: !!u.isVerified,
      auth_provider: 'moon-oauth',
      provider_label: u.providerLabel,
    });
  });

  /**
   * POST /oauth/revoke
   */
  router.post('/revoke', (req: Request, res: Response) => {
    const token = String(req.body?.token || '').trim();
    if (token) {
      accessTokens.delete(token);
      refreshTokens.delete(token);
    }
    return res.json({ revoked: true });
  });

  app.use('/oauth', router);
}
