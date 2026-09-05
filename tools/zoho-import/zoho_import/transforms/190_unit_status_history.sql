-- Unit status timeline. Zoho gives durations only; entered_at is reconstructed by walking each unit's chain
-- backwards from the unit's Modified Time (the latest transition), flagged reconstructed=true.
-- requires: zoho_raw.status_history(record_id, bod_unit_name__id)
-- optional: zoho_raw.status_history(status, moved_to, duration_days, duration, created_time, modified_time)
truncate legacy.unit_status_history;
insert into legacy.unit_status_history (zoho_id, tenant_id, unit_zoho_id, from_status, to_status, duration_days, duration_text, seq)
select import.zoho_prefix(h.record_id), u.tenant_id, u.zoho_id, import.nz(h.status), import.nz(h.moved_to), import.zoho_int(h.duration_days), import.nz(h.duration),
       row_number() over (partition by u.zoho_id order by import.zoho_ts(coalesce(h.modified_time, h.created_time)) nulls first, h.record_id)
from zoho_raw.status_history h
join legacy.units u on u.zoho_id = import.zoho_prefix(h.bod_unit_name__id)
where import.nz(h.record_id) is not null;

with chain as (
  select h.zoho_id, h.unit_zoho_id, h.seq, h.duration_days,
         sum(coalesce(h.duration_days, 0)) over (partition by h.unit_zoho_id order by h.seq desc rows between unbounded preceding and current row) as days_back_incl,
         u.updated_at
  from legacy.unit_status_history h join legacy.units u on u.zoho_id = h.unit_zoho_id
)
update legacy.unit_status_history h
set entered_at = c.updated_at - make_interval(days => c.days_back_incl::int), reconstructed = true
from chain c
where c.zoho_id = h.zoho_id and c.updated_at is not null;
