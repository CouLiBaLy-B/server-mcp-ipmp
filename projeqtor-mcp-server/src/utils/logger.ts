import type { EnvConfig } from '../config.js';

const levels: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function createLogger(cfg: EnvConfig) {
  const minLevel = levels[cfg.LOG_LEVEL] ?? 1;
  function log(level: keyof typeof levels, message: string, meta?: unknown) {
    if (levels[level] < minLevel) return;
    const ts = new Date().toISOString();
    const tag = `[${ts}] [${level.toUpperCase()}]`;
    const payload = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
    process.stderr.write(`${tag} ${message}${payload}\n`);
  }
  return {
    debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
    info: (msg: string, meta?: unknown) => log('info', msg, meta),
    warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
    error: (msg: string, meta?: unknown) => log('error', msg, meta),
  };
}
export type Logger = ReturnType<typeof createLogger>;
