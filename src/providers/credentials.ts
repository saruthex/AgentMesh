import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface StoredCredential {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  accountLabel?: string;
}

interface CredentialFile {
  version: 1;
  credentials: Record<string, StoredCredential>;
}

const DIR = join(homedir(), '.agentmesh');
const FILE = join(DIR, 'credentials.json');

function ensureStore(): void {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true, mode: 0o700 });
  chmodSync(DIR, 0o700);
  if (!existsSync(FILE)) writeFileSync(FILE, JSON.stringify({ version: 1, credentials: {} }, null, 2) + '\n', { mode: 0o600 });
  chmodSync(FILE, 0o600);
}

function readStore(): CredentialFile {
  ensureStore();
  try {
    return JSON.parse(readFileSync(FILE, 'utf8')) as CredentialFile;
  } catch {
    throw new Error(`AgentMesh credential store is unreadable: ${FILE}`);
  }
}

function writeStore(store: CredentialFile): void {
  ensureStore();
  writeFileSync(FILE, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
  chmodSync(FILE, 0o600);
}

export function saveCredential(credential: StoredCredential): void {
  const store = readStore();
  store.credentials[credential.provider] = credential;
  writeStore(store);
}

export function getCredential(provider: string): StoredCredential | undefined {
  return readStore().credentials[provider];
}

export function removeCredential(provider: string): boolean {
  const store = readStore();
  const existed = Boolean(store.credentials[provider]);
  delete store.credentials[provider];
  if (existed) writeStore(store);
  return existed;
}

export function credentialStatus(provider: string): { authenticated: boolean; accountLabel?: string; expiresAt?: string } {
  const credential = getCredential(provider);
  return {
    authenticated: Boolean(credential?.accessToken),
    accountLabel: credential?.accountLabel,
    expiresAt: credential?.expiresAt
  };
}

export function credentialStorePath(): string {
  return FILE;
}
