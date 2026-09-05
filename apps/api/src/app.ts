import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { randomUUID } from 'node:crypto';
import { Db } from './db.js';
import { scopePlugin } from './plugins/scope.js';
import { healthRoutes } from './routes/health.js';
import { meRoutes } from './routes/me.js';

export type BuildOptions = { databaseUrl: string; devAuth: boolean; logger?: boolean };

export async function buildApp(opts: BuildOptions) {
  const db = new Db(opts.databaseUrl);
  const app = Fastify({
    logger: opts.logger ?? true,
    genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
  });

  await app.register(swagger, {
    openapi: { info: { title: 'Flexistore PMS API', version: '0.1.0' }, components: { securitySchemes: {} } },
    transform: jsonSchemaTransform,
  });
  await app.register(scopePlugin, { db, devAuth: opts.devAuth });
  await app.register(healthRoutes, { db });
  await app.register(meRoutes);
  app.get('/api/openapi.json', async () => app.swagger());

  app.addHook('onClose', async () => db.close());
  return Object.assign(app, { db });
}
