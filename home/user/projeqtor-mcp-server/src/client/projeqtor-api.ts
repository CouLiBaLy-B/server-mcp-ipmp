import { URL } from 'node:url';
import type { EnvConfig, Logger } from '../config.js';
import { encryptPayload } from './aes-ctr.js';
import { McpToolError } from '../utils/error-handler.js';

// ─── HTTP Client for ProjeQtOr REST API ─────────────────────────────────────

/** Generic response wrapper from ProjeQtOr API */
export interface ProjeqtorResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

/**
 * HTTP client for ProjeQtOr REST API.
 * Handles authentication, encryption, retries, and error handling.
 */
export class ProjeqtorApiClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly log: Logger;
  private readonly config: EnvConfig;

  constructor(config: EnvConfig, logger: Logger) {
    this.config = config;
    this.baseUrl = config.PROJEQTOR_BASE_URL.replace(/\/+$/, '');
    const creds = Buffer.from(`${config.PROJEQTOR_USERNAME}:${config.PROJEQTOR_PASSWORD}`).toString(
      'base64',
    );
    this.authHeader = `Basic ${creds}`;
    this.timeoutMs = config.REQUEST_TIMEOUT_MS;
    this.maxRetries = config.MAX_RETRIES;
    this.log = logger;
  }

  // ──────────── Public API methods ──────────────────────────────────────

  /** Get a single object by ID */
  async getById<T = unknown>(objectClass: string, id: string | number): Promise<T> {
    return this.fetchJson<T>(`${objectClass}/${id}`);
  }

  /** Get all objects of a class */
  async getAll<T = unknown>(
    objectClass: string,
    params?: Record<string, string>,
  ): Promise<T[]> {
    return this.fetchJson<T[]>(`all/${objectClass}`, { query: params });
  }

  /** Search objects with SQL-like criteria */
  async search<T = unknown>(
    objectClass: string,
    criteria: string[],
  ): Promise<T[]> {
    const searchPath = criteria.map(encodeURIComponent).join('/');
    return this.fetchJson<T[]>(`search/${objectClass}/${searchPath}`);
  }

  /** Get objects modified between two dates */
  async getUpdated<T = unknown>(
    objectClass: string,
    from: string,
    to: string,
  ): Promise<T[]> {
    return this.fetchJson<T[]>(`updated/${objectClass}/${from}/${to}`);
  }

  /** Filter objects by predefined filter */
  async getFiltered<T = unknown>(
    objectClass: string,
    filterId: string,
  ): Promise<T[]> {
    return this.fetchJson<T[]>(`filter/${objectClass}/${filterId}`);
  }

  /** Create a new object (encrypted) */
  async create<T = unknown>(
    objectClass: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    return this.writeRequest<T>('PUT', objectClass, data);
  }

  /** Update an existing object (encrypted) */
  async update<T = unknown>(
    objectClass: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    return this.writeRequest<T>('POST', objectClass, data);
  }

  /** Delete an object (encrypted) */
  async delete(objectClass: string, id: string | number): Promise<void> {
    await this.writeRequest<void>('DELETE', objectClass, { id: String(id) });
  }

  // ──────────── Internal helpers ────────────────────────────────────────

  /** Perform a GET request with retry logic */
  private async fetchJson<T>(path: string, opts?: { query?: Record<string, string> }): Promise<T> {
    const url = new URL(`api/${path}`, this.baseUrl);
    if (opts?.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        url.searchParams.set(k, v);
      }
    }

    return this.withRetry(async () => {
      this.log.debug('GET', { url: url.toString() });
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new McpToolError(
          `HTTP ${res.status} from ProjeQtOr: ${body.slice(0, 500)}`,
          { code: 'HTTP_ERROR', retryable: res.status >= 500 },
        );
      }

      const json = (await res.json()) as ProjeqtorResponse<T>;
      if (!json.success && json.message) {
        throw new McpToolError(`ProjeQtOr API error: ${json.message}`, {
          code: 'API_ERROR',
        });
      }
      return (json.data ?? json) as T;
    });
  }

  /** Perform an encrypted write request (PUT/POST/DELETE) */
  private async writeRequest<T>(
    method: 'PUT' | 'POST' | 'DELETE',
    objectClass: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    const { encrypted, iv } = encryptPayload(data, this.config);
    const url = new URL(`api/${objectClass}`, this.baseUrl);

    return this.withRetry(async () => {
      this.log.debug(`${method} ${objectClass}`, { iv });
      const res = await fetch(url.toString(), {
        method,
        headers: {
          ...this.getHeaders(),
          'X-ENCRYPTION-IV': iv,
          'Content-Type': 'application/json',
        },
        body: encrypted,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new McpToolError(
          `HTTP ${res.status} from ProjeQtOr: ${body.slice(0, 500)}`,
          { code: 'HTTP_ERROR', retryable: res.status >= 500 },
        );
      }

      const json = (await res.json()) as ProjeqtorResponse<T>;
      if (!json.success && json.message) {
        throw new McpToolError(`ProjeQtOr API error: ${json.message}`, {
          code: 'API_ERROR',
        });
      }
      return (json.data ?? json) as T;
    });
  }

  /** Get standard headers for all requests */
  private getHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      Accept: 'application/json',
    };
  }

  /** Retry wrapper with exponential backoff */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (!(lastError instanceof McpToolError) || !lastError.message.includes('retryable')) {
          throw lastError; // Non-retryable error, fail immediately
        }
        const delay = Math.min(1000 * 2 ** attempt, 30_000);
        this.log.warn(`Retry attempt ${attempt + 1}/${this.maxRetries} after ${delay}ms`, {
          error: lastError.message,
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastError ?? new Error('Unknown retry failure');
  }
}
