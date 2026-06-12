"""Bank statement import + auto-reconciliation."""
import csv
import io
import base64
import hashlib
import json
from datetime import date as _date, datetime
from decimal import Decimal

from django.db import transaction
from django.conf import settings
from cryptography.fernet import Fernet

from apps.core.money import to_money
from apps.ledger.models import JournalEntry, JournalLine

from .models import BankAccount, BankStatement, BankStatementLine


def get_fernet_cipher():
    key = getattr(settings, "SECRET_KEY", "insecure-fallback-key")
    derived_key = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
    return Fernet(derived_key)


def decrypt_credentials(encrypted_str: str) -> dict:
    cipher = get_fernet_cipher()
    decrypted_bytes = cipher.decrypt(encrypted_str.encode())
    return json.loads(decrypted_bytes.decode())



def parse_csv_statement(file_bytes: bytes) -> list[dict]:
    """Expected CSV columns: date, description, reference, debit, credit, balance.
    Date format DD-MM-YYYY or YYYY-MM-DD.
    """
    text = file_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for r in reader:
        date_str = (r.get("date") or "").strip()
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
            try:
                d = datetime.strptime(date_str, fmt).date()
                break
            except ValueError:
                continue
        else:
            continue
        rows.append({
            "date": d,
            "description": (r.get("description") or "").strip(),
            "reference": (r.get("reference") or "").strip(),
            "debit": to_money(r.get("debit") or "0"),
            "credit": to_money(r.get("credit") or "0"),
            "balance": to_money(r.get("balance") or "0"),
        })
    return rows


@transaction.atomic
def import_statement(*, bank_account: BankAccount, file_bytes: bytes,
                     period_start: _date, period_end: _date,
                     opening: Decimal, closing: Decimal) -> BankStatement:
    stmt = BankStatement.objects.create(
        bank_account=bank_account, period_start=period_start, period_end=period_end,
        opening_balance=to_money(opening), closing_balance=to_money(closing),
    )
    rows = parse_csv_statement(file_bytes)
    for r in rows:
        BankStatementLine.objects.create(statement=stmt, **r)
    return stmt


def auto_reconcile(bank_account: BankAccount) -> dict:
    """Match unmatched statement lines against unreconciled JE lines on the
    bank's ledger account, by (date ±2 days) + (amount)."""
    matched = 0
    unmatched_lines = BankStatementLine.objects.filter(
        statement__bank_account=bank_account,
        status=BankStatementLine.Status.UNMATCHED,
    )
    for stmt_line in unmatched_lines:
        # Statement: credit on stmt means money IN (Dr in our ledger)
        target_amount = stmt_line.credit if stmt_line.credit > 0 else stmt_line.debit
        target_side = "debit" if stmt_line.credit > 0 else "credit"

        candidates = JournalLine.objects.filter(
            account=bank_account.ledger_account,
            journal_entry__status=JournalEntry.Status.POSTED,
            journal_entry__date__range=(stmt_line.date.replace(day=max(1, stmt_line.date.day - 2))
                                        if stmt_line.date.day > 2 else stmt_line.date,
                                        stmt_line.date),
            bank_matches__isnull=True,
        )
        for c in candidates:
            amount = c.debit if target_side == "debit" else c.credit
            if amount == target_amount and amount > 0:
                stmt_line.matched_journal_line = c
                stmt_line.status = BankStatementLine.Status.MATCHED
                stmt_line.save(update_fields=["matched_journal_line", "status", "updated_at"])
                matched += 1
                break

    return {"matched": matched, "total_unmatched": unmatched_lines.count() - matched}


def get_bank_credentials(bank_account: BankAccount) -> dict:
    try:
        if hasattr(bank_account, "credential") and bank_account.credential.encrypted_data:
            return decrypt_credentials(bank_account.credential.encrypted_data)
    except Exception:
        pass
    return {}


