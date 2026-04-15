#!/usr/bin/env python3
"""
Daily Cron Job: Calculate Trust Scores

This script should be run daily via cron to recalculate all restaurant trust scores
based on current safety signals.

Setup:
    1. Make executable: chmod +x cron_calculate_trust_scores.py
    2. Add to crontab: crontab -e
       # Run daily at 2 AM
       0 2 * * * cd /var/www/chatwithmenu/Backend/python && /var/www/chatwithmenu/Backend/.venv/bin/python3 cron_calculate_trust_scores.py >> /var/log/trust_scores_cron.log 2>&1

Usage:
    python3 cron_calculate_trust_scores.py
"""

import sys
import os
from datetime import datetime
import requests
import json

# Configuration
API_BASE_URL = "http://localhost:5000"
ENDPOINT = "/api/admin/calculate-trust-scores"

# Get JWT token from environment variable
# You'll need to set this in your cron environment or generate a service account token
JWT_TOKEN = os.environ.get('TRUST_SCORE_CRON_TOKEN', '')

def calculate_trust_scores():
    """Call the trust score calculation endpoint"""

    print(f"[{datetime.utcnow().isoformat()}] Starting trust score calculation...")

    if not JWT_TOKEN:
        print("ERROR: TRUST_SCORE_CRON_TOKEN environment variable not set")
        print("Please set a valid JWT token for authentication")
        sys.exit(1)

    try:
        response = requests.post(
            f"{API_BASE_URL}{ENDPOINT}",
            headers={
                "Authorization": f"Bearer {JWT_TOKEN}",
                "Content-Type": "application/json"
            },
            timeout=300  # 5 minute timeout for large datasets
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Calculated scores for {result.get('scores_calculated', 0)} restaurant-restriction combinations")
            print(f"   Total signals processed: {result.get('total_signals_processed', 0)}")
            print(f"   Execution time: {result.get('execution_time_seconds', 0):.2f} seconds")
            return 0
        elif response.status_code == 401:
            print("❌ ERROR: Authentication failed")
            print("   Please check TRUST_SCORE_CRON_TOKEN is valid")
            return 1
        else:
            print(f"❌ ERROR: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            return 1

    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Failed to connect to API")
        print(f"   {str(e)}")
        return 1
    except Exception as e:
        print(f"❌ ERROR: Unexpected error")
        print(f"   {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = calculate_trust_scores()
    sys.exit(exit_code)
