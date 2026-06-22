import type { AppConfig } from "../config.js";
import { encryptAesCtr } from "./aes-ctr.js";
import { ProjeQtOrApiError } from "../utils/error-handler.js";
import type { Logger } from "../utils/logger.js";

export type ObjectClass = string;
export type WriteMethod = "PUT" | "POST" | "DELETE";
export interface SearchCriterion { field: string; operator?: string; value: string | number | boolean; }

export class ProjeQtOrApiClient {
  private readonly apiBase: string;
  private readonly authHeader: string;

  constructor(private readonly config: AppConfig, private readonly logger: Logger) {
    this.apiBase = `${config.PROJEQTOR_BASE_URL}/api`;
    this.authHeader = `Basic ${Buffer.from(`${config.PROJEQTOR_USERNAME}:${config.PROJEQTOR_PASSWORD}`).toString("base64")}`;
  }

  /** Retrieves an object by ProjeQtOr class and id. */
  getObject<T = unknown>(objectClass: ObjectClass, id: string | number): Promise<T> {
    return this.request<T>("GET", `/${encodeURIComponent(objectClass)}/${encodeURIComponent(String(id))}`);
  }

  /** Lists all objects of a ProjeQtOr class. */
  listAll<T = unknown>(objectClass: ObjectClass): Promise<T> {
    return this.request<T>("GET", `/${encodeURIComponent(objectClass)}/all`);
  }

  /** Retrieves objects using a saved ProjeQtOr filter id. */
  filter<T = unknown>(objectClass: ObjectClass, filterId: string | number): Promise<T> {
    return this.request<T>("GET", `/${encodeURIComponent(objectClass)}/filter/${encodeURIComponent(String(filterId))}`);
  }

  /** Searches objects. Criteria are converted to field:operator:value URL path segments. */
  search<T = unknown>(objectClass: ObjectClass, criteria: SearchCriterion[]): Promise<T> {
    const segments = criteria.map((c) => encodeURIComponent(`${c.field}:${c.operator ?? "= "}:${c.value}`.replace("= :", "=:")));
    return this.request<T>("GET", `/${encodeURIComponent(objectClass)}/search/${segments.join("/")}`);
  }

  /** Retrieves objects updated between ProjeQtOr timestamps YYYYMMDDHHMMSS. */
  updated<T = unknown>(objectClass: ObjectClass, from: string, to: string): Promise<T> {
    return this.request<T>("GET", `/${encodeURIComponent(objectClass)}/updated/${from}/${to}`);
  }

  /** Creates an object. Body is AES-CTR encrypted as required by ProjeQtOr writes. */
  create<T = unknown>(objectClass: ObjectClass, data: Record<string, unknown>): Promise<T> {
    return this.write<T>("PUT", objectClass, data);
  }

  /** Updates an object. Body is AES-CTR encrypted as required by ProjeQtOr writes. */
  update<T = unknown>(objectClass: ObjectClass, data: Record<string, unknown>): Promise<T> {
    return this.write<T>("POST", objectClass, data);
  }

  /** Deletes an object by sending an encrypted JSON payload, usually including id. */
  delete<T = unknown>(objectClass: ObjectClass, data: Record<string, unknown>): Promise<T> {
    return this.write<T>("DELETE", objectClass, data);
  }

  private write<T>(method: WriteMethod, objectClass: ObjectClass, data: Record<string, unknown>): Promise<T> {
    const json = JSON.stringify(data);
    const encrypted = encryptAesCtr(json, this.config.PROJEQTOR_API_KEY, this.config.PROJEQTOR_AES_KEY_LENGTH as 128 | 192 | 256);
    // Common ProjeQtOr API integrations expect an encrypted "data" field.
    return this.request<T>(method, `/${encodeURIComponent(objectClass)}`, { data: encrypted });
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.apiBase}${path}`;
    let attempt = 0;
    let lastError: unknown;
    while (attempt <= this.config.PROJEQTOR_RETRY_ATTEMPTS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.PROJEQTOR_TIMEOUT_MS);
        const response = await fetch(url, {
          method,
          headers: {
            Authorization: this.authHeader,
            Accept: "application/json",
            ...(body === undefined ? {} : { "Content-Type": "application/json" })
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal
        }).finally(() => clearTimeout(timeout));

        const text = await response.text();
        const parsed = text ? safeJson(text) : null;
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          throw new ProjeQtOrApiError(extractApiMessage(parsed) ?? response.statusText, response.status, parsed, retryable);
        }
        return parsed as T;
      } catch (e) {
        lastError = e;
        const retryable = e instanceof ProjeQtOrApiError ? e.retryable : e instanceof Error && e.name === "AbortError";
        if (!retryable || attempt >= this.config.PROJEQTOR_RETRY_ATTEMPTS) break;
        const delay = this.config.PROJEQTOR_RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
        this.logger.warn("Retrying ProjeQtOr API request", { method, path, attempt: attempt + 1, delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt += 1;
      }
    }
    if (lastError instanceof ProjeQtOrApiError) throw lastError;
    if (lastError instanceof Error) throw new ProjeQtOrApiError(lastError.message, undefined, undefined, true);
    throw new ProjeQtOrApiError("Unknown API failure", undefined, undefined, true);
  }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

function extractApiMessage(value: unknown): string | undefined {
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const k of ["message", "error", "errorMessage", "result"]) {
      if (typeof obj[k] === "string") return obj[k] as string;
    }
  }
  return typeof value === "string" ? value : undefined;
}
