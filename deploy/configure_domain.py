#!/usr/bin/env python3
import argparse
import os
import re
import secrets
from cryptography.fernet import Fernet

def generate_django_secret():
    return secrets.token_urlsafe(48)

def generate_fernet_key():
    return Fernet.generate_key().decode()

def escape_domain_for_regex(domain):
    # e.g., 'my-domain.co.in' -> 'my-domain\.co\.in'
    return domain.replace('.', r'\.')

def main():
    parser = argparse.ArgumentParser(description="Configure production domain and secrets for Saptta.")
    parser.add_argument("--domain", required=True, help="Your target production domain (e.g., sapttafinhr.com)")
    args = parser.parse_args()

    domain = args.domain.strip().lower()
    escaped_domain = escape_domain_for_regex(domain)

    # 1. Update/Create .env.prod from .env.prod.example
    env_example_path = ".env.prod.example"
    env_prod_path = ".env.prod"

    if not os.path.exists(env_example_path):
        # fallback if run from deploy directory
        env_example_path = "../.env.prod.example"
        env_prod_path = "../.env.prod"

    if not os.path.exists(env_example_path):
        print(f"Error: Could not find .env.prod.example (tried .env.prod.example and ../.env.prod.example)")
        return

    print(f"Reading template from {env_example_path}...")
    with open(env_example_path, "r", encoding="utf-8") as f:
        env_content = f.read()

    # Replace domains
    env_content = env_content.replace("saptta.com", domain)

    # Replace secrets
    fin_secret = generate_django_secret()
    hr_secret = generate_django_secret()
    fernet_key = generate_fernet_key()
    sso_secret = generate_django_secret()

    env_content = env_content.replace("FIN_SECRET_KEY=CHANGE-ME-48-char-random", f"FIN_SECRET_KEY={fin_secret}")
    env_content = env_content.replace("HR_SECRET_KEY=CHANGE-ME-another-48-char-random", f"HR_SECRET_KEY={hr_secret}")
    env_content = env_content.replace("HR_FIELD_ENCRYPTION_KEY=CHANGE-ME-fernet-key", f"HR_FIELD_ENCRYPTION_KEY={fernet_key}")
    env_content = env_content.replace("SSO_SHARED_SECRET=CHANGE-ME-shared-sso-secret", f"SSO_SHARED_SECRET={sso_secret}")

    with open(env_prod_path, "w", encoding="utf-8") as f:
        f.write(env_content)
    print(f"Created/updated {env_prod_path} with your domain and secure generated secrets.")

    # 2. Update Nginx Configs
    nginx_files = ["deploy/nginx.coolify.conf", "deploy/nginx.prod.conf"]
    if not os.path.exists("deploy"):
        # fallback
        nginx_files = ["nginx.coolify.conf", "nginx.prod.conf"]

    for file_path in nginx_files:
        if not os.path.exists(file_path):
            print(f"Warning: Could not find {file_path}, skipping.")
            continue

        print(f"Configuring domain in {file_path}...")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Update the regex-based server_name
        # Find something like: \.saptta\.com$ and replace with escaped_domain
        content = re.sub(r'\\.saptta\\.com\$', f'\\.{escaped_domain}$', content)

        # Update standard domain names
        content = content.replace("saptta.com", domain)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Successfully updated {file_path}")

    print("\nDomain configuration completed successfully!")
    print(f"You can now copy '.env.prod' to your Hostinger VPS and use it for deployment.")

if __name__ == "__main__":
    main()
