import { z } from 'zod';

/** Small denormalised references embedded in list/detail responses, never a full row. */
export const CustomerRef = z.object({ id: z.string().uuid(), account_number: z.string().nullable(), full_name: z.string().nullable() });
export const SiteRef = z.object({ id: z.string().uuid(), name: z.string(), short_code: z.string() });
export const UnitRef = z.object({ id: z.string().uuid(), number: z.string(), display_name: z.string().nullable() });

export type CustomerRef = z.infer<typeof CustomerRef>;
export type SiteRef = z.infer<typeof SiteRef>;
export type UnitRef = z.infer<typeof UnitRef>;
