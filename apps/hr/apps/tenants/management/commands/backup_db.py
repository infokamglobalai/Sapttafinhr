"""
Database backup management command.

Works for both SQLite (dev) and PostgreSQL (prod). Backups are gzipped and
written to BACKUP_DIR (default: <project>/backups/). Old backups are pruned.
If USE_DO_SPACES is enabled and --upload is passed, the backup is also
uploaded to the configured Spaces bucket under "backups/".

Usage:
    python manage.py backup_db                    # local backup
    python manage.py backup_db --upload           # local + Spaces
    python manage.py backup_db --keep 7           # keep last 7 backups locally
    python manage.py backup_db --quiet            # for cron
"""
import datetime
import gzip
import os
import shutil
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Backup the database (SQLite or PostgreSQL), gzip, optionally upload to Spaces"

    def add_arguments(self, parser):
        parser.add_argument("--upload", action="store_true",
                            help="Also upload to DigitalOcean Spaces (requires USE_DO_SPACES=True)")
        parser.add_argument("--keep", type=int, default=14,
                            help="Number of local backups to keep (default 14)")
        parser.add_argument("--quiet", action="store_true", help="Suppress all but errors")
        parser.add_argument("--dest", help="Override backup directory")

    def handle(self, *args, **opts):
        self.quiet = opts["quiet"]
        backup_dir = Path(opts["dest"]) if opts.get("dest") else Path(settings.BASE_DIR) / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        db_settings = settings.DATABASES["default"]
        engine = db_settings["ENGINE"]

        if "sqlite" in engine:
            backup_path = self._backup_sqlite(db_settings, backup_dir, timestamp)
        elif "postgresql" in engine or "postgres" in engine:
            backup_path = self._backup_postgres(db_settings, backup_dir, timestamp)
        else:
            raise CommandError(f"Unsupported database engine: {engine}")

        size_mb = backup_path.stat().st_size / 1024 / 1024
        self._info(f"Backup written: {backup_path.name} ({size_mb:.2f} MB)")

        if opts["upload"]:
            self._upload_to_spaces(backup_path)

        self._prune(backup_dir, keep=opts["keep"])

    # ── SQLite ──────────────────────────────────────────────────────────────
    def _backup_sqlite(self, db_settings, backup_dir, timestamp):
        src = Path(db_settings["NAME"])
        if not src.exists():
            raise CommandError(f"SQLite file not found: {src}")
        dest = backup_dir / f"db_sqlite_{timestamp}.sqlite3.gz"
        with open(src, "rb") as f_in, gzip.open(dest, "wb", compresslevel=6) as f_out:
            shutil.copyfileobj(f_in, f_out)
        return dest

    # ── PostgreSQL ──────────────────────────────────────────────────────────
    def _backup_postgres(self, db_settings, backup_dir, timestamp):
        if not shutil.which("pg_dump"):
            raise CommandError("pg_dump not found on PATH. Install PostgreSQL client tools.")
        dest = backup_dir / f"db_pg_{db_settings['NAME']}_{timestamp}.sql.gz"
        env = os.environ.copy()
        env["PGPASSWORD"] = db_settings.get("PASSWORD", "")
        cmd = [
            "pg_dump",
            "-h", db_settings.get("HOST", "localhost"),
            "-p", str(db_settings.get("PORT", "5432")),
            "-U", db_settings.get("USER", "postgres"),
            "-d", db_settings["NAME"],
            "--no-owner", "--no-privileges", "--clean", "--if-exists",
        ]
        with gzip.open(dest, "wb", compresslevel=6) as f_out:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
            for chunk in iter(lambda: proc.stdout.read(64 * 1024), b""):
                f_out.write(chunk)
            proc.wait()
            if proc.returncode != 0:
                err = proc.stderr.read().decode("utf-8", errors="replace")
                dest.unlink(missing_ok=True)
                raise CommandError(f"pg_dump failed (exit {proc.returncode}): {err}")
        return dest

    # ── Optional upload to DO Spaces / S3 ───────────────────────────────────
    def _upload_to_spaces(self, path: Path):
        if not getattr(settings, "USE_DO_SPACES", False):
            self.stderr.write(self.style.WARNING(
                "USE_DO_SPACES is False; skipping upload."
            ))
            return
        try:
            import boto3
        except ImportError:
            raise CommandError("boto3 not installed. pip install boto3.")

        client = boto3.client(
            "s3",
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        key = f"backups/{path.name}"
        client.upload_file(str(path), settings.AWS_STORAGE_BUCKET_NAME, key,
                           ExtraArgs={"ACL": "private"})
        self._info(f"Uploaded to Spaces: {key}")

    # ── Pruning ─────────────────────────────────────────────────────────────
    def _prune(self, backup_dir: Path, keep: int):
        files = sorted(
            [p for p in backup_dir.glob("db_*.gz") if p.is_file()],
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        for old in files[keep:]:
            old.unlink(missing_ok=True)
            self._info(f"Pruned old backup: {old.name}")

    # ── Output helper ───────────────────────────────────────────────────────
    def _info(self, msg):
        if not self.quiet:
            self.stdout.write(self.style.SUCCESS(msg))
