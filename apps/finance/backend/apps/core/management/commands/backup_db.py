"""Database backup via pg_dump.

    python manage.py backup_db [--out /backups] [--keep 14]

Writes a timestamped compressed dump of the whole Postgres database (all tenant
schemas + public) and prunes dumps older than --keep days. Scheduled nightly by
Celery beat (apps.core.tasks.run_db_backup).

Requires the `pg_dump` client binary (added to the backend image). Honours the
same env the app uses (POSTGRES_*). For off-box durability, point --out at a
mounted volume / object-store sync path.
"""
from __future__ import annotations

import os
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Dump the Postgres database with pg_dump and prune old dumps."

    def add_arguments(self, parser):
        parser.add_argument("--out", default=os.environ.get("BACKUP_DIR", "/backups"))
        parser.add_argument("--keep", type=int, default=int(os.environ.get("BACKUP_KEEP_DAYS", "14")))

    def handle(self, *args, **opts):
        db = settings.DATABASES["default"]
        out_dir = Path(opts["out"])
        out_dir.mkdir(parents=True, exist_ok=True)

        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        target = out_dir / f"saptta-{db['NAME']}-{stamp}.dump"

        # Custom format (-Fc) → compressed, supports selective restore.
        cmd = [
            "pg_dump",
            "-h", str(db["HOST"]), "-p", str(db["PORT"]),
            "-U", str(db["USER"]), "-d", str(db["NAME"]),
            "-Fc", "-f", str(target),
        ]
        env = {**os.environ, "PGPASSWORD": str(db["PASSWORD"])}

        self.stdout.write(f"Backing up {db['NAME']} → {target} …")
        try:
            subprocess.run(cmd, env=env, check=True, capture_output=True, text=True)
        except FileNotFoundError as exc:
            raise CommandError("pg_dump not found. Install postgresql-client in the image.") from exc
        except subprocess.CalledProcessError as exc:
            raise CommandError(f"pg_dump failed: {exc.stderr.strip()}") from exc

        size_mb = target.stat().st_size / (1024 * 1024)
        self.stdout.write(self.style.SUCCESS(f"Backup complete: {target.name} ({size_mb:.1f} MB)"))

        pruned = self._prune(out_dir, opts["keep"])
        if pruned:
            self.stdout.write(f"Pruned {pruned} dump(s) older than {opts['keep']} days.")

    @staticmethod
    def _prune(out_dir: Path, keep_days: int) -> int:
        cutoff = time.time() - keep_days * 86400
        pruned = 0
        for f in out_dir.glob("saptta-*.dump"):
            if f.stat().st_mtime < cutoff:
                f.unlink(missing_ok=True)
                pruned += 1
        return pruned
