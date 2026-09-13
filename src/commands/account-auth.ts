import chalk from 'chalk';
import { accountAuthStatus } from '../auth/account-status.js';

export function printAccountAuthStatus(): void {
  console.log(chalk.bold('Account authentication'));
  for (const status of accountAuthStatus()) {
    if (status.authenticated) {
      console.log(chalk.green(`✓ ${status.label}: ${status.accountLabel ? `signed in as ${status.accountLabel}` : 'signed in'}`));
    } else if (status.available) {
      console.log(chalk.yellow(`○ ${status.label}: available — run agentmesh login ${status.provider}`));
    } else {
      console.log(chalk.gray(`○ ${status.label}: unavailable`));
    }
  }
}
