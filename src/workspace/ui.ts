import chalk from 'chalk';
import { emitActivity, type ActivityEvent } from './activity.js';

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frame = 0;
let timer: NodeJS.Timeout | undefined;
let active = false;

function render(event: ActivityEvent): void {
  if (!process.stdout.isTTY) return;
  if (event.kind === 'working' || event.kind === 'tool' || event.kind === 'retry') {
    process.stdout.write(`\r${chalk.cyan(frames[frame++ % frames.length])} ${event.message}${event.detail ? chalk.gray(` · ${event.detail}`) : ''}   `);
  } else {
    process.stdout.write('\r\x1b[2K');
  }
}

export function startActivityRenderer(): void {
  if (active) return;
  active = true;
  if (process.stdout.isTTY) timer = setInterval(() => {
    if (active) render({ kind: 'working', message: 'Working…' });
  }, 90);
  emitActivity({ kind: 'done', message: '' });
}

export function stopActivityRenderer(): void {
  active = false;
  if (timer) clearInterval(timer);
  timer = undefined;
  if (process.stdout.isTTY) process.stdout.write('\r\x1b[2K');
}

export function attachActivityRenderer(): () => void {
  const unsubscribe = (() => {
    const listener = (event: ActivityEvent) => render(event);
    return listener;
  })();
  // Activity listeners are managed by a small adapter so the renderer stays optional.
  const { subscribeActivity } = require('./activity.js') as typeof import('./activity.js');
  const off = subscribeActivity(unsubscribe);
  return () => { off(); stopActivityRenderer(); };
}