@transaction.atomic
def sync_live_feed(bank_account: BankAccount) -> BankStatement:
    """Fetch live account statement feed from bank's Connected Banking API.
    Supports ICICI, HDFC, Axis, and SBI corporate APIs.
    """
    import os
    from datetime import timedelta
    from rest_framework.exceptions import ValidationError
    
    today = _date.today()
    start_date = today - timedelta(days=30)
    bank_name_lower = bank_account.bank_name.lower()
    
    txns = []
    db_creds = get_bank_credentials(bank_account)
    
    if "icici" in bank_name_lower:
        corp_id = db_creds.get("corp_id") or os.environ.get("ICICI_CORP_ID")
        user_id = db_creds.get("user_id") or os.environ.get("ICICI_USER_ID")
        client_id = db_creds.get("client_id") or os.environ.get("ICICI_CLIENT_ID")
        client_secret = db_creds.get("client_secret") or os.environ.get("ICICI_CLIENT_SECRET")
        api_key = db_creds.get("api_key") or os.environ.get("ICICI_API_KEY")
        private_key = db_creds.get("private_key") or os.environ.get("ICICI_PRIVATE_KEY")
        
        missing = [k for k, v in [
            ("ICICI_CORP_ID", corp_id),
            ("ICICI_USER_ID", user_id),
            ("ICICI_CLIENT_ID", client_id),
            ("ICICI_CLIENT_SECRET", client_secret),
            ("ICICI_API_KEY", api_key),
            ("ICICI_PRIVATE_KEY", private_key)
        ] if not v]
        
        if missing:
            raise ValidationError(f"Please configure missing ICICI connected banking credentials in your .env or DB: {', '.join(missing)}")
            
        from .integrations.icici import ICICIConnectedBankingClient
        client = ICICIConnectedBankingClient(
            corp_id=corp_id, user_id=user_id, client_id=client_id,
            client_secret=client_secret, api_key=api_key, private_key_str=private_key
        )
        txns = client.get_statement(bank_account.account_number, start_date.isoformat(), today.isoformat())
        
    elif "hdfc" in bank_name_lower:
        corp_id = db_creds.get("corp_id") or os.environ.get("HDFC_CORP_ID")
        user_id = db_creds.get("user_id") or os.environ.get("HDFC_USER_ID")
        client_id = db_creds.get("client_id") or os.environ.get("HDFC_CLIENT_ID")
        client_secret = db_creds.get("client_secret") or os.environ.get("HDFC_CLIENT_SECRET")
        
        missing = [k for k, v in [
            ("HDFC_CORP_ID", corp_id),
            ("HDFC_USER_ID", user_id),
            ("HDFC_CLIENT_ID", client_id),
            ("HDFC_CLIENT_SECRET", client_secret)
        ] if not v]
        
        if missing:
            raise ValidationError(f"Please configure missing HDFC connected banking credentials in your .env or DB: {', '.join(missing)}")
            
        from .integrations.hdfc import HDFCConnectedBankingClient
        client = HDFCConnectedBankingClient(
            corp_id=corp_id, user_id=user_id, client_id=client_id, client_secret=client_secret
        )
        txns = client.get_statement(bank_account.account_number, start_date.isoformat(), today.isoformat())
        
    elif "axis" in bank_name_lower:
        corp_id = db_creds.get("corp_id") or os.environ.get("AXIS_CORP_ID")
        user_id = db_creds.get("user_id") or os.environ.get("AXIS_USER_ID")
        client_id = db_creds.get("client_id") or os.environ.get("AXIS_CLIENT_ID")
        client_secret = db_creds.get("client_secret") or os.environ.get("AXIS_CLIENT_SECRET")
        private_key = db_creds.get("private_key") or os.environ.get("AXIS_PRIVATE_KEY")
        
        missing = [k for k, v in [
            ("AXIS_CORP_ID", corp_id),
            ("AXIS_USER_ID", user_id),
            ("AXIS_CLIENT_ID", client_id),
            ("AXIS_CLIENT_SECRET", client_secret),
            ("AXIS_PRIVATE_KEY", private_key)
        ] if not v]
        
        if missing:
            raise ValidationError(f"Please configure missing Axis bank connected banking credentials in your .env or DB: {', '.join(missing)}")
            
        from .integrations.axis import AxisConnectedBankingClient
        client = AxisConnectedBankingClient(
            corp_id=corp_id, user_id=user_id, client_id=client_id,
            client_secret=client_secret, private_key_str=private_key
        )
        txns = client.get_statement(bank_account.account_number, start_date.isoformat(), today.isoformat())
        
    elif "sbi" in bank_name_lower or "state bank" in bank_name_lower:
        corp_id = db_creds.get("corp_id") or os.environ.get("SBI_CORP_ID")
        user_id = db_creds.get("user_id") or os.environ.get("SBI_USER_ID")
        client_id = db_creds.get("client_id") or os.environ.get("SBI_CLIENT_ID")
        client_secret = db_creds.get("client_secret") or os.environ.get("SBI_CLIENT_SECRET")
        
        missing = [k for k, v in [
            ("SBI_CORP_ID", corp_id),
            ("SBI_USER_ID", user_id),
            ("SBI_CLIENT_ID", client_id),
            ("SBI_CLIENT_SECRET", client_secret)
        ] if not v]
        
        if missing:
            raise ValidationError(f"Please configure missing SBI connected banking credentials in your .env or DB: {', '.join(missing)}")
            
        from .integrations.sbi import SBIConnectedBankingClient
        client = SBIConnectedBankingClient(
            corp_id=corp_id, user_id=user_id, client_id=client_id, client_secret=client_secret
        )
        txns = client.get_statement(bank_account.account_number, start_date.isoformat(), today.isoformat())
        
    else:
        raise ValidationError(f"Real Connected Banking feed sync is not supported for bank: '{bank_account.bank_name}'. Supported banks: ICICI, HDFC, Axis, SBI.")


    stmt = BankStatement.objects.create(
        bank_account=bank_account,
        period_start=start_date,
        period_end=today,
        opening_balance=bank_account.opening_balance,
        closing_balance=bank_account.opening_balance,
        source=f"FEED_{bank_account.bank_name.upper()[:5]}",
    )

    current_balance = bank_account.opening_balance
    for tx in txns:
        # Standard transaction fields parsing
        date_str = tx.get("transactionDate") or tx.get("date") or today.isoformat()
        try:
            tx_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            tx_date = today

        debit = Decimal(str(tx.get("withdrawalAmt") or tx.get("debit") or "0.00"))
        credit = Decimal(str(tx.get("depositAmt") or tx.get("credit") or "0.00"))
        current_balance += (credit - debit)

        BankStatementLine.objects.create(
            statement=stmt,
            date=tx_date,
            description=tx.get("remarks") or tx.get("description") or "Bank Transaction",
            reference=tx.get("refNo") or tx.get("reference") or "",
            debit=debit,
            credit=credit,
            balance=current_balance,
            status=BankStatementLine.Status.UNMATCHED,
        )

    stmt.closing_balance = current_balance
    stmt.save(update_fields=["closing_balance"])
    return stmt

