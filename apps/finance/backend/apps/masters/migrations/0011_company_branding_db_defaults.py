"""Give the branding columns database-level defaults.

0009 added these as NOT NULL with no DB default (Django manages defaults at the
ORM layer and drops the column default after backfilling existing rows). That
makes provisioning fragile: any writer that omits the columns — e.g. a service
still running the pre-0009 model during a rolling deploy — hits a NOT NULL
violation. Setting a DB default ('' / 'CLASSIC') makes such inserts succeed.

Pure RunSQL: it doesn't change Django's model state, so makemigrations stays
clean.
"""
from django.db import migrations

_TABLES = ("masters_company", "masters_historicalcompany")
_TEXT_COLS = ("logo", "document_header", "document_footer", "brand_color")


def _set_defaults(sql_lines):
    for table in _TABLES:
        for col in _TEXT_COLS:
            sql_lines.append(f"ALTER TABLE {table} ALTER COLUMN {col} SET DEFAULT '';")
        sql_lines.append(f"ALTER TABLE {table} ALTER COLUMN document_template SET DEFAULT 'CLASSIC';")
    return sql_lines


def _drop_defaults(sql_lines):
    for table in _TABLES:
        for col in (*_TEXT_COLS, "document_template"):
            sql_lines.append(f"ALTER TABLE {table} ALTER COLUMN {col} DROP DEFAULT;")
    return sql_lines


class Migration(migrations.Migration):

    dependencies = [
        ("masters", "0010_company_branding"),
    ]

    operations = [
        migrations.RunSQL(
            sql="\n".join(_set_defaults([])),
            reverse_sql="\n".join(_drop_defaults([])),
        ),
    ]
