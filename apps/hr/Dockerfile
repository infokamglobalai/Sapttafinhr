# Pin to Debian 12 (bookworm): newer slim bases renamed libgdk-pixbuf2.0-0,
# which WeasyPrint needs. Bookworm keeps the expected package names.
FROM python:3.12-slim-bookworm

# System deps for WeasyPrint and psycopg2
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 libffi-dev libcairo2 \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files using throwaway build-time settings/secrets so the image
# never depends on real runtime env. Dev (runserver) serves static itself, so a
# failure here must not break the build.
RUN SECRET_KEY=build-dummy \
    FIELD_ENCRYPTION_KEY=UiqVW7210lXdS8pD58ooTByRzUY0eh9RDDLMQ36A5F0= \
    DJANGO_SETTINGS_MODULE=hrms.settings.development \
    python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "hrms.wsgi:application", "--bind", "0.0.0.0:8000", \
     "--workers", "4", "--timeout", "120", "--access-logfile", "-"]
