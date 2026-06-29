import { Env } from './env.validation';

/**
 * Strongly-typed, namespaced view of the validated environment. Injected via
 * `ConfigService<AppConfig, true>` so consumers get autocomplete and never
 * touch `process.env` directly.
 */
export interface AppConfig {
  port: number;
  corsOrigins: string[];
  supabase: {
    url: string;
    serviceRoleKey: string;
    storageBucket: string;
  };
  gemini: {
    apiKey: string;
    embeddingModel: string;
    generationModel: string;
    embeddingDim: number;
  };
}

export function buildConfig(env: Env): AppConfig {
  return {
    port: env.API_PORT,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    supabase: {
      url: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      storageBucket: env.SUPABASE_STORAGE_BUCKET,
    },
    gemini: {
      apiKey: env.GEMINI_API_KEY,
      embeddingModel: env.GEMINI_EMBEDDING_MODEL,
      generationModel: env.GEMINI_GENERATION_MODEL,
      embeddingDim: env.GEMINI_EMBEDDING_DIM,
    },
  };
}
