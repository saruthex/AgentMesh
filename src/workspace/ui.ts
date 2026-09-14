import chalk from 'chalk';
import { emitActivity, subscribeActivity, type ActivityEvent } from './activity.js';

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frame = 0;
let timer: NodeJS.Timeout | undefined;
let active = false;
let unsubscribe: (() => void) | undefined;
let currentMessage = '';
let currentDetail = '';

function render(): void {
  if (!process.stdout.isTTY || !active) return;
  process.stdout.write(`\r${chalk.cyan(frames[frame++ % frames.length])} ${currentMessage}${currentDetail ? chalk.gray(` · ${currentDetail}`) : ''}   `);
}

function onActivity(event: ActivityEvent): void {
  if (event.kind === 'working' || event.kind === 'tool' || event.kind === 'retry') {
    currentMessage = event.message;
    currentDetail = event.detail ?? '';
    render();
    return;
  }
  if (event.kind === 'done' || event.kind === 'error') {
    clearActivityLine();
  }
}

function clearActivityLine(): void {
  if (process.stdout.isTTY) process.stdout.write('\r\x1b[2K');
}

export function startActivityRenderer(): void {
  if (active) return;
  active = true;
  currentMessage = 'Working…';
  currentDetail = '';
  unsubscribe = subscribeActivity(onActivity);
  if (process.stdout.isTTY) timer = setInterval(render, 90);
  render();
}

export function stopActivityRenderer(): void {
  active = false;
  if (timer) clearInterval(timer);
  timer = undefined;
  unsubscribe?.();
  unsubscribe = undefined;
  clearActivityLine();
}

export function runWithActivity<T>(work: () => Promise<T>): Promise<T> {
  startActivityRenderer();
  return work().finally(stopActivityRenderer);
}

// Keep the event API available to callers that want to emit a custom activity state.
export { emitActivity };
