export class McpToolError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  constructor(message: string, { code = 'TOOL_ERROR', retryable = false, cause }: { code?: string; retryable?: boolean; cause?: Error } = {}) {
    super(message);
    this.name = 'McpToolError';
    this.code = code;
    this.retryable = retryable;
    if (cause) this.cause = cause;
  }
  toMcpResult(): { content: Array<{ type: 'text'; text: string }>; isError: true } {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: this.message, code: this.code }) }],
      isError: true,
    };
  }
}

export function withErrorHandling<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  context: string,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof McpToolError) throw err;
      throw new McpToolError(`${context} failed: ${err instanceof Error ? err.message : String(err)}`, {
        code: 'INTERNAL_ERROR',
        cause: err instanceof Error ? err : undefined,
      });
    }
  };
}
