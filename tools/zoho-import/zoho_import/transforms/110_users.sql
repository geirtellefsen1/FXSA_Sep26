-- Staff users. Zoho owner-lookup columns hold 'zcrm_<id>'; the Users export holds the bare id.
-- requires: zoho_raw.users(email)
-- optional: zoho_raw.users(record_id, id, first_name, last_name, role, role__id, profile, status, user_type, type, time_zone, created_time)
-- optional: zoho_raw.meta_roles(record_id, id, name, role_name)
truncate legacy.zoho_users;
insert into legacy.zoho_users (zoho_id, first_name, last_name, email, role_zoho_id, role_name, profile, status, user_type, timezone, created_at, extra)
select import.zoho_prefix(coalesce(import.nz(u.record_id), import.nz(u.id))),
       import.nz(u.first_name), import.nz(u.last_name), lower(import.nz(u.email)),
       import.zoho_prefix(import.nz(u.role__id)),
       coalesce(import.nz(u.role), (select coalesce(import.nz(r.name), import.nz(r.role_name)) from zoho_raw.meta_roles r
                                    where import.zoho_prefix(coalesce(import.nz(r.record_id), import.nz(r.id))) = import.zoho_prefix(import.nz(u.role__id)) limit 1)),
       import.nz(u.profile), upper(import.nz(u.status)), coalesce(import.nz(u.user_type), import.nz(u.type)), import.nz(u.time_zone),
       import.zoho_ts(u.created_time), to_jsonb(u) - '_src_file'
from zoho_raw.users u
where import.nz(u.email) is not null
on conflict (zoho_id) do update set email = excluded.email, role_name = excluded.role_name, status = excluded.status;
