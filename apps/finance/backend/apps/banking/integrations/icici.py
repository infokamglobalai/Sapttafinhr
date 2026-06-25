import random
from datetime import datetime

class ICICIConnectedBankingClient:
    def __init__(self, corp_id, user_id, client_id, client_secret, api_key, private_key_str):
        self.corp_id = corp_id
        self.user_id = user_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.api_key = api_key
        self.private_key_str = private_key_str

    def get_statement(self, account_number, start_date, end_date):
        """Simulate ICICI Bank corporate statement response."""
        return [
            {
                "transactionDate": datetime.now().strftime("%Y-%m-%d"),
                "withdrawalAmt": "0.00",
                "depositAmt": "15000.00",
                "remarks": "ICICI Bank Feed Seed",
                "refNo": f"TXN{random.randint(100000, 999999)}"
            },
            {
                "transactionDate": datetime.now().strftime("%Y-%m-%d"),
                "withdrawalAmt": "4500.00",
                "depositAmt": "0.00",
                "remarks": "Vendor Payout Mock",
                "refNo": f"TXN{random.randint(100000, 999999)}"
            }
        ]

    def initiate_payout(self, account_number, beneficiary_account, beneficiary_ifsc, amount, narration):
        """Simulate ICICI Bank payout response."""
        return {
            "status": "SUCCESS",
            "utr": f"ICI{random.randint(10000000, 99999999)}",
            "reference_id": f"REF{random.randint(100000, 999999)}",
            "detail": "Payout processed successfully via ICICI Connected Banking (Simulated)."
        }
