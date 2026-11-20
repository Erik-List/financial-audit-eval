"""Freeze the seeded ERP into one file, and bring a fresh site back to it.

    python3 -m environment.data.backup save       # after a successful load
    python3 -m environment.data.backup restore    # on a fresh site, instead of seeding again

The file is environment/apps/erp/backup/site.sql.gz, a database dump of the ERPNext site. Restoring it
gives the same documents, numbers, people and created times as the seeded site.
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

from .load import COMPOSE_FILE, COMPOSE_PROJECT, SITE, Client, backend, docker

ROOT = Path(__file__).resolve().parent.parent.parent
BACKUP = ROOT / "environment" / "apps" / "erp" / "backup" / "site.sql.gz"
IN_CONTAINER = "/home/frappe/frappe-bench/sites/site-restore.sql.gz"
DB_ROOT_PASSWORD = "admin"  # set by environment/apps/erp/compose.yml


def fingerprint() -> dict:
    """A few counts and one document, to compare a restored site with the seeded one."""
    c = Client().login("Administrator", "admin")
    counts = {dt: len(c.get_list(dt, fields=["name"])) for dt in
              ("Sales Order", "Delivery Note", "Sales Invoice", "Payment Entry", "Journal Entry", "User")}
    invoice = sorted(r["name"] for r in c.get_list("Sales Invoice", fields=["name"]))[-1]
    doc = c.get_doc("Sales Invoice", invoice)
    return {"counts": counts, "last_invoice": invoice, "created": doc["creation"], "owner": doc["owner"],
            "total": doc["grand_total"]}


def save() -> None:
    container = backend()
    docker("exec", container, "bench", "--site", SITE, "backup", timeout=1200)
    folder = f"/home/frappe/frappe-bench/sites/{SITE}/private/backups"
    newest = docker("exec", container, "sh", "-c", f"ls -t {folder}/*-database.sql.gz | head -1").strip()
    path = newest
    BACKUP.parent.mkdir(parents=True, exist_ok=True)
    docker("cp", f"{container}:{path}", str(BACKUP))
    digest = hashlib.sha256(BACKUP.read_bytes()).hexdigest()[:16]
    (BACKUP.parent / "fingerprint.txt").write_text(f"{fingerprint()}\nsha256:{digest}\n")
    print(f"saved {BACKUP.relative_to(ROOT)} ({BACKUP.stat().st_size / 1e6:.1f} MB, sha256 {digest})")


def restore() -> None:
    if not BACKUP.exists():
        sys.exit(f"no backup at {BACKUP}")
    container = backend()
    docker("cp", str(BACKUP), f"{container}:{IN_CONTAINER}")
    docker("exec", "-u", "root", container, "chmod", "644", IN_CONTAINER)
    docker("exec", container, "bench", "--site", SITE, "restore", IN_CONTAINER,
           "--db-root-username", "root", "--db-root-password", DB_ROOT_PASSWORD, "--force", timeout=1800)
    docker("exec", container, "rm", "-f", IN_CONTAINER)
    docker("exec", container, "bench", "--site", SITE, "clear-cache")
    # The web server is restarted last: it keeps the app containers' old addresses otherwise.
    for service in ("backend", "queue-long", "websocket", "frontend"):
        docker("compose", "-p", COMPOSE_PROJECT, "-f", str(COMPOSE_FILE), "restart", service)
    print("restored", BACKUP.relative_to(ROOT))


if __name__ == "__main__":
    {"save": save, "restore": restore, "fingerprint": lambda: print(fingerprint())}[sys.argv[1] if len(sys.argv) > 1 else "save"]()
