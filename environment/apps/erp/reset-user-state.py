# Removes what one ERP user left behind, so that every run starts on the same ERP.
#
# The ERP stack is shared by all runs and its documents never change, but ERPNext also
# remembers things per user, and every run signs in as the same audit user:
#
#   list settings   the filters, sort order and columns of each list and report view
#   seen-marks      which documents the user has opened (lists show the others in bold)
#   page history    the pages the user visited, and what was printed or exported
#   sign-ins        open sessions and the login log
#
# Without this, a run finds the lists as the run before left them. The runner feeds this
# file to the Python of the ERP's backend container before each run (runs/run.ts):
#
#   docker exec -i -w /home/frappe/frappe-bench/sites fae-erpnext-backend-1 \
#     ../env/bin/python - staff.auditor@audit-firm.test < environment/apps/erp/reset-user-state.py
#
# It prints one JSON line with how much it removed, and a second pass removes nothing.

import json
import sys

import frappe

user = sys.argv[1]
site = sys.argv[2] if len(sys.argv) > 2 else json.load(open("common_site_config.json"))["default_site"]
frappe.init(site)
frappe.connect()

if not frappe.db.exists("User", user):
    sys.exit(f"The ERP has no user {user}.")

text = lambda value: value.decode() if isinstance(value, bytes) else value
count = lambda sql, *values: frappe.db.sql(sql, values)[0][0]
removed = {}

# 1. List settings: in the cache while the ERP runs, in a table once it has saved them.
fields = [field for field in map(text, frappe.cache.hkeys("_user_settings")) if field.endswith("::" + user)]
for field in fields:
    frappe.cache.hdel("_user_settings", field)
removed["list_settings"] = len(fields) + count("select count(*) from `__UserSettings` where `user` = %s", user)
frappe.db.sql("delete from `__UserSettings` where `user` = %s", user)

# 2. Seen-marks: a list of users on every document of a type that tracks them.
removed["seen_marks"] = 0
tables = frappe.db.sql("select table_name from information_schema.columns where table_schema = database() and column_name = '_seen'", pluck=True)
for table in tables:
    for name, seen in frappe.db.sql(f"select name, _seen from `{table}` where _seen like %s", (f'%"{user}"%',)):
        others = [who for who in json.loads(seen) if who != user]
        frappe.db.sql(f"update `{table}` set _seen = %s where name = %s", (json.dumps(others), name))
        removed["seen_marks"] += 1

# 3. Page history: rows waiting in the cache to be written, and rows already written.
removed["page_history"] = 0
for doctype in ("Route History", "Access Log"):
    queue = f"insert_queue_for_{doctype}"
    waiting = [json.loads(text(entry)) for entry in frappe.cache.lrange(queue, 0, -1)]
    keep = []
    for entry in waiting:  # one record, or a list of records
        records = entry if isinstance(entry, list) else [entry]
        others = [record for record in records if record.get("user") != user]
        removed["page_history"] += len(records) - len(others)
        if others:
            keep.append(others if isinstance(entry, list) else others[0])
    if len(keep) != len(waiting) or keep != waiting:
        frappe.cache.delete_value(queue)
        for entry in keep:
            frappe.cache.rpush(queue, json.dumps(entry))
for table, column in (("tabRoute History", "user"), ("tabAccess Log", "user"), ("tabView Log", "viewed_by")):
    removed["page_history"] += count(f"select count(*) from `{table}` where `{column}` = %s", user)
    frappe.db.sql(f"delete from `{table}` where `{column}` = %s", user)

# 4. Sign-ins: sessions of earlier runs and the login log. The run signs in anew after this.
sessions = frappe.db.sql("select sid from `tabSessions` where `user` = %s", user, pluck=True)
for sid in sessions:
    frappe.cache.hdel("session", sid)
frappe.db.sql("delete from `tabSessions` where `user` = %s", user)
removed["sign_ins"] = len(sessions) + count("select count(*) from `tabActivity Log` where `user` = %s", user)
frappe.db.sql("delete from `tabActivity Log` where `user` = %s", user)

frappe.db.commit()
frappe.clear_cache(user=user)  # what the ERP worked out for this user, such as the start page data
frappe.destroy()
print(json.dumps({"user": user, "removed": removed}))
