import django
django.setup()
from apps.identity.models import User
from apps.core.models import Tenant, Domain
from apps.saas.models import Subscription
from django.db import connection
email='kam@test.com'
t=Tenant.objects.filter(billing_email__iexact=email).exclude(schema_name='public').first()
if t:
    with connection.cursor() as c: c.execute('DROP SCHEMA IF EXISTS "' + t.schema_name + '" CASCADE')
    Domain.objects.filter(tenant=t).delete()
    Subscription.objects.filter(tenant=t).delete()
    s=t.schema_name; t.delete(); print('Deleted tenant:',s)
else: print('No tenant')
u=User.objects.filter(email__iexact=email).first()
if u: u.delete(); print('Deleted user:',email)
else: print('No user')
print('Done')