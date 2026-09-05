import { buildApp } from './app.js';
import { config } from './config.js';

const app = await buildApp({ databaseUrl: config.databaseUrl, devAuth: config.devAuth });
await app.listen({ port: config.port, host: '0.0.0.0' });
app.log.info({ devAuth: config.devAuth, env: config.env }, 'fxpms api up');
