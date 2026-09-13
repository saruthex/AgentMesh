import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from '../storage/project.js';

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'custom';

export interface ProviderCredential {
  apiKey?: string;
  baseUrl?: string;
}

interface CredentialStore {
  providers: Record<string, ProviderCredential>;
}

const DIR = '.agentmesh';
const FILE = 'credentials.json';

function credentialsPath(root: string): string {
  return path.join(root, DIR, FILE);
}

function loadStore(root: string): CredentialStore {
  const file = credentialsPath(root);
  if (!fs.existsSync(file)) return { providers: {} };
  return JSON.parse(fs.readFileSync(file, 'utf8')) as CredentialStore;
}

function writeStore(root: string, store: CredentialStore): void {
  const file = credentialsPath(root);
  fs.writeFileSync(file, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Best-effort on platforms where chmod is unavailable or restricted.
  }
}

export function setProviderCredential(provider: ProviderId, credential: ProviderCredential): void {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
  const store = loadStore(root);
  store.providers[provider] = credential;
  writeStore(root, store);
}

export function getProviderCredential(provider: ProviderId): ProviderCredential | undefined {
  const root = findProjectRoot(process.cwd());
  if (root) {
    const local = loadStore(root).providers[provider];
    if (local?.apiKey || local?.baseUrl) return local;
  }

  const envKey = `${provider.toUpperCase()}_API_KEY`;
  const apiKey = process.env[envKey];
  const baseUrl = process.env[`${provider.toUpperCase()}_BASE_URL`];
  if (!apiKey && !baseUrl) return undefined;
  return { apiKey, baseUrl };
}

export function clearProviderCredential(provider: ProviderId): void {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new Error('No AgentMesh project found. Run: agentmesh init');
  const store = loadStore(root);
  delete store.providers[provider];
  writeStore(root, store);
}
