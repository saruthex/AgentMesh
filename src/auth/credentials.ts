import { existsSync, mkdirSync, readFileSync, chmodSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export interface StoredCredential {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  accountLabel?: string;
}

interface CredentialFile {
  version: 1;
  credentials: StoredCredential[];
}

const dir = join(homedir(), '.agentmesh');
const file = join(dir, 'credentials.json');

function ensureStore(): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { chmodSync(dir, 0o700); } catch {}
}

function readStore(): CredentialFile {
  ensureStore();
  if (!existsSync(file)) return { version: 1, credentials: [] };
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as any;
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.credentials)) {
        return { version: 1, credentials: parsed.credentials };
      }
      if (typeof parsed.credentials === 'object' && parsed.credentials !== null) {
        return { version: 1, credentials: Object.values(parsed.credentials) };
      }
    }
  } catch {}
  return { version: 1, credentials: [] };
}

function writeStore(store: CredentialFile): void {
  ensureStore();
  writeFileSync(file, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
  try { chmodSync(file, 0o600); } catch {}
}

export function saveCredential(credential: StoredCredential): void {
  const store = readStore();
  store.credentials = store.credentials.filter(item => item.provider !== credential.provider || item.accountLabel !== credential.accountLabel);
  store.credentials.push(credential);
  writeStore(store);
}

export function getCredential(provider: string): StoredCredential | undefined {
  return readStore().credentials.find(item => item.provider === provider);
}

export function removeCredential(provider: string): boolean {
  const store = readStore();
  const before = store.credentials.length;
  store.credentials = store.credentials.filter(item => item.provider !== provider);
  if (before === store.credentials.length) return false;
  writeStore(store);
  return true;
}

export function credentialStorePath(): string { return file; }
