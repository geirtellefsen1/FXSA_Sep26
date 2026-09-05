export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://app_user:app@localhost:5432/fxpms',
  port: Number(process.env.PORT ?? 3000),
  env: process.env.NODE_ENV ?? 'development',
  /** Header-based auth for development and tests. Never honoured in production. */
  devAuth: (process.env.NODE_ENV ?? 'development') !== 'production' && (process.env.DEV_AUTH ?? 'true') === 'true',
};
