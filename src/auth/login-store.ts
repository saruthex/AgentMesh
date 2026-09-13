import { homedir } from 'node:os';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';

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

const credentialPath = join(homedir(), '.agentmesh', 'credentials.json');

function emptyStore(): CredentialFile {
  return { version: 1, credentials: {} };
}

function loadStore(): CredentialFile {
  if (!existsSync(credentialPath)) return emptyStore();
  try {
    const parsed = JSON.parse(readFileSync(credentialPath, 'utf8')) as Partial<CredentialFile>;
    if (parsed.version !== 1 || !parsed.credentials || typeof parsed.credentials !== 'object') return emptyStore();
    return { version: 1, credentials: parsed.credentials as Record<string, StoredCredential> };
  } catch {
    throw new Error(`Unable to read AgentMesh credential store: ${credentialPath}`);
  }
}

function saveStore(store: CredentialFile): void {
  mkdirSync(dirname(credentialPath), { recursive: true, mode: 0o700 });
  writeFileSync(credentialPath, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
  chmodSync(credentialPath, 0o600);
}

export function credentialStorePath(): string {
  return credentialPath;
}

export function saveCredential(credential: StoredCredential): void {
  const store = loadStore();
  store.credentials[credential.provider] = credential;
  saveStore(store);
}

export function getCredential(provider: string): StoredCredential | undefined {
  return loadStore().credentials[provider];
}

export function removeCredential(provider: string): boolean {
  const store = loadStore();
  if (!store.credentials[provider]) return false;
  delete store.credentials[provider];
  saveStore(store);
  return true;
}

export function listCredentialProviders(): string[] {
  return Object.keys(loadStore().credentials);
}
