import { z } from 'zod';

// ─── Configuration from environment ───────────────────────────────────────────

const envSchema = z.object({
  PROJEQTOR_BASE_URL: z.string().url().default('https://localhost/projeqtor'),
  PROJEQTOR_USERNAME: z.string().min(1).default(''),
  PROJEQTOR_PASSWORD: z.string().default(''),
  PROJEQTOR_API_KEY: z.string().min(1).default(''),
  PROJEQTOR_AES_KEY_LENGTH: z.enum(['128', '192', '256']).default('256'),
  MCP_TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3000),
  MCP_HTTP_HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  MAX_RETRIES: z.coerce.number().int().min(0).default(3),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate and return the application configuration.
 * Throws a descriptive error if required variables are missing.
 */
export function loadConfig(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${errors}`);
  }
  const cfg = parsed.data;

  // Runtime validations
  if (!cfg.PROJEQTOR_USERNAME) {
    throw new Error('PROJEQTOR_USERNAME is required');
  }
  if (!cfg.PROJEQTOR_PASSWORD) {
    throw new Error('PROJEQTOR_PASSWORD is required');
  }

  return cfg;
}
