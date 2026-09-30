// Reads and checks the environment variables once at start-up (NFR-POR-02).
// A missing or invalid value stops the API with a clear message instead of failing later.
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Sessions and passwords (ADR-0005, NFR-SEC-01, NFR-SEC-06).
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168), // 7 days
  COOKIE_SECURE: z.stringbool().default(false), // true in production (HTTPS only)
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  // How many proxies sit in front of the API: 1 for the web app's /api proxy (Docker), 2 when a
  // hosting load balancer is added behind it. Rate limits are keyed on the IP they report (NFR-SEC-07).
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
});

export type Env = z.infer<typeof envSchema>;

function readEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (result.success) {
    return result.data;
  }
  const problems = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration — ${problems}`);
}

export const env = readEnv();
export const isProduction = env.NODE_ENV === 'production';
