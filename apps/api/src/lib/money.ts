import { z } from 'zod';

/**
 * Money is always { amount_minor, currency }. amount_minor comes back from Postgres bigint
 * columns as a decimal string (Db overrides the int8 type parser) so it never loses
 * precision going through JSON/JS number — treat it as an opaque integer string, not a number.
 */
export const Money = z.object({ amount_minor: z.string(), currency: z.string().length(3) });
export type Money = z.infer<typeof Money>;

export function money(amountMinor: string | number | null | undefined, currency: string | null | undefined): Money | null {
  if (amountMinor == null || currency == null) return null;
  return { amount_minor: String(amountMinor), currency };
}
