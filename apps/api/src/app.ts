import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { randomUUID } from 'node:crypto';
import { Db } from './db.js';
import { scopePlugin } from './plugins/scope.js';
import { healthRoutes } from './routes/health.js';
import { meRoutes } from './routes/me.js';
import { cockpitRoutes } from './routes/cockpit.js';
import { sitesRoutes } from './routes/sites.js';
import { customersRoutes } from './routes/customers.js';
import { subscriptionsRoutes } from './routes/subscriptions.js';
import { paymentsRoutes } from './routes/payments.js';
import { leadsRoutes } from './routes/leads.js';
import { arrearsRoutes } from './routes/arrears.js';
import { devicesRoutes } from './routes/devices.js';
import { importRoutes } from './routes/import.js';

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
  await app.register(cockpitRoutes);
  await app.register(sitesRoutes);
  await app.register(customersRoutes);
  await app.register(subscriptionsRoutes);
  await app.register(paymentsRoutes);
  await app.register(leadsRoutes);
  await app.register(arrearsRoutes);
  await app.register(devicesRoutes);
  await app.register(importRoutes);
  app.get('/api/openapi.json', async () => app.swagger());

  app.addHook('onClose', async () => db.close());
  return Object.assign(app, { db });
}
