import { z } from "zod";

const ConfigSchema = z.object({
  PROJEQTOR_BASE_URL: z.string().url().describe("Base URL of the ProjeQtOr instance, without trailing /api"),
  PROJEQTOR_USERNAME: z.string().min(1),
  PROJEQTOR_PASSWORD: z.string().min(1),
  PROJEQTOR_API_KEY: z.string().min(1).describe("Per-user AES API key configured in ProjeQtOr"),
  PROJEQTOR_AES_KEY_LENGTH: z.coerce.number().int().refine((v) => [128, 192, 256].includes(v), "Must be 128, 192 or 256").default(128),
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3000),
  MCP_HTTP_HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PROJEQTOR_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  PROJEQTOR_RETRY_ATTEMPTS: z.coerce.number().int().min(0).max(8).default(3),
  PROJEQTOR_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(300)
});

export type AppConfig = z.infer<typeof ConfigSchema>;

/** Loads and validates environment based configuration. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid configuration: ${details}`);
  }
  return {
    ...parsed.data,
    PROJEQTOR_BASE_URL: parsed.data.PROJEQTOR_BASE_URL.replace(/\/+$/, "")
  };
}
