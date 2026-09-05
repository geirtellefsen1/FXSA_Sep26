"""
Module registry: which backup CSVs exist, which staging table each lands in,
and the stable tenant ids the transforms rely on.

File names are matched case-insensitively against the *basename* with fnmatch.
Chunked exports (Payments_C_001, _002 ...) share one staging table.
Anything not listed is still staged (table name derived from the file name)
and reported as "unmapped" so nothing in the backup is silently dropped.
"""
from __future__ import annotations
import re
from dataclasses import dataclass

# Tenant ids are fixed in db/seed/0001_flexistore_group.sql
TENANTS = {
    "SA": "00000000-0000-4000-8000-00000000005a",
    "NO": "00000000-0000-4000-8000-00000000004e",
    "FI": "00000000-0000-4000-8000-000000000046",
}
ORG_ID = "00000000-0000-4000-8000-000000000001"

# Contacts/rows whose market cannot be derived at all fall back here (audited via market_source='default').
DEFAULT_MARKET = "NO"   # the Zoho org owner is geir@flexistore.no; untagged rows are overwhelmingly Norwegian

@dataclass(frozen=True)
class Module:
    key: str            # staging table name in schema zoho_raw
    patterns: tuple     # fnmatch patterns on basename (case-insensitive)
    tier: int           # 1 = spine, 2 = logs, 3 = pipeline, 0 = metadata, 9 = skipped (staged only)
    note: str = ""

MODULES: list[Module] = [
    Module("meta_fields",        ("Fields_*.csv",),                         0, "Metadata: label → api name"),
    Module("meta_picklists",     ("PickListFieldProperties_*.csv",),        0, "Metadata: picklist values"),
    Module("meta_roles",         ("Roles_*.csv",),                          0, "Metadata: role ids"),
    Module("users",              ("Users_*.csv",),                          1),
    Module("business_partners",  ("Business Partners_C_*.csv","Business Partners_*.csv"), 3),
    Module("property_prospects", ("Property Prospects_C_*.csv","Property Prospects_*.csv"), 3),
    Module("property_status_history", ("Property Status History*.csv",),   3),
    Module("properties_legacy",  ("Properties_C_*.csv",),                   9, "dead SA-era module; merged into prospects by name"),
    Module("facilities",         ("Facilities_*.csv",),                     1),
    Module("gateways",           ("Gateways_C_*.csv","Gateways_*.csv"),     2),
    Module("gateway_country_history", ("Gateway Country History*.csv",),   2),
    Module("units",              ("Bods _ Units_*.csv","Bods*Units*.csv","Products_*.csv"), 1),
    Module("contacts",           ("Contacts_*.csv",),                       1),
    Module("appusers_legacy",    ("AppUsers_C_*.csv",),                     9, "first-gen mirror; used only to backfill"),
    Module("reservations",       ("Reservations_*.csv","Sales Orders_*.csv","SalesOrders_*.csv"), 1),
    Module("ordered_items",      ("Ordered Items_*.csv",),                  1),
    Module("payment_details",    ("Payment Details_C_*.csv","Payment Details_*.csv"), 1),
    Module("payments",           ("Payments_C_*.csv","Payments_*.csv"),     1),
    Module("status_history",     ("Status History_C_*.csv",),               1, "unit status timeline (4 chunks)"),
    Module("status_history_gads",("Status History Gads_C_*.csv",),          1, "reservation status timeline"),
    Module("offer_requests",     ("OfferRequests_C_*.csv","OfferRequests_*.csv"), 2),
    Module("communications",     ("Communications_C_*.csv","Communications_*.csv"), 2),
    Module("event_history",      ("Event History*.csv",),                   9, "stage history of Communications; skipped"),
    Module("emails",             ("Emails_*.csv",),                         2),
    Module("smses",              ("SMSes_C_*.csv","SMSes_*.csv"),           2),
    Module("calls",              ("Calls_*.csv",),                          2),
    Module("notes",              ("Notes_*.csv",),                          2),
    Module("tasks",              ("Tasks_*.csv",),                          3),
    Module("campaigns",          ("Campaigns_*.csv",),                      3),
    Module("campaign_lead_members", ("CampaignLeadMember*.csv","Campaign Lead Member*.csv"), 3),
    Module("leads",              ("Leads_*.csv",),                          3),
    Module("old_contacts",       ("Old Contacts_C_*.csv","Old Contacts_*.csv"), 3, "2022-23 SA web forms → leads"),
    Module("attachments",        ("Attachments_*.csv",),                    3),
    Module("app_events",         ("AppEvents_C_*.csv",),                    2, "2.09M rows, 21 chunks"),
    Module("app_events_x_gateways", ("AppEvents X Gateways*.csv",),         2),
    Module("accounts",           ("Accounts_*.csv",),                       9, "6 junk rows"),
    Module("franchise_agreement_history", ("Franchise Agreement History*.csv",), 9),
    Module("sticky_notes",       ("StickyNotes_*.csv",),                    9),
    Module("facilities_record_access", ("Facilities_RecordAccess*.csv",),   9),
    Module("contact_product_relation", ("Contact Product Relation*.csv",),  9),
    Module("lead_status_history",("Lead Status*.csv",),                     9),
    Module("file_uploads",       ("File_Upload*.csv","Image_Upload*.csv","Final DWG*.csv","Excel Feasibility*.csv","Pdf with measurements*.csv","Images of Property*.csv","Facility Image*.csv","Gateway installation image*.csv","Bod*Images*.csv","Drawings_*.csv"), 3, "file/image upload modules → attachments"),
]

MODULE_BY_KEY = {m.key: m for m in MODULES}

# Order in which transforms run (file prefix numbers in transforms/)
TRANSFORM_ORDER = "numeric-prefix"

_ident = re.compile(r"[^a-z0-9]+")

def sanitize_column(label: str, seen: set[str]) -> str:
    """
    Zoho CSV header label → staging column name.
      'Record Id'                 → record_id
      'Facility.id'               → facility__id      (lookup id columns keep a double underscore)
      'Facility ID'               → facility_id       (so uuid vs zoho-id columns never collide)
      'Bod / Unit Name'           → bod_unit_name
      'Size (m2/m3) - Calculated' → size_m2_m3_calculated
      '0.5 sqm'                   → _0_5_sqm
    Duplicates get _2, _3 ... appended.
    """
    s = label.strip().lstrip("\ufeff")
    is_lookup = s.lower().endswith(".id")
    if is_lookup:
        s = s[:-3]
    s = _ident.sub("_", s.lower()).strip("_")
    if is_lookup:
        s = s + "__id"
    if not s:
        s = "col"
    if s[0].isdigit():
        s = "_" + s
    s = s[:60]
    base, n = s, 2
    while s in seen:
        s = f"{base}_{n}"
        n += 1
    seen.add(s)
    return s

def sanitize_table(name: str) -> str:
    s = _ident.sub("_", name.lower()).strip("_")
    s = re.sub(r"_\d{3}$", "", s)          # drop chunk suffix
    return s[:60] or "unmapped"
