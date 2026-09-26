import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Money, money } from '../lib/money.js';

const Kpis = z.object({
  mrr: Money,
  outstanding: Money,
  outstanding_count: z.number().int(),
  collected_today: Money,
  payments_today: z.number().int(),
  payments_failed_today: z.number().int(),
  moveins_today: z.number().int(),
  moveouts_today: z.number().int(),
  occupancy_avg_pct: z.number().nullable(),
  devices_total: z.number().int(),
  devices_online: z.number().int(),
  devices_degraded: z.number().int(),
  devices_offline: z.number().int(),
  proposals_pending: z.number().int(),
});

const SiteHealth = z.object({
  site_id: z.string().uuid(),
  name: z.string(),
  short_code: z.string(),
  occupancy_pct: z.number().nullable(),
  units_total: z.number().int(),
  units_occupied: z.number().int(),
  mrr: Money,
  // Daily count of `unit.status_changed` activity events per site over the last 14 days, oldest first.
  // This is an activity-volume spark, not a reconstructed occupancy-over-time series: the legacy import's
  // unit.status_changed payload carries the *Zoho* status strings (e.g. 'RESERVED_PAID'), not the core
  // unit_status enum, so replaying it into a true occupancy percentage needs a status-vocabulary map that
  // doesn't exist yet. Carried over — see docs/sprints/day-3.md.
  spark_14d: z.array(z.number().int()),
});

const ScheduleItem = z.object({
  kind: z.enum(['move-in', 'move-out', 'tour']),
  on_date: z.string(),
  customer_id: z.string().uuid().nullable(),
  site_id: z.string().uuid().nullable(),
  unit_id: z.string().uuid().nullable(),
  subscription_id: z.string().uuid().nullable(),
});

const ActivityRow = z.object({
  id: z.string().uuid(),
  ts: z.string(),
  actor_kind: z.string(),
  action: z.string(),
  target_kind: z.string().nullable(),
  target_id: z.string().uuid().nullable(),
  customer_id: z.string().uuid().nullable(),
  site_id: z.string().uuid().nullable(),
  severity: z.string().nullable(),
  summary: z.string().nullable(),
});

const TenantCockpit = z.object({
  tenant_id: z.string().uuid(),
  slug: z.string(),
  currency: z.string().length(3),
  kpis: Kpis,
  site_health: z.array(SiteHealth),
  schedule_today: z.array(ScheduleItem),
});

export const CockpitResponse = z.object({
  tenants: z.array(TenantCockpit),
  live_feed: z.array(ActivityRow),
  // Both empty in Phase 1: AI proposals are Phase 5, incidents need live device heartbeats (Phase 4).
  proposals: z.array(z.never()),
  incident: z.null(),
});

