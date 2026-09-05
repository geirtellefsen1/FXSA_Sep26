-- Zoho metadata: field label → api name, picklist values. Low value, kept for traceability.
-- optional: zoho_raw.meta_fields(module, label, api_name, data_type, module_name, field_label, display_label)
-- optional: zoho_raw.meta_picklists(module, field_label, value, sequence_number, actual_value, display_value, module_name)
truncate legacy.zoho_fields, legacy.zoho_picklists;
insert into legacy.zoho_fields (module, label, api_name, data_type, extra)
select coalesce(import.nz(module), import.nz(module_name), '?'),
       coalesce(import.nz(label), import.nz(field_label), import.nz(display_label), '?'),
       import.nz(api_name), import.nz(data_type), to_jsonb(r) - '_src_file'
from zoho_raw.meta_fields r
on conflict do nothing;
insert into legacy.zoho_picklists (module, field_label, value, seq)
select coalesce(import.nz(module), import.nz(module_name), '?'),
       coalesce(import.nz(field_label), '?'),
       coalesce(import.nz(actual_value), import.nz(display_value), import.nz(value)),
       import.zoho_int(sequence_number)
from zoho_raw.meta_picklists r
where coalesce(import.nz(actual_value), import.nz(display_value), import.nz(value)) is not null
on conflict do nothing;
