import random
from datetime import datetime

class AxisConnectedBankingClient:
    def __init__(self, corp_id, user_id, client_id, client_secret, private_key_str):
        self.corp_id = corp_id
        self.user_id = user_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.private_key_str = private_key_str

    def get_statement(self, account_number, start_date, end_date):
        """Simulate Axis Bank corporate statement response."""
        return [
            {
                "transactionDate": datetime.now().strftime("%Y-%m-%d"),
                "withdrawalAmt": "1200.00",
                "depositAmt": "0.00",
                "remarks": "Axis Charge Mock",
                "refNo": f"AXI{random.randint(100000, 999999)}"
            }
        ]

    def initiate_payout(self, account_number, beneficiary_account, beneficiary_ifsc, amount, narration):
        """Simulate Axis Bank payout response."""
        return {
            "status": "SUCCESS",
            "utr": f"AXI{random.randint(10000000, 99999999)}",
            "reference_id": f"REF{random.randint(100000, 999999)}",
            "detail": "Payout processed successfully via Axis Connected Banking (Simulated)."
        }
