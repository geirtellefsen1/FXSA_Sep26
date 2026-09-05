"""
Generate a small synthetic Zoho backup that exercises every transform.
Headers are the Zoho CSV *labels* the transforms were written against (see the
`-- requires/optional` blocks); the values are invented but shaped like the
real ones described in docs/source/ZOHO_BACKUP_CRM_IMPORT_SPEC_2.md.

    python tests/make_fixture.py tests/fixture
"""
from __future__ import annotations
import csv, sys, uuid
from pathlib import Path

def zid(n): return f"zcrm_53611600000{n:08d}"
def U(seed): return str(uuid.uuid5(uuid.NAMESPACE_URL, f"fx-fixture-{seed}"))

def write(root: Path, name: str, header: list[str], rows: list[list]):
    p = root / name
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow(r)

def main(out: str):
    root = Path(out)
    # --- users ---------------------------------------------------------------
    write(root, "Users_001.csv", ["id", "First Name", "Last Name", "Email", "Role", "Profile", "Status", "User Type", "Time Zone", "Created Time"], [
        ["5361160000000663001", "Geir", "Tellefsen", "geir@flexistore.no", "Super Administrator", "Administrator", "ACTIVE", "Regular", "Africa/Johannesburg", "2023-02-10 09:00:00"],
        ["5361160000000373001", "Johan", "van Deventer", "johanv@flexistore.no", "Manager Norway", "Administrator", "ACTIVE", "Regular", "Europe/Oslo", "2023-02-10 09:00:00"],
        ["5361160000000659001", "Adam", "Kane-Smith", "adam@flexistore.co.za", "Manager South Africa", "Administrator", "ACTIVE", "Regular", "Africa/Johannesburg", "2023-02-10 09:00:00"],
        ["5361160000199826001", "Support", "SA", "support@flexistore.co.za", "Support Agent Norway South Africa", "Support", "ACTIVE", "Regular", "Africa/Johannesburg", "2024-01-05 09:00:00"],
    ])
    # --- partners / prospects ---------------------------------------------------
    write(root, "Business Partners_C_001.csv", ["Record Id", "Name", "Type", "Organisation", "Phone", "Email", "Created Time", "Modified Time"], [
        [zid(9001), "Hyprop Investments", "Property Owner", "South Africa", "+27 11 000 0000", "leasing@hyprop.co.za", "2023-05-01 10:00:00", "2025-01-01 10:00:00"],
        [zid(9002), "Selvaag Eiendom", "Property Owner", "Norway", "Norway", "", "2023-05-01 10:00:00", "2025-01-01 10:00:00"],
    ])
    write(root, "Property Prospects_C_001.csv", ["Record Id", "Name", "Status", "Property Address", "Country", "Building Type", "Gross", "Net", "Agreement Type", "FX Revenue Share", "Business partner.id", "Contact Name.id", "Project code", "0.5 sqm", "1.0 sqm", "5.0 sqm", "Created Time", "Modified Time"], [
        [zid(9101), "Rosebank Mall", "Agreement signed", "Cradock Ave, Rosebank", "South Africa", "Mall", "1200", "900", "Revenue Share", "30", zid(9001), "", "RBM01", "10", "20", "5", "2023-03-01 10:00:00", "2025-01-01 10:00:00"],
        [zid(9102), "Sandvika Storsenter", "In-Progress", "Sandvika", "Norway", "Mall", "800", "600", "Revenue Share", "35", zid(9002), "", "SAN01", "", "12", "3", "2024-03-01 10:00:00", "2025-01-01 10:00:00"],
    ])
    write(root, "Property Status History_001.csv", ["Record Id", "Subject.id", "Status", "Moved To", "Duration (Days)", "Created Time", "Modified Time"], [
        [zid(9201), zid(9101), "LOI signed", "Agreement signed", "40", "2023-06-01 10:00:00", "2023-06-01 10:00:00"],
    ])
    # --- facilities -------------------------------------------------------------
    F_SA, F_NO = U("fac-sa"), U("fac-no")
    write(root, "Facilities_001.csv", ["Record Id", "Facility Name", "FacilityID", "Country", "Department Code", "Active", "Street", "City", "Postal Code", "Region", "Location Latitude", "Location Longitude", "Currency Code", "Total number of Lettable Units", "Nett Lettable Area m2", "Gross Floor Area m2", "Agreement Type", "Commission Date", "Property Prospect.id", "Lift Type", "Camera System", "Guest WiFi password", "RESERVED_PAID", "AVAILABLE", "Current Occupancy (Percentage)", "Organisation", "Created Time", "Modified Time"], [
        [zid(1001), "Rosebank Mall", F_SA, "South Africa", "RBM01", "true", "Cradock Ave", "Johannesburg", "2196", "Gauteng", "-26.1466", "28.0416", "ZAR", "3", "900", "1200", "Revenue Share", "2023-06-15", zid(9101), "Goods lift", "Hikvision", "secret", "2", "1", "66.7", "FX-SA", "2023-02-15 10:00:00", "2026-09-01 08:00:00"],
        [zid(1002), "Sandvika", F_NO, "Norway", "SAN01", "true", "Brodtkorbs gate 7", "Sandvika", "1338", "Viken", "59.8896", "10.5256", "NOK", "2", "600", "800", "Revenue Share", "2024-05-01", zid(9102), "", "Axis", "secret", "1", "1", "50", "Flexistore", "2024-04-01 10:00:00", "2026-09-01 08:00:00"],
    ])
    # --- gateways ---------------------------------------------------------------
    write(root, "Gateways_C_001.csv", ["Record Id", "Name", "Facility.id", "Serial", "MAC Ethernet", "IP Address", "Software Version", "Hardware Version", "Connected Controllers", "Expected Boards", "Main Entrance Lock", "Connectivity Status", "Controller Error", "Power source", "Add State", "Last Report", "Orginisation", "Created Time", "Modified Time"], [
        [zid(2001), "rpi_prod_lock_23", zid(1001), "1000000012ab", "b8:27:eb:00:00:01", "10.92.18.1", "5.1.0", "V3", "[0,1]", "[0,1]", "true", "ONLINE", "FALSE", "POE", "Production", "2026-09-01 07:55:00", "FX-SA", "2023-06-01 10:00:00", "2026-09-01 08:00:00"],
        [zid(2002), "rpi_prod_lock_88", zid(1002), "1000000099cd", "b8:27:eb:00:00:02", "10.120.1.1", "5.0.2", "V2", "[0]", "[0]", "false", "WEAK", "TRUE", "Adapter", "Production", "2026-09-01 07:50:00", "FX-NO", "2024-05-01 10:00:00", "2026-09-01 08:00:00"],
        [zid(2003), "rpi_prod_lock_150", "", "1000000077ee", "b8:27:eb:00:00:03", "", "5.1.0", "V3", "", "", "false", "OFFLINE", "FALSE", "", "Stock South Africa", "", "FX-SA", "2025-05-01 10:00:00", "2026-09-01 08:00:00"],
    ])
    # --- units ------------------------------------------------------------------
    U1, U2, U3, U4, U5 = U("u1"), U("u2"), U("u3"), U("u4"), U("u5")
    R1, R2, R3, R4 = U("r1"), U("r2"), U("r3"), U("r4")
    write(root, "Bods _ Units_001.csv", ["Record Id", "Bod / Unit Name", "easyId", "storageUnitId", "Facility.id", "Status", "additionalStatusDetails", "reservationId", "Size", "Level", "Width (m)", "Height (m)", "Depth (m)", "Size (m2/m3) - Calculated", "Lock Type", "lockId", "sensorId", "Gateway.id", "Board Address", "Port Address", "Mezzanine", "Floor", "Column", "Permanent NOTE", "NOTE", "Bod / Unit Active", "Created Time", "Modified Time"], [
        [zid(3001), "D-08", "FX-SA-0001-0008", U1, zid(1001), "RESERVED_PAID", "", R1, "5 m²", "3", "2", "2.5", "2.5", "5", "Flexilock", "flexilock-cnBpX3Byb2RfbG9ja18yMy8wLzg=", "flexilock-AA:BB", zid(2001), "0", "8", "false", "1", "false", "", "", "true", "2023-06-01 10:00:00", "2026-08-30 12:00:00"],
        [zid(3002), "D-09", "FX-SA-0001-0009", U2, zid(1001), "RESERVED_PAYMENT_PROBLEM", "card declined", R2, "5 m²", "3", "2", "2.5", "2.5", "5", "Flexilock", "flexilock-cnBpX3Byb2RfbG9ja18yMy8wLzk=", "", zid(2001), "0", "9", "false", "1", "false", "", "", "true", "2023-06-01 10:00:00", "2026-08-31 12:00:00"],
        [zid(3003), "E-01", "FX-SA-0001-0010", U3, zid(1001), "AVAILABLE", "", "", "10 m²", "5", "", "", "", "", "Flexilock", "flexilock-cnBpX3Byb2RfbG9ja18yMy8xLzE=", "", zid(2001), "1", "1", "false", "1", "true", "Service unit until 2024", "", "true", "2023-06-01 10:00:00", "2026-07-01 12:00:00"],
        [zid(3004), "Bod 1", "FX-NO-0042-0001", U4, zid(1002), "CHECKED_OUT", "", "", "5 kubikk", "2", "", "", "", "5", "Flexilock", "flexilock-cnBpX3Byb2RfbG9ja184OC8wLzE=", "", zid(2002), "0", "1", "false", "", "false", "", "", "true", "2024-05-01 10:00:00", "2026-08-01 12:00:00"],
        [zid(3005), "Bod 2", "FX-NO-0042-0002", U5, zid(1002), "NOT_AVAILABLE", "decommissioned", "", "5 kubikk", "2", "", "", "", "5", "Padlock", "", "", "", "", "", "false", "", "false", "", "", "false", "2024-05-01 10:00:00", "2025-01-01 12:00:00"],
    ])
    # --- contacts ---------------------------------------------------------------
    C1, C2, C3 = U("c1"), U("c2"), U("c3")
    write(root, "Contacts_001.csv", ["Record Id", "First Name", "Last Name", "Email", "Phone", "Mobile", "Date of Birth", "Mailing Street", "Mailing City", "Mailing Zip", "Mailing Country", "Signup Country", "Preferred Language", "App User", "AppUser UUID", "enabled", "emailAddressVerified", "phoneNumberVerified", "TCs Accepted", "Credit Check Status", "Verified With", "Signup Type", "userCreateDate", "Financial Tool", "Financial Tool URL", "Email Opt Out", "Business Partner Contact", "Client Note", "Organisation", "Contact Owner.id", "First Visit", "Visitor Score", "Created Time", "Modified Time"], [
        [zid(4001), "Tinus", "Greyling", "tinus.g@example.com", "", "0825551142", "1985-03-02", "1 Oxford Rd", "Johannesburg", "2196", "South Africa", "South Africa", "ENGLISH", "true", C1, "true", "true", "true", "true", "APPROVED", "SUMSUB", "email", "2023-07-01 08:00:00", "Xero", "https://go.xero.com/contact/1", "false", "false", "VIP customer", "FX-SA", zid(659001), "", "", "2023-07-01 10:00:00", "2026-08-01 10:00:00"],
        [zid(4002), "Megan", "Roberts", "m.roberts@example.com", "", "0738800214", "", "", "", "", "", "South Africa", "ENGLISH", "true", C2, "true", "true", "false", "true", "IDENTITY_NOT_VERIFIED", "", "phone", "2024-02-01 08:00:00", "", "", "false", "false", "", "Flexistore", zid(659001), "", "", "2024-02-01 10:00:00", "2026-08-01 10:00:00"],
        [zid(4003), "Ola", "Nordmann", "ola@example.no", "91142723", "", "", "Storgata 1", "Oslo", "0155", "Norge", "norge", "NORWEGIAN", "true", C3, "true", "true", "true", "true", "APPROVED", "VIPPS, BANKID", "vipps", "2024-05-02 08:00:00", "PowerOffice", "https://go.poweroffice.net/1", "true", "false", "", "Flexistore", zid(373001), "", "", "2024-05-02 10:00:00", "2026-08-01 10:00:00"],
        [zid(4004), "", "Visitor 8842", "", "", "", "", "", "", "", "", "", "", "false", "", "", "", "", "", "", "", "", "", "", "", "false", "false", "", "Flexistore", zid(659001), "2025-03-03 12:00:00", "12", "2025-03-03 12:00:00", "2025-03-03 12:00:00"],
        [zid(4005), "Piet", "Landlord", "piet@hyprop.co.za", "0110000000", "", "", "", "", "", "South Africa", "", "ENGLISH", "false", "", "", "", "", "", "", "", "", "", "", "", "false", "true", "", "FX-SA", zid(659001), "", "", "2023-05-01 10:00:00", "2023-05-01 10:00:00"],
    ])
    # --- reservations -------------------------------------------------------------
    DELETED_USER = U("deleted-user")
    write(root, "Reservations_001.csv", ["Record Id", "Subject", "Order Number", "Reservation Order Number", "Reservationid", "User ID", "Contact AppUser.id", "Email", "Facility ID", "Facility.id", "Storage Unit", "Storage Unit Name", "Unit Size", "Status", "Payment Status", "Subscription Type", "Order Currency Code", "Price", "Discounted Price", "Original Price", "Discount Code", "Occupancy Modifier", "Seasonal Modifier", "Outstanding Amount", "RemainingPeriods", "Order Start Date", "Order End Date", "LastOccupationDate", "Backend Created Time", "Booking Platform", "Credit Card", "Credit Card Expiry", "First Unlock", "First Unlock Date", "WelcomeCommSent", "WelcomeCommSentDate", "CancelCommSent", "CancelCommSentDate", "Description", "Organisation", "Created Time", "Modified Time"], [
        [zid(5001), R1, "00000009", "rcmkNXFhkY", R1, C1, zid(4001), "tinus.g@example.com", F_SA, zid(1001), U1, "D-08", "5 m²", "Activated", "PAID", "MONTHLY", "ZAR", "1100.0", "1045.0", "1100.0", "WELCOME", "1.05", "1.0", "0.0", "", "2024-01-14", "", "", "2024-01-13 15:22:10", "Wordpress", "XXXX-XXXX-XXXX-4242", "12/27", "true", "2024-01-15 09:10:00", "true", "2024-01-14 08:00:00", "false", "", "Monthly Reservation from 20240114", "FX-SA", "2024-01-14 08:00:00", "2026-08-30 12:00:00"],
        [zid(5002), R2, "00000010", "aZk92LmQwe", R2, C2, zid(4002), "m.roberts@example.com", F_SA, zid(1001), U2, "D-09", "5 m²", "Activated", "PROBLEM", "MONTHLY", "ZAR", "1100.0", "1100.0", "1100.0", "", "1.0", "1.0", "2200.0", "", "2025-06-03", "", "", "2025-06-02 11:00:00", "AppV2_2.5.3", "XXXX-XXXX-XXXX-1111", "01/26", "true", "2025-06-04 10:00:00", "true", "2025-06-03 08:00:00", "false", "", "", "FX-SA", "2025-06-03 08:00:00", "2026-08-31 12:00:00"],
        [zid(5003), R3, "00000011", "ppQ81ZzXcv", R3, C3, zid(4003), "ola@example.no", F_NO, zid(1002), U4, "Bod 1", "5 kubikk", "Deleted", "CHECKED_OUT", "MONTHLY", "NOK", "1290.0", "645.0", "1290.0", "1M50", "1.0", "1.0", "0.0", "", "2024-06-01", "2026-07-31", "2026-07-28", "2024-05-31 20:00:00", "Flexibot", "", "", "true", "2024-06-01 12:00:00", "true", "2024-06-01 08:00:00", "true", "2026-07-01 08:00:00", "", "Flexistore", "2024-06-01 08:00:00", "2026-08-01 12:00:00"],
        [zid(5004), R4, "00000012", "qqW12EeRty", R4, DELETED_USER, "", "gone@example.com", F_SA, zid(1001), U3, "E-01", "10 m²", "Draft", "UNPAID", "MONTHLY", "ZAR", "2100.0", "2100.0", "2100.0", "", "1.0", "1.0", "0.0", "", "2026-08-20", "", "", "2026-08-20 14:00:00", "Wordpress", "", "", "false", "", "false", "", "false", "", "", "FX-SA", "2026-08-20 14:00:00", "2026-08-20 14:00:00"],
    ])
    write(root, "Ordered Items_001.csv", ["Record Id", "Parent.id", "Product Name.id", "Quantity", "List Price"], [
        [zid(5101), zid(5001), zid(3001), "1", "1100.0"], [zid(5102), zid(5002), zid(3002), "1", "1100.0"], [zid(5103), zid(5003), zid(3004), "1", "1290.0"], [zid(5104), zid(5004), zid(3003), "1", "2100.0"],
    ])
    write(root, "Payment Details_C_001.csv", ["Record Id", "Reservation.id", "OrderId", "OrderId Sequence", "Payment Type", "Subscriptionid", "Reference", "Credit Cards", "Credit Card Expiry", "Subscription Type", "Status", "Outstanding Amount", "Lastpaymentdatetime", "Lastpaymenttransactionid", "Receipt URL", "Created Time", "Modified Time"], [
        [zid(6001), zid(5001), "rcmkNXFhkY", "0", "Paystack", "AUTH_abc123", "", "XXXX-XXXX-XXXX-4242", "12/27", "MONTHLY", "PAID", "0.0", "2026-08-14 06:00:00", "T123", "https://paystack.com/r/1", "2024-01-14 08:00:00", "2026-08-14 06:00:00"],
        [zid(6002), zid(5002), "aZk92LmQwe", "0", "Paystack", "AUTH_def456", "", "XXXX-XXXX-XXXX-1111", "01/26", "MONTHLY", "PROBLEM", "2200.0", "2026-06-03 06:00:00", "T124", "", "2025-06-03 08:00:00", "2026-08-03 06:00:00"],
        [zid(6003), zid(5003), "ppQ81ZzXcv", "0", "Stripe", "pm_1Nabc", "ch_1Nabc", "XXXX-XXXX-XXXX-9999", "09/28", "MONTHLY", "CHECKED_OUT", "0.0", "2026-07-01 06:00:00", "pi_1Nzzz", "", "2024-06-01 08:00:00", "2026-08-01 12:00:00"],
    ])
    write(root, "Payments_C_001.csv", ["Record Id", "Payment Name", "Reservation.id", "Payment Details.id", "ContactAppUser.id", "Payment Provider", "Paymentid", "Paymenttype Id", "Payment URL", "Status", "Paymenttype Displayname", "Credit Card", "Currency Code", "Total Authorized", "Total Captured", "Total Declined", "Total Refunded", "Available Capture", "Refund amount", "Reason For Refund", "Merchantnumber", "Test", "Transaction DateTime", "Created Time", "Modified Time"], [
        [zid(7001), "rcmkNXFhkY20260814", zid(5001), zid(6001), zid(4001), "Paystack", "PS_ref_1", "", "", "approved", "visa", "XXXX-XXXX-XXXX-4242", "ZAR", "1045.0", "1045.0", "0.0", "0.0", "0.0", "", "", "FXSA", "false", "2026-08-14 06:00:00", "2026-08-14 06:00:05", "2026-08-14 06:00:05"],
        [zid(7002), "aZk92LmQwe20260803", zid(5002), zid(6002), zid(4002), "Paystack", "PS_ref_2", "", "", "declined", "visa", "XXXX-XXXX-XXXX-1111", "ZAR", "1100.0", "0.0", "1100.0", "0.0", "0.0", "", "", "FXSA", "false", "2026-08-03 06:00:00", "2026-08-03 06:00:05", "2026-08-03 06:00:05"],
        [zid(7003), "aZk92LmQwe20260810", zid(5002), zid(6002), zid(4002), "Paystack", "PS_ref_3", "", "", "declined", "visa", "XXXX-XXXX-XXXX-1111", "ZAR", "1100.0", "0.0", "1100.0", "0.0", "0.0", "", "", "FXSA", "false", "2026-08-10 06:00:00", "2026-08-10 06:00:05", "2026-08-10 06:00:05"],
        [zid(7004), "ppQ81ZzXcv20260701_pi_1Nzzz", zid(5003), zid(6003), zid(4003), "Stripe", "pi_1Nzzz", "ch_1Nzzz", "https://dashboard.stripe.com/payments/pi_1Nzzz", "succeeded", "card", "XXXX-XXXX-XXXX-9999", "NOK", "645.0", "645.0", "0.0", "0.0", "0.0", "", "", "FXNO", "false", "2026-07-01 06:00:00", "2026-07-01 06:00:05", "2026-07-01 06:00:05"],
        [zid(7005), "TEST", zid(5001), zid(6001), zid(4001), "Stripe", "pi_test", "", "", "succeeded", "card", "", "ZAR", "1.0", "1.0", "0.0", "0.0", "0.0", "", "", "FXSA", "true", "2024-01-01 06:00:00", "2024-01-01 06:00:05", "2024-01-01 06:00:05"],
    ])
    write(root, "Status History_C_001.csv", ["Record Id", "Bod / Unit Name.id", "Status", "Moved To", "Duration (Days)", "Duration", "Created Time", "Modified Time"], [
        [zid(8001), zid(3001), "AVAILABLE", "RESERVED_PENDING", "200", "200 days", "2023-06-01 10:00:00", "2024-01-13 15:00:00"],
        [zid(8002), zid(3001), "RESERVED_PENDING", "RESERVED_PAID", "1", "1 day", "2024-01-13 15:00:00", "2024-01-14 08:00:00"],
        [zid(8003), zid(3004), "RESERVED_PAID", "CHECKED_OUT", "788", "788 days", "2024-06-01 08:00:00", "2026-07-28 12:00:00"],
    ])
    write(root, "Status History Gads_C_001.csv", ["Record Id", "Subject.id", "Status", "Moved To", "Payment Status", "Facility ID", "Email", "Duration (Days)", "Created Time", "Modified Time"], [
        [zid(8101), zid(5002), "Activated", "Activated", "PROBLEM", F_SA, "m.roberts@example.com", "30", "2026-08-03 06:00:00", "2026-08-03 06:00:00"],
    ])
    # --- logs ---------------------------------------------------------------------
    write(root, "Communications_C_001.csv", ["Record Id", "Event", "Reservation.id", "Contact.id", "Facility.id", "Email Sent", "SMS Sent", "Payment attempt number", "Customer Rating", "Customer Feedback", "Contacted for Feedback", "Occupation of facility", "Preferred Language", "Created Time", "Modified Time"], [
        [zid(10001), "New Paid Reservation", zid(5001), zid(4001), zid(1001), "true", "true", "", "5", "Great", "true", "66.7", "ENGLISH", "2024-01-14 08:01:00", "2024-01-14 08:01:00"],
        [zid(10002), "Payment Failure", zid(5002), zid(4002), zid(1001), "true", "false", "2", "", "", "false", "66.7", "ENGLISH", "2026-08-10 06:01:00", "2026-08-10 06:01:00"],
    ])
    write(root, "Emails_001.csv", ["Record Id", "Record Name.id", "Module", "Subject", "To", "Sender", "Template Name.id", "Status", "No. of Opens", "First Opened", "Last Opened", "Sent Time", "Attachment Name", "Created Time"], [
        [zid(11001), zid(10001), "CustomModule8", "Welcome to Flexistore Rosebank", "tinus.g@example.com", "info@flexistore.co.za", zid(999), "Opened", "3", "2024-01-14 09:00:00", "2024-01-20 09:00:00", "2024-01-14 08:01:10", '{"unsubscribe":0}', "2024-01-14 08:01:10"],
        [zid(11002), zid(4002), "Contacts", "Your card was declined", "m.roberts@example.com", "info@flexistore.co.za", zid(998), "Sent", "0", "", "", "2026-08-10 06:01:20", "", "2026-08-10 06:01:20"],
    ])
    write(root, "SMSes_C_001.csv", ["Record Id", "SMS Name", "Body", "Reply", "Info", "Source", "ObjectID", "Submitted", "Created Time"], [
        [zid(12001), "Sent", "Your Flexistore payment failed. Reply HELP.", "", "", "workflow", "53611600000" + f"{4002:08d}", "2026-08-10 04:02:00", "2026-08-10 06:02:00"],
        [zid(12002), "Reply", "", "Paying tonight, sorry", "", "inbound", "53611600000" + f"{4002:08d}", "2026-08-10 05:30:00", "2026-08-10 07:30:00"],
    ])
    write(root, "Calls_001.csv", ["Record Id", "Call Type", "Contact Name.id", "Subject", "Call Start Time", "Call Duration (in seconds)", "Caller ID", "Dialled Number", "Voice Recording", "Call Owner.id", "Description", "Created Time"], [
        [zid(13001), "Inbound", zid(4001), "Access question", "2026-05-05 14:00:00", "120", "+27825551142", "+27214900922", "https://voice.zoho.com/rec/1", zid(199826001), "Asked about hours", "2026-05-05 14:00:00"],
        [zid(13002), "Missed", "", "Missed call", "2026-05-06 09:00:00", "0", "+27700000000", "+27214900922", "", zid(199826001), "", "2026-05-06 09:00:00"],
    ])
    write(root, "Notes_001.csv", ["Record Id", "Parent.id", "Parent Module", "Note Title", "Note Content", "Note Owner.id", "Created Time", "Modified Time"], [
        [zid(14001), zid(4001), "Contacts", "Zoho SalesIQ chat - 2023-07-01", "Visitor: do you have 5m2? Agent: yes at Rosebank.", zid(659001), "2023-07-01 09:50:00", "2023-07-01 09:50:00"],
        [zid(14002), zid(4002), "Contacts", "Call note", "Promised to update card by Friday.", zid(199826001), "2026-08-11 10:00:00", "2026-08-11 10:00:00"],
    ])
    write(root, "Tasks_001.csv", ["Record Id", "Subject", "Status", "Priority", "Due Date", "Related To.id", "Related To Module", "Task Owner.id", "Description", "Closed Time", "Created Time", "Modified Time"], [
        [zid(15001), "Follow up : Missed chat", "Not Started", "Normal", "2025-03-04", zid(4004), "Contacts", zid(659001), "", "", "2025-03-03 12:05:00", "2025-03-03 12:05:00"],
        [zid(15002), "Send LOI", "Completed", "High", "2023-05-20", zid(9101), "Property Prospects", zid(663001), "", "2023-05-19 10:00:00", "2023-05-10 12:00:00", "2023-05-19 10:00:00"],
    ])
    write(root, "OfferRequests_C_001.csv", ["Record Id", "Reservationid.id", "Offer Type", "Option Title", "Supplier", "Amount Insured", "Insurance Price", "Currency", "Payment Period", "Created Time", "Modified Time"], [
        [zid(16001), zid(5003), "INSURANCE", "Default Insurer 40k", "Default Insurer", "40000", "89", "NOK", "MONTHLY", "2024-06-01 08:00:00", "2024-06-01 08:00:00"],
    ])
    write(root, "Attachments_001.csv", ["Record Id", "Parent.id", "Parent Module", "File Name", "Size", "Created Time"], [
        [zid(17001), zid(1001), "Facilities", "Rosebank layout.pdf", "98278", "2023-06-01 10:00:00"],
        [zid(17002), zid(9101), "Property Prospects", "Feasibility.xlsx", "20000", "2023-04-01 10:00:00"],
    ])
    # --- leads / campaigns ------------------------------------------------------------
    write(root, "Leads_001.csv", ["Record Id", "Lead Source", "Lead Status", "First Name", "Last Name", "Company", "Email", "Phone", "Mobile", "City", "State", "Country", "Description", "Is Converted", "Lead Owner.id", "GCLID", "ZCAMPAIGNID", "Keyword", "Ad Campaign Name", "Cost per Click", "Conversion Export Status", "Referrer", "Created Time", "Modified Time"], [
        [zid(18001), "Chat", "", "Thandi", "Mokoena", "", "thandi.m@example.com", "", "0719042207", "Sandton", "Gauteng", "South Africa", "Looking for 5m2", "false", zid(659001), "Cj0KCQ", "123", "storage units sandton", "Sales-Search-JHB-1", "12.5", "Success", "https://flexistore.co.za", "2026-08-28 10:00:00", "2026-08-28 10:00:00"],
        [zid(18002), "WebSite Visit", "", "Kari", "Hansen", "", "kari@example.no", "", "", "Bergen", "", "Norway", "", "false", zid(373001), "", "", "", "", "", "", "", "2025-01-10 10:00:00", "2025-01-10 10:00:00"],
        [zid(18003), "Chat", "", "Tinus", "Greyling", "", "tinus.g@example.com", "", "", "", "", "South Africa", "returning", "false", zid(659001), "", "", "", "", "", "", "", "2026-08-30 10:00:00", "2026-08-30 10:00:00"],
    ])
    write(root, "Old Contacts_C_001.csv", ["Record Id", "Name", "Email", "Phone", "City", "Form Type", "Message", "Created Time", "Modified Time"], [
        [zid(18101), "Sipho Dlamini", "sdlamini@example.co.za", "0836611100", "Cape Town", "Request a Call", "Need 3 units for archive", "2022-11-01 10:00:00", "2022-11-01 10:00:00"],
    ])
    write(root, "Campaigns_001.csv", ["Record Id", "Campaign Name", "Type", "Status", "Start Date", "End Date", "Budgeted Cost", "Actual Cost", "Created Time"], [
        [zid(19001), "Sales-Search-JHB-1", "Google Ads", "Active", "2026-01-01", "", "50000", "31200", "2026-01-01 10:00:00"],
    ])
    write(root, "CampaignLeadMember_001.csv", ["Record Id", "Campaign.id", "Lead.id", "Member Status", "Created Time"], [
        [zid(19101), zid(19001), zid(18001), "Clicked", "2026-08-28 10:00:00"],
    ])
    # --- app events (two chunks to exercise concatenation) --------------------------
    ev_header = ["Record Id", "appeventId", "EventType", "success", "Heading", "Description", "Details", "dateCreated", "userId", "reservationId", "storageUnitId", "lockId", "facilityId", "Contact AppUser.id", "Reservation.id", "Storage Unit.id", "Payment Amount", "Payment Currency", "Payment Attempt Number", "Storage Unit EasyID", "First Unlock", "Share Recipient Email", "Share Start", "Share End", "Created Time"]
    write(root, "AppEvents_C_001.csv", ev_header, [
        [zid(20001), U("e1"), "UNLOCK", "Succeeded", "Unlock D-08", "Customer unlocked", '{"created":"2024-01-15T07:10:00.000","method":"app"}', "2024-01-15 09:10:00", C1, R1, U1, "flexilock-cnBpX3Byb2RfbG9ja18yMy8wLzg=", F_SA, zid(4001), zid(5001), zid(3001), "", "", "", "FX-SA-0001-0008", "true", "", "", "", "2024-01-15 09:10:05"],
        [zid(20002), U("e2"), "RECURRING_PAYMENT", "Failed", "Recurring payment failed", "Card declined", '"attempt":"2"\n"reason":"insufficient_funds"', "2026-08-10 06:00:00", C2, R2, U2, "", F_SA, zid(4002), zid(5002), zid(3002), "1100.0", "ZAR", "2", "FX-SA-0001-0009", "", "", "", "", "2026-08-10 06:00:05"],
        [zid(20003), U("e3"), "SYSTEM_NOTIFY", "Succeeded", "Price for unit type 5 kubikk changed to 1354.50 NOK, occupancy 84.21%→89.47%, multiplier 1.05", "", "pricing engine run", "2026-03-01 02:00:00", "", "", "", "", F_NO, "", "", "", "", "", "", "", "", "", "", "", "2026-03-01 02:00:05"],
    ])
    write(root, "AppEvents_C_002.csv", ev_header, [
        [zid(20004), U("e4"), "FACILITY_NOT_REPORTING", "Failed", "Sandvika not reporting", "", "gateway rpi_prod_lock_88 offline 45 min", "2026-08-15 03:00:00", "", "", "", "", F_NO, "", "", "", "", "", "", "", "", "", "", "", "2026-08-15 03:00:05"],
        [zid(20005), U("e5"), "SHARE_INVITE", "Succeeded", "Share invite", "", "", "2024-02-01 10:00:00", C1, R1, U1, "", F_SA, zid(4001), zid(5001), zid(3001), "", "", "", "FX-SA-0001-0008", "", "friend@example.com", "2024-02-01T08:00:00", "2024-03-01T08:00:00", "2024-02-01 10:00:05"],
        [zid(20006), U("e6"), "CHECKOUT", "Succeeded", "Checkout Bod 1", "", "", "2026-07-28 12:00:00", C3, R3, U4, "", F_NO, zid(4003), zid(5003), zid(3004), "", "", "", "FX-NO-0042-0001", "", "", "", "", "2026-07-28 12:00:05"],
    ])
    write(root, "AppEvents X Gateways_001.csv", ["Record Id", "App Event.id", "Affected Gateways.id", "Number of locks", "Created Time"], [
        [zid(21001), zid(20004), zid(2002), "2", "2026-08-15 03:00:05"],
    ])
    # --- metadata ----------------------------------------------------------------------
    write(root, "Metadata/Fields_001.csv", ["Module", "Label", "Api Name", "Data Type"], [
        ["Facilities", "Access Height Limit (m)", "Height_restrictions_for_car_access", "text"],
        ["Reservations", "First Unlock", "First_Visit", "boolean"],
        ["Property Prospects", "Country", "Market", "picklist"],
    ])
    write(root, "Metadata/PickListFieldProperties_001.csv", ["Module", "Field Label", "Actual Value", "Display Value", "Sequence Number"], [
        ["Reservations", "Payment Status", "PAID", "PAID", "1"], ["Reservations", "Payment Status", "PROBLEM", "PROBLEM", "2"],
    ])
    write(root, "Metadata/Roles_001.csv", ["id", "Name"], [["5361160000000026005", "Manager South Africa"]])
    # --- something unmapped, to prove it is staged and reported ------------------------
    write(root, "StickyNotes_001.csv", ["Record Id", "Note", "Created Time"], [[zid(30001), "call Adam", "2026-01-01 10:00:00"]])          # registered skip-tier module: staged only
    write(root, "Some New Module_001.csv", ["Record Id", "Thing", "Created Time"], [[zid(30002), "x", "2026-01-01 10:00:00"]])     # unknown: staged + reported as unmapped
    (root.parent / "Attachments").mkdir(parents=True, exist_ok=True)
    (root.parent / "Attachments" / ("53611600000" + f"{17001:08d}" + "_Rosebank layout.pdf")).write_bytes(b"%PDF-1.4 fixture")
    print(f"fixture written to {root}")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tests/fixture/Data_001")
