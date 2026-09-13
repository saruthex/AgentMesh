import chalk from 'chalk';
import { listAccountAuthCapabilities } from '../auth/account-service.js';
import { getCredential } from '../providers/credentials.js';

export function printAccountLoginMenu(): void {
  console.log(chalk.bold('AgentMesh account login'));
  console.log('Choose a provider account:');

  for (const capability of listAccountAuthCapabilities()) {
    const credential = getCredential(capability.provider);
    const status = credential?.accessToken
      ? chalk.green(`✓ ${credential.accountLabel ? `signed in as ${credential.accountLabel}` : 'signed in'}`)
      : capability.status === 'available'
        ? chalk.green('available')
        : chalk.yellow('not available');
    console.log(`  ${capability.label} — ${status}`);
    if (capability.status !== 'available' && capability.reason) {
      console.log(chalk.gray(`    ${capability.reason}`));
    }
  }
}
