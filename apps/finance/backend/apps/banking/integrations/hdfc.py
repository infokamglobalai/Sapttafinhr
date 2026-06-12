import random
from datetime import datetime

class HDFCConnectedBankingClient:
    def __init__(self, corp_id, user_id, client_id, client_secret):
        self.corp_id = corp_id
        self.user_id = user_id
        self.client_id = client_id
        self.client_secret = client_secret

    def get_statement(self, account_number, start_date, end_date):
        """Simulate HDFC Bank corporate statement response."""
        return [
            {
                "transactionDate": datetime.now().strftime("%Y-%m-%d"),
                "withdrawalAmt": "0.00",
                "depositAmt": "25000.00",
                "remarks": "HDFC Deposit Mock",
                "refNo": f"HDF{random.randint(100000, 999999)}"
            }
        ]

    def initiate_payout(self, account_number, beneficiary_account, beneficiary_ifsc, amount, narration):
        """Simulate HDFC Bank payout response."""
        return {
            "status": "SUCCESS",
            "utr": f"HDF{random.randint(10000000, 99999999)}",
            "reference_id": f"REF{random.randint(100000, 999999)}",
            "detail": "Payout processed successfully via HDFC Connected Banking (Simulated)."
        }
