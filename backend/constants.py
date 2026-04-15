"""
Constants for My Table Feature

Defines allowed values for template IDs, rate limits, and other configuration.
"""

# =============================================================================
# QUESTION TEMPLATES (structured only, NO free-form posting)
# =============================================================================

ALLOWED_QUESTION_TEMPLATES = {
    'can_eat_safely': 'Has anyone with {restriction} eaten safely at {restaurant}?',
    'what_worked': 'What did you order that worked?',
    'kitchen_understands': 'Did the kitchen understand cross-contact?',
    'has_allergen_binder': 'Do they have an allergen binder?',
    'change_gloves': 'Did they change gloves?',
    'trust_again': 'Would you trust this place again?',
}

# =============================================================================
# RATE LIMITS (per day, server-enforced)
# =============================================================================

RATE_LIMITS = {
    'invite': 3,      # Max 3 invites per day
    'question': 5,    # Max 5 questions per day
    'answer': 20,     # Max 20 answers per day
    'signal': 10,     # Max 10 safety signals per day
}

# =============================================================================
# TABLE CONNECTION LIMITS
# =============================================================================

MAX_TABLE_MEMBERS = 10  # Max accepted connections per user

# =============================================================================
# ALLOWED VALUES (for validation)
# =============================================================================

ALLOWED_CONNECTION_STATUS = ['invited', 'accepted', 'declined', 'blocked', 'removed']
ALLOWED_QUESTION_STATUS = ['open', 'answered', 'expired']
ALLOWED_VISIBILITY = ['table_only', 'private']  # NO 'public'!
ALLOWED_VERIFICATION_STATES = ['unverified', 'restaurant_verified', 'staff_verified', 'kitchen_confirmed']
ALLOWED_EVIDENCE_TYPES = ['menu_label', 'server_confirmed', 'kitchen_confirmed', 'user_experience']
ALLOWED_ATTRIBUTION = ['attributed', 'anonymous']
ALLOWED_INTERACTION_TYPES = ['answered_question', 'confirmed_restaurant', 'shared_safe_meal']
ALLOWED_REPORT_TYPES = ['spam', 'inappropriate', 'unsafe_advice', 'harassment']
ALLOWED_TARGET_TYPES = ['table_member', 'question', 'answer', 'signal']
ALLOWED_REPORT_STATUS = ['pending', 'reviewed', 'actioned']

# =============================================================================
# WHAT WORKED OPTIONS (structured, from real Facebook data)
# =============================================================================

ALLOWED_WHAT_WORKED = [
    'changed_gloves',
    'separate_fryer',
    'allergen_binder',
    'manager_checked',
    'chef_confirmed',
    'asked_cross_contact',
    'dedicated_prep_area',
    'ingredient_swap',
    'staff_knowledgeable',
]
