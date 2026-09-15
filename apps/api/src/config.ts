import { z } from "zod";

const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_DEPLOYMENT: z.string().default("gpt-5.4"),
  AZURE_OPENAI_API_VERSION: z.string().default("2025-04-01-preview"),
  ACTIVE_GIT_SHA: z.string().default("local-development"),
  ENABLE_CLARIO_TEST_MODE: z.string().default("false")
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(["true", "false"]))
    .transform((value) => value === "true"),
  MAX_REQUEST_BYTES: z.coerce.number().int().positive().default(262_144),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return ConfigSchema.parse(environment);
}