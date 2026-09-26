import { z } from 'zod';

export const NotFound = z.object({ error: z.string(), request_id: z.string() });
