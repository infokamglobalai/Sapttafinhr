import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.dev'
import sys; sys.path.insert(0, '/app')
django.setup()
from django.db import connection

email = 'kam@test.com'
with connection.cursor() as c:
    c.execute("SELECT schema_name FROM core_tenant WHERE billing_email ILIKE %s AND schema_name != 'public'", [email])
    schemas = [r[0] for r in c.fetchall()]
    for s in schemas:
        c.execute('DROP SCHEMA IF EXISTS "%s" CASCADE' % s)
        print('Dropped schema:', s)
    c.execute("DELETE FROM core_domain WHERE tenant_id IN (SELECT id FROM core_tenant WHERE billing_email ILIKE %s AND schema_name != 'public')", [email])
    c.execute("DELETE FROM saas_subscriptionentitlement WHERE subscription_id IN (SELECT id FROM saas_subscription WHERE tenant_id IN (SELECT id FROM core_tenant WHERE billing_email ILIKE %s AND schema_name != 'public'))", [email])
    c.execute("DELETE FROM saas_subscription WHERE tenant_id IN (SELECT id FROM core_tenant WHERE billing_email ILIKE %s AND schema_name != 'public')", [email])
    c.execute("DELETE FROM core_tenant WHERE billing_email ILIKE %s AND schema_name != 'public'", [email])
    c.execute("DELETE FROM identity_user WHERE email ILIKE %s", [email])
    print('Deleted all data for', email)
print('Done — kam@test.com is free to sign up again')
