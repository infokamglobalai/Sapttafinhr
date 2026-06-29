from .base import *  # noqa: F401,F403

DEBUG = True

# In dev, nginx proxies through the Docker bridge (172.18.x.x) so the Host
# header Django receives may be the gateway IP. Allow all hosts in dev — safe
# because DEBUG=True and the server is not internet-exposed.
ALLOWED_HOSTS = ["*"]

# Fall back to public schema for any hostname not in the tenant domain table
# (e.g. Docker bridge IPs used by nginx as the forwarded host).
SHOW_PUBLIC_IF_NO_TENANT_FOUND = True

MFA_REQUIRED = False
REQUIRE_EMAIL_VERIFICATION = False

