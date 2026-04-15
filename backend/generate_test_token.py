#!/usr/bin/env python3
"""
Generate Test JWT Token for API Testing

This script helps generate JWT tokens for testing My Table API endpoints.

Usage:
    python3 generate_test_token.py

For production, you should use real Supabase JWT tokens.
"""

import jwt
import json
from datetime import datetime, timedelta
import os

# IMPORTANT: This is for TESTING ONLY
# In production, Supabase generates and signs the JWT tokens
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-test-secret-key-change-me')

def generate_test_token(user_id, email, exp_hours=24):
    """
    Generate a test JWT token

    Args:
        user_id: Database user ID
        email: User email
        exp_hours: Token expiration in hours

    Returns:
        JWT token string
    """

    payload = {
        'sub': f'test-user-{user_id}',  # Supabase user UUID (mocked)
        'email': email,
        'user_id': user_id,
        'aud': 'authenticated',
        'role': 'authenticated',
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=exp_hours)
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def main():
    print("=" * 60)
    print("JWT Token Generator for My Table API Testing")
    print("=" * 60)
    print()
    print("⚠️  WARNING: This is for TESTING ONLY!")
    print("   In production, use real Supabase JWT tokens from authentication.")
    print()

    # Get user input
    user_id = input("Enter user ID (default: 1): ").strip() or "1"
    email = input("Enter email (default: test@example.com): ").strip() or "test@example.com"
    exp_hours = input("Token expiration in hours (default: 24): ").strip() or "24"

    try:
        user_id = int(user_id)
        exp_hours = int(exp_hours)
    except ValueError:
        print("Error: Invalid input")
        return

    # Generate token
    token = generate_test_token(user_id, email, exp_hours)

    print()
    print("=" * 60)
    print("Generated JWT Token:")
    print("=" * 60)
    print(token)
    print()

    # Decode and display payload
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        print("Token Payload:")
        print(json.dumps(decoded, indent=2, default=str))
    except Exception as e:
        print(f"Error decoding token: {e}")

    print()
    print("=" * 60)
    print("Usage Examples:")
    print("=" * 60)
    print()
    print("1. cURL:")
    print(f'   curl -H "Authorization: Bearer {token}" \\')
    print('        http://localhost:5000/api/table/connections')
    print()
    print("2. JavaScript fetch:")
    print("   fetch('http://localhost:5000/api/table/connections', {")
    print(f"     headers: {{ 'Authorization': 'Bearer {token}' }}")
    print("   })")
    print()
    print("3. Python requests:")
    print("   import requests")
    print(f"   token = '{token}'")
    print("   headers = {'Authorization': f'Bearer {token}'}")
    print("   response = requests.get('http://localhost:5000/api/table/connections', headers=headers)")
    print()

    # Save to file option
    save = input("Save token to file? (y/n): ").strip().lower()
    if save == 'y':
        filename = 'test_token.txt'
        with open(filename, 'w') as f:
            f.write(token)
        print(f"✓ Token saved to {filename}")

    print()
    print("⚠️  Remember: This token is for testing only!")
    print("   Configure JWT_SECRET_KEY in your .env file to match this secret.")

if __name__ == "__main__":
    main()
