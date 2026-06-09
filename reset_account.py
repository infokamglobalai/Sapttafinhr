import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.identity.models import User
from apps.core.models import Tenant, Domain
from apps.saas.models import Subscription
from django.db import connection

email = 'kam@test.com'

tenant = Tenant.objects.filter(billing_email__iexact=email).exclude(schema_name='public').first()
if tenant:
    schema = tenant.schema_name
    with connection.cursor() as c:
        c.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
    Domain.objects.filter(tenant=tenant).delete()
    Subscription.objects.filter(tenant=tenant).delete()
    tenant.delete()
    print(f'Deleted tenant + schema: {schema}')
else:
    print('No tenant found')

user = User.objects.filter(email__iexact=email).first()
if user:
    user.delete()
    print(f'Deleted user: {email}')
else:
    print('No user found')

print('Done - kam@test.com can now sign up fresh')
