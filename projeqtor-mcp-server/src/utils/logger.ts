import type { AppConfig } from "../config.js";

export type LogLevel = "debug" | "info" | "warn" | "error";
const rank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export class Logger {
  constructor(private readonly level: LogLevel = "info") {}

  private enabled(level: LogLevel): boolean {
    return rank[level] >= rank[this.level];
  }

  private sanitize(value: unknown): unknown {
    if (typeof value === "string") {
      return value
        .replace(/(Authorization:\s*Basic\s+)[A-Za-z0-9+/=]+/gi, "$1[REDACTED]")
        .replace(/(password|api[_-]?key|token|secret)(["'\s:=]+)([^"'\s,}]+)/gi, "$1$2[REDACTED]");
    }
    if (value && typeof value === "object") {
      return JSON.parse(JSON.stringify(value, (k, v) => /password|apiKey|api_key|token|secret/i.test(k) ? "[REDACTED]" : v));
    }
    return value;
  }

  private emit(level: LogLevel, message: string, meta?: unknown): void {
    if (!this.enabled(level)) return;
    const record = { ts: new Date().toISOString(), level, message, ...(meta === undefined ? {} : { meta: this.sanitize(meta) }) };
    // IMPORTANT: MCP stdio uses stdout for JSON-RPC. Logs must always go to stderr.
    console.error(JSON.stringify(record));
  }

  debug(message: string, meta?: unknown): void { this.emit("debug", message, meta); }
  info(message: string, meta?: unknown): void { this.emit("info", message, meta); }
  warn(message: string, meta?: unknown): void { this.emit("warn", message, meta); }
  error(message: string, meta?: unknown): void { this.emit("error", message, meta); }
}

export function createLogger(config: Pick<AppConfig, "LOG_LEVEL">): Logger {
  return new Logger(config.LOG_LEVEL);
}
