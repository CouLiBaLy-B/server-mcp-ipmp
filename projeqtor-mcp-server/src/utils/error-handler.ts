export class ProjeQtOrApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown,
    readonly retryable = false
  ) {
    super(message);
    this.name = "ProjeQtOrApiError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, readonly details?: unknown) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Converts unknown exceptions to safe, LLM-actionable MCP text. */
export function formatError(error: unknown): string {
  if (error instanceof ProjeQtOrApiError) {
    const hint = error.retryable ? " The request may be retried later." : " Check the input, object permissions or ProjeQtOr API availability.";
    return `ProjeQtOr API error${error.status ? ` (${error.status})` : ""}: ${error.message}.${hint}`;
  }
  if (error instanceof ValidationError) {
    return `Validation error: ${error.message}`;
  }
  if (error instanceof Error) {
    return `Unexpected error: ${error.message}`;
  }
  return "Unexpected error: unknown failure";
}

export function mcpText(data: unknown) {
  return {
    content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }]
  };
}

export function mcpError(error: unknown) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: formatError(error) }]
  };
}

export async function safeTool<T>(fn: () => Promise<T> | T) {
  try {
    return mcpText(await fn());
  } catch (e) {
    return mcpError(e);
  }
}
