# Product Subscription Access

## Business rule

SAPTTA FIN and SAPTTA HR are separate products.

A customer can have one of these commercial access states:

1. FIN only: customer can access FIN and must be blocked from HR.
2. HR only: customer can access HR and must be blocked from FIN.
3. FIN + HR: customer can access both products, but each product remains separate.

## Implemented approach

Each product now has an explicit product-entitlement layer.

FIN stores entitlements under the existing SaaS subscription model:

- Product codes: FIN, HR
- FIN runtime requires an active FIN entitlement for tenant-schema requests.
- Existing FIN tenants are backfilled with FIN access during migration.

HR stores entitlements under the HR tenant model:

- Product codes: FIN, HR
- HR runtime requires an active HR entitlement for tenant requests.
- Existing HR tenants are backfilled with HR access during migration.
- HR tenants now also have a customer_uid that can be used later to connect the same customer across products.

## Enforcement points

FIN:

- Middleware blocks tenant-schema FIN requests unless the subscription includes FIN.
- Public schema routes such as platform auth/SaaS administration remain available.

HR:

- Tenant middleware blocks HR tenant requests unless the tenant includes HR.
- Superadmin/static/media paths are exempt.

## Operational rollout

1. Run FIN migrations:

   ```powershell
   cd "fin saptta/backend"
   python manage.py migrate_schemas --shared
   ```

2. Run HR migrations:

   ```powershell
   cd "hr saptta"
   python manage.py migrate
   ```

3. Verify admin subscription data:

   - FIN: open SaaS subscriptions and confirm FIN entitlements exist.
   - HR: open tenants and confirm HR entitlements exist.

4. For customers buying both products:

   - Keep a FIN entitlement active in FIN.
   - Keep an HR entitlement active in HR.
   - Store the opposite product tenant/customer identifier in the external mapping fields when available.

5. For single-product customers:

   - Do not create or activate the unpurchased product entitlement.
   - Direct access to the unpurchased product should return a forbidden response.

## Development environment note

FIN and HR currently require different Python dependency sets and should use separate virtual environments. Do not install both exact requirement files into one shared venv unless the versions have been reconciled.
