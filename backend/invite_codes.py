"""
invite_codes.py

This file was previously untracked but is required at runtime by server.py.

Goal:
- Prevent backend startup failure (ModuleNotFoundError)
- Provide a minimal, flexible invite-code implementation
- Support multiple possible import/usage styles from server.py
"""

import os
import time
from typing import Optional, Dict, Any

# You can set invite codes via env:
#   INVITE_CODES="CODE1,CODE2,CODE3"
# Or keep defaults below for dev.
_DEFAULT_CODES = {
    "DEV-INVITE",
    "CWM-BETA",
    "ILVIOLINO",
    "1122",  # Merchant - full access
    "2211",  # Waiter - server access
    "1212",  # Diner - standard access
}

def _load_codes():
    raw = os.getenv("INVITE_CODES", "").strip()
    if raw:
        return {c.strip() for c in raw.split(",") if c.strip()}
    return set(_DEFAULT_CODES)

# Primary in-memory set of valid codes
INVITE_CODES = _load_codes()

# Optional: track usage (in-memory). If you want persistence, wire to DB later.
# Map: code -> {"uses": int, "last_used": float}
INVITE_CODE_USAGE: Dict[str, Dict[str, Any]] = {}

def normalize(code: Optional[str]) -> str:
    return (code or "").strip()

def is_valid_invite_code(code: Optional[str]) -> bool:
    """Return True if code exists in INVITE_CODES."""
    c = normalize(code)
    return bool(c) and (c in INVITE_CODES)

def validate_invite_code(code: Optional[str]):
    """
    Return code config dict if valid, None if invalid.
    Server expects: {'name': 'Code Name', ...} or None/False
    """
    c = normalize(code)
    if is_valid_invite_code(c):
        return {'name': c, 'valid': True}
    return None

def check_invite_code(code: Optional[str]) -> bool:
    """Alias for compatibility."""
    return is_valid_invite_code(code)

def consume_invite_code(code: Optional[str]) -> bool:
    """
    Mark an invite code as used (in-memory) and optionally enforce single-use.
    Default behavior: multi-use unless INVITE_CODES_SINGLE_USE=1.
    """
    c = normalize(code)
    if not is_valid_invite_code(c):
        return False

    single_use = os.getenv("INVITE_CODES_SINGLE_USE", "0").strip() == "1"

    meta = INVITE_CODE_USAGE.get(c, {"uses": 0, "last_used": 0.0})
    meta["uses"] = int(meta.get("uses", 0)) + 1
    meta["last_used"] = time.time()
    INVITE_CODE_USAGE[c] = meta

    if single_use:
        try:
            INVITE_CODES.remove(c)
        except KeyError:
            pass

    return True

def use_invite_code(code: Optional[str]) -> bool:
    """Alias for compatibility."""
    return consume_invite_code(code)

def get_account_type_from_code(code: Optional[str]) -> int:
    """
    Return account type based on invite code.
    0 = diner (default)
    1 = admin
    2 = merchant
    3 = server/waiter

    Code mappings:
    - 1122 = merchant (full access: diner + owner + waiter)
    - 2211 = waiter (waiter + diner access)
    - 1212 = diner (standard access)
    - no code = diner (default)
    """
    c = normalize(code)

    # Map specific codes to roles
    if c == "1122":
        return 2  # Merchant (restaurant owner)
    elif c == "2211":
        return 3  # Server/Waiter
    elif c == "1212":
        return 0  # Diner

    # Default: all users are diners
    return 0