export const cockpitRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/cockpit',
    { schema: { tags: ['cockpit'], summary: "The ops cockpit: per-tenant-in-scope KPIs, site health, today's schedule, last-hour activity", response: { 200: CockpitResponse } } },
    async (req) => {
      const tenants = await req.scoped(async (c) => {
        // count(*) columns come back through pg as bigint → string (Db's int8 type-parser override);
        // cast to number explicitly below rather than typing them number here and being wrong at runtime.
        const k = await c.query<{
          tenant_id: string; slug: string; currency: string;
          mrr_minor: string; outstanding_minor: string; outstanding_count: string;
          collected_today_minor: string; payments_today: string; payments_failed_today: string;
          moveins_today: string; moveouts_today: string; occupancy_avg_pct: string | null;
          devices_total: string; devices_online: string; devices_degraded: string; devices_offline: string;
          proposals_pending: string;
        }>(
          `select t.id as tenant_id, t.slug, t.currency, k.mrr_minor, k.outstanding_minor, k.outstanding_count,
                  k.collected_today_minor, k.payments_today, k.payments_failed_today, k.moveins_today, k.moveouts_today,
                  k.occupancy_avg_pct, k.devices_total, k.devices_online, k.devices_degraded, k.devices_offline, k.proposals_pending
           from v_cockpit_kpis k join tenants t on t.id = k.tenant_id
           order by t.slug`,
        );

        const sites = await c.query<{ tenant_id: string; site_id: string; name: string; short_code: string; occupancy_pct: string | null; units_total: string; units_occupied: string; mrr_minor: string; currency: string; spark_14d: number[] }>(
          `select o.tenant_id, o.site_id, o.name, o.short_code, o.occupancy_pct, o.units_total, o.units_occupied, o.mrr_minor, t.currency,
                  coalesce(spark.arr, array_fill(0, array[14])) as spark_14d
           from v_site_occupancy o
           join tenants t on t.id = o.tenant_id
           left join lateral (
             select array_agg(cnt order by day) as arr from (
               select gs::date as day, count(al.*)::int as cnt
               from generate_series(current_date - interval '13 days', current_date, interval '1 day') gs
               left join activity_log al on al.site_id = o.site_id and al.action = 'unit.status_changed' and al.ts::date = gs::date
               group by gs
             ) daily
           ) spark on true
           order by o.name`,
        );

        const schedule = await c.query<{ tenant_id: string; kind: string; on_date: string; customer_id: string | null; site_id: string | null; unit_id: string | null; subscription_id: string | null }>(
          `select * from v_schedule where on_date = current_date`,
        );

        const feed = await c.query<{ id: string; ts: string; actor_kind: string; action: string; target_kind: string | null; target_id: string | null; customer_id: string | null; site_id: string | null; severity: string | null; summary: string | null }>(
          `select id, ts, actor_kind, action, target_kind, target_id, customer_id, site_id, severity, summary
           from activity_log where ts >= now() - interval '1 hour' order by ts desc, id desc limit 100`,
        );

        return { k: k.rows, sites: sites.rows, schedule: schedule.rows, feed: feed.rows };
      });

      const tenantRows = tenants.k.map((row) => ({
        tenant_id: row.tenant_id,
        slug: row.slug,
        currency: row.currency,
        kpis: {
          mrr: money(row.mrr_minor, row.currency)!,
          outstanding: money(row.outstanding_minor, row.currency)!,
          outstanding_count: Number(row.outstanding_count),
          collected_today: money(row.collected_today_minor, row.currency)!,
          payments_today: Number(row.payments_today),
          payments_failed_today: Number(row.payments_failed_today),
          moveins_today: Number(row.moveins_today),
          moveouts_today: Number(row.moveouts_today),
          occupancy_avg_pct: row.occupancy_avg_pct == null ? null : Number(row.occupancy_avg_pct),
          devices_total: Number(row.devices_total),
          devices_online: Number(row.devices_online),
          devices_degraded: Number(row.devices_degraded),
          devices_offline: Number(row.devices_offline),
          proposals_pending: Number(row.proposals_pending),
        },
        site_health: tenants.sites
          .filter((s) => s.tenant_id === row.tenant_id)
          .map((s) => ({
            site_id: s.site_id, name: s.name, short_code: s.short_code,
            occupancy_pct: s.occupancy_pct == null ? null : Number(s.occupancy_pct),
            units_total: Number(s.units_total), units_occupied: Number(s.units_occupied),
            mrr: money(s.mrr_minor, s.currency)!,
            spark_14d: s.spark_14d,
          })),
        schedule_today: tenants.schedule
          .filter((s) => s.tenant_id === row.tenant_id)
          .map((s) => ({ kind: s.kind as 'move-in' | 'move-out' | 'tour', on_date: s.on_date, customer_id: s.customer_id, site_id: s.site_id, unit_id: s.unit_id, subscription_id: s.subscription_id })),
      }));

      return {
        tenants: tenantRows,
        live_feed: tenants.feed.map((f) => ({ ...f })),
        proposals: [],
        incident: null,
      };
    },
  );
};
