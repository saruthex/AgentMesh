import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { LoginCompletionResult, LoginStartResult, ProviderLoginAdapter } from './auth.js';

const execFileAsync = promisify(execFile);

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GEMINI_SCOPE = 'https://www.googleapis.com/auth/generative-language.retriever';
const DEFAULT_PORT = 47831;

interface PendingLogin {
  state: string;
  verifier: string;
  redirectUri: string;
}

function base64Url(value: Buffer): string {
  return value.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function createVerifier(): string {
  return base64Url(randomBytes(32));
}

function createChallenge(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier).digest());
}

function oauthConfig(): { clientId: string; clientSecret?: string } {
  const clientId = process.env.GEMINI_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GEMINI_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId) {
    throw new Error('Missing GEMINI_OAUTH_CLIENT_ID. Create a Google OAuth desktop client and set its client ID.');
  }
  return { clientId, ...(clientSecret ? { clientSecret } : {}) };
}

async function tryOpenBrowser(url: string): Promise<boolean> {
  const candidates: Array<{ command: string; args: string[] }> = process.platform === 'android'
    ? [{ command: 'termux-open-url', args: [url] }]
    : process.platform === 'darwin'
      ? [{ command: 'open', args: [url] }]
      : process.platform === 'win32'
        ? [{ command: 'cmd', args: ['/c', 'start', '', url] }]
        : [{ command: 'xdg-open', args: [url] }];

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate.command, candidate.args);
      return true;
    } catch {}
  }
  return false;
}

export class GeminiOAuthAdapter implements ProviderLoginAdapter {
  readonly provider = 'gemini';
  readonly methods = ['oauth'] as const;
  private pending?: PendingLogin;
  private server?: ReturnType<typeof createServer>;

  async start(method: 'oauth'): Promise<LoginStartResult> {
    if (method !== 'oauth') throw new Error('Gemini supports OAuth login only.');
    const { clientId } = oauthConfig();
    if (this.pending || this.server) throw new Error('A Gemini login is already in progress.');

    const port = Number(process.env.GEMINI_OAUTH_PORT ?? DEFAULT_PORT);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('GEMINI_OAUTH_PORT must be a valid TCP port.');

    const state = base64Url(randomBytes(24));
    const verifier = createVerifier();
    const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
    this.pending = { state, verifier, redirectUri };

    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const requestUrl = new URL(req.url ?? '/', redirectUri);
      if (requestUrl.pathname !== '/oauth2callback') {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const code = requestUrl.searchParams.get('code');
      const returnedState = requestUrl.searchParams.get('state');
      const error = requestUrl.searchParams.get('error');
      if (error) {
        res.statusCode = 400;
        res.end(`Gemini login failed: ${error}`);
        return;
      }
      if (!code || !returnedState) {
        res.statusCode = 400;
        res.end('Missing OAuth code/state.');
        return;
      }
      (this as GeminiOAuthAdapter).callback = { code, state: returnedState };
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!doctype html><html><body><h2>AgentMesh Gemini login complete.</h2><p>You can return to Termux.</p></body></html>');
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(port, '127.0.0.1', () => resolve());
    });

    const authUrl = new URL(AUTH_ENDPOINT);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GEMINI_SCOPE);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', createChallenge(verifier));
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return { provider: this.provider, method, authorizationUrl: authUrl.toString() };
  }

  private callback?: { code: string; state: string };

  async complete(input: { code?: string; state?: string }): Promise<LoginCompletionResult> {
    const pending = this.pending;
    if (!pending) throw new Error('No Gemini OAuth login is in progress. Run login again.');

    const callback = input.code && input.state ? input : this.callback;
    if (!callback?.code || !callback.state) throw new Error('Waiting for Gemini OAuth callback. Complete the browser login first.');
    if (callback.state !== pending.state) throw new Error('Gemini OAuth state mismatch. Login aborted for safety.');

    const { clientId, clientSecret } = oauthConfig();
    const body = new URLSearchParams({
      client_id: clientId,
      code: callback.code,
      code_verifier: pending.verifier,
      grant_type: 'authorization_code',
      redirect_uri: pending.redirectUri,
      ...(clientSecret ? { client_secret: clientSecret } : {})
    });

    try {
      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };
      if (!response.ok || !data.access_token) {
        throw new Error(data.error_description ?? data.error ?? `Gemini token exchange failed (${response.status}).`);
      }
      return {
        provider: this.provider,
        accessToken: data.access_token,
        ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
        ...(data.expires_in ? { expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString() } : {})
      };
    } finally {
      this.server?.close();
      this.server = undefined;
      this.pending = undefined;
      this.callback = undefined;
    }
  }

  async openAuthorizationUrl(url: string): Promise<boolean> {
    return tryOpenBrowser(url);
  }
}
