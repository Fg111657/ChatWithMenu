"""
Defines the DB tables.

TODO Refctors:
    - menus should be stored as PDF's or images in addition to text to show the user.
        - when rest uploads, can ask gpt4vision to translate
    - restaurant should not always join on foreign tables, we shouldn't load and send data all the time
"""
from sqlalchemy import Column, String, Integer, Float, CheckConstraint, ForeignKey, Enum, DateTime, LargeBinary, Boolean, Text, UniqueConstraint, JSON, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship as db_relationship
from sqlalchemy.sql import func, ClauseElement
import marshmallow
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
import enum
import json
import bcrypt
import threading
from datetime import datetime

import jonlog

logger = jonlog.getLogger()

# Define the base class
Base = declarative_base()
DB_LOCK = threading.Lock()


class Restaurant(Base):
    __tablename__ = 'restaurants'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, default=0)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    hours_json = Column(Text, nullable=True)  # JSON string: {"mon": "9-5", "tue": "9-5"}
    amenities = Column(Text, nullable=True)
    rating_aggregate = Column(Float, nullable=True)
    review_count = Column(Integer, nullable=True)
    cuisine_type = Column(String(100), nullable=True)
    price_range = Column(Integer, nullable=True)
    phone = Column(String(20), nullable=True)  # NEW
    dietary_tags = Column(Text, nullable=True)  # NEW - JSON array: ["vegan-friendly", "gluten-free"]
    # Google Places data (enrichment from Google Places API)
    google_place_id = Column(String(255), nullable=True)
    google_rating = Column(Float, nullable=True)
    google_user_ratings_total = Column(Integer, nullable=True)
    google_address = Column(String(500), nullable=True)
    google_phone = Column(String(20), nullable=True)
    google_website = Column(String(500), nullable=True)
    google_photo_refs = Column(Text, nullable=True)  # JSON array of photo references
    google_enriched_at = Column(DateTime, nullable=True)  # Timestamp of last Google enrichment
    google_raw = Column(Text, nullable=True)  # Full Google Places response (JSON)
    menus = db_relationship("MenuDetail", back_populates="restaurant")
    documents = db_relationship("RestaurantDocument", back_populates="restaurant")
    # dietary_restrictions = db_relationship("DietaryRestriction", back_populates="user")



class MenuDetail(Base):
    __tablename__ = 'menu_details'
    id = Column(Integer, primary_key=True)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=False)
    menu_data = Column(Text, nullable=False)
    restaurant = db_relationship("Restaurant", back_populates="menus")
    # user = db_relationship("User", back_populates="dietary_restrictions")

class RestaurantDocument(Base):
    __tablename__ = 'restaurant_documents'
    id = Column(Integer, primary_key=True)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=False)
    document_type = Column(String, nullable=False)
    document_data = Column(Text, nullable=False)
    restaurant = db_relationship("Restaurant", back_populates="documents")


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    account_type = Column(Integer, default=0, nullable=False)  # 0 = normal, 1 = admin, 2 = merchant, 3 = waiter
    name = Column(String(60))
    email = Column(String(255), nullable=False, unique=True)
    supabase_uid = Column(String, nullable=True, unique=True, index=True)  # Immutable Supabase UUID for stable identity
    password_hash = Column(String(60), nullable=False)
    dietary_restrictions = db_relationship("DietaryRestriction", back_populates="user")
    reviews = db_relationship("Review", back_populates="user")
    bio = Column(String, nullable=True)
    preference_message = Column(String, nullable=True)
    display_name = Column(String(100), nullable=True)
    photo_url = Column(Text, nullable=True)
    privacy_level = Column(String(20), default='friends')
    show_allergies = Column(Boolean, default=True)
    family_members = db_relationship("FamilyMember", back_populates="parent", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))


class DietaryRestriction(Base):
    __tablename__ = 'dietary_restrictions'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    ingredient = Column(String(255), nullable=False)
    preparation_method = Column(String, nullable=False, default="Any")
    restriction_type = Column(String, nullable=False, default="Preference")
    level = Column(Float, CheckConstraint('level >= -1 and level <= 1'))
    user = db_relationship("User", back_populates="dietary_restrictions")


class Review(Base):
    __tablename__ = 'reviews'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=False)
    chat_id = Column(Integer, ForeignKey('chats.id'), nullable=False)
    item = Column(String(255), nullable=False)
    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=False)
    datetime = Column(DateTime(timezone=True), server_default=func.now())
    user = db_relationship("User", back_populates="reviews")


class Chat(Base):
    __tablename__ = 'chats'
    id = Column(Integer, primary_key=True)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    conversation_data = Column(String, nullable=True)
    datetime = Column(DateTime(timezone=True), server_default=func.now())
    family_mode = Column(Boolean, default=False)
    active_family_members = Column(Text, nullable=True)  # JSON array of family member IDs

    @classmethod
    def serialize_msgs(cls, hist):
        return json.dumps(hist)
    @classmethod
    def deserialize_msgs(cls, hist):
        return json.loads(hist)


class FamilyMember(Base):
    __tablename__ = 'family_members'
    id = Column(Integer, primary_key=True)
    parent_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=True)
    relationship = Column(String(50), default='child')  # 'child', 'teen', 'adult_dependent'
    photo_url = Column(Text, nullable=True)
    emergency_contact = Column(Text, nullable=True)  # JSON: {name, phone}
    created_at = Column(DateTime, default=datetime.utcnow)
    parent = db_relationship("User", back_populates="family_members")
    allergies = db_relationship("FamilyMemberAllergy", back_populates="family_member", cascade="all, delete-orphan")


class FamilyMemberAllergy(Base):
    __tablename__ = 'family_member_allergies'
    id = Column(Integer, primary_key=True)
    family_member_id = Column(Integer, ForeignKey('family_members.id'), nullable=False)
    ingredient = Column(String(255), nullable=False)
    restriction_type = Column(String(50), default='Allergy')  # 'Allergy', 'Preference'
    severity = Column(String(20), default='High')  # 'High', 'Medium', 'Low'
    notes = Column(Text, nullable=True)
    family_member = db_relationship("FamilyMember", back_populates="allergies")


class DishImage(Base):
    __tablename__ = 'dishimages'
    id = Column(Integer, primary_key=True)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=False)
    image_base64 = Column(String, nullable=False)
    dish_name = Column(String, nullable=False)


class AuditLog(Base):
    """Audit log for tracking all menu changes with user attribution"""
    __tablename__ = 'audit_log'

    id = Column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=True)
    menu_id = Column(Integer, ForeignKey('menu_details.id'), nullable=True)

    # User attribution (from Supabase JWT)
    actor_user_id = Column(String(255), nullable=False)  # Supabase UUID
    actor_email = Column(String(255), nullable=False)

    # Event details
    action_type = Column(String(50), nullable=False)  # MENU_IMPORTED, ITEM_UPDATED, etc.
    entity_type = Column(String(50), nullable=False)  # 'menu', 'category', 'item'
    entity_id = Column(String(255), nullable=True)    # ID of affected entity

    # Change tracking
    before_json = Column(JSON, nullable=True)   # Snapshot before change (for undo)
    after_json = Column(JSON, nullable=True)    # Snapshot after change
    metadata_json = Column(JSON, nullable=True) # Additional context (import_mode, counts, etc.)
    diff_summary = Column(Text, nullable=True)  # Human-readable summary

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<AuditLog {self.id}: {self.action_type} by {self.actor_email}>"


# Indexes for audit log query performance
Index('idx_audit_action_email', AuditLog.action_type, AuditLog.actor_email)
Index('idx_audit_created_at', AuditLog.created_at)
Index('idx_audit_restaurant', AuditLog.restaurant_id)


# =============================================================================
# MY TABLE - SOCIAL TRUST INFRASTRUCTURE (Anti-Social Media)
# =============================================================================

class TableConnection(Base):
    """
    Trusted table connections (max 10 per user, 2-way handshake required).
    This is NOT a follower system - connections require acceptance.
    """
    __tablename__ = 'table_connections'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # Person who sent/owns
    table_member_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # Person invited

    # 2-way handshake: invited → accepted | declined | blocked | removed
    status = Column(String(20), default='invited', nullable=False)  # 'invited', 'accepted', 'declined', 'blocked', 'removed'
    # VALIDATION: Must be in ['invited', 'accepted', 'declined', 'blocked', 'removed'] (enforced in API)

    # Trust metrics (NOT follower counts)
    connection_strength = Column(Integer, default=0, nullable=False)  # Based on help_count
    help_count = Column(Integer, default=0, nullable=False)  # How many times they helped

    # Invitation reason (required - no random connects)
    invited_reason = Column(Text, nullable=False)
    # VALIDATION: Min 20 chars enforced in API layer (SQLite can't do length check constraints)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships (for easier querying)
    user = db_relationship("User", foreign_keys=[user_id], backref="table_connections_sent")
    table_member = db_relationship("User", foreign_keys=[table_member_user_id], backref="table_connections_received")

    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'table_member_user_id', name='unique_table_connection'),
        CheckConstraint('user_id != table_member_user_id', name='no_self_connection'),
    )

    def __repr__(self):
        return f"<TableConnection {self.id}: user_{self.user_id} -> user_{self.table_member_user_id} ({self.status})>"


class TableQuestion(Base):
    """
    Structured questions to table (templates only, NO free-form posting).
    Questions expire after 24 hours (no permanent posts).
    """
    __tablename__ = 'table_questions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    asker_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=True)

    # Structured templates (server-validated against ALLOWED_QUESTION_TEMPLATES)
    template_id = Column(String(50), nullable=False)
    # VALIDATION: Must be in ALLOWED_QUESTION_TEMPLATES (enforced in API)
    question_text = Column(Text, nullable=False)  # Generated from template

    # Context (JSON string - standardized format)
    restriction_type = Column(String(100), nullable=True)  # 'gluten_free', 'nut_free', etc.
    context_json = Column(Text, nullable=True)  # JSON string: {"dish_name": "...", "additional_context": "..."}
    optional_note = Column(String(200), nullable=True)
    # VALIDATION: Max 200 chars enforced in API (SQLite can't do length constraints)

    # Visibility (NO public option)
    visibility = Column(String(20), default='table_only', nullable=False)
    # VALIDATION: Must be in ['table_only', 'private'] (enforced in API)

    # Status tracking
    status = Column(String(20), default='open', nullable=False)
    # VALIDATION: Must be in ['open', 'answered', 'expired'] (enforced in API)

    # Timestamps (24h expiration)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # MUST be set to created_at + 24h in API

    # Relationships
    asker = db_relationship("User", foreign_keys=[asker_user_id], backref="questions_asked")
    restaurant = db_relationship("Restaurant", foreign_keys=[restaurant_id])
    answers = db_relationship("TableAnswer", back_populates="question", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TableQuestion {self.id}: {self.template_id} by user_{self.asker_user_id}>"


class TableAnswer(Base):
    """
    Answers to table questions. Marked helpful by asker = increments help_count.

    SIMPLIFIED DESIGN: No marked_helpful_by_user_id column needed.
    Each answer can only be marked helpful ONCE (by the asker).
    API enforces idempotency and authorization.
    """
    __tablename__ = 'table_answers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey('table_questions.id', ondelete='CASCADE'), nullable=False)
    answerer_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    # Answer content
    answer_text = Column(Text, nullable=False)
    what_ordered = Column(String(255), nullable=True)  # Specific dish/item

    # Helpfulness (only asker can mark, increments help_count when true)
    helpful = Column(Boolean, default=False, nullable=False)
    # CRITICAL API ENFORCEMENT (no DB constraint can do this):
    #   1. Only asker can mark helpful: verify question.asker_user_id == g.user_id
    #   2. Idempotent: if answer.helpful == True, return OK without incrementing again
    #   3. Otherwise: set helpful=True, increment help_count ONCE, commit

    helpful_marked_at = Column(DateTime, nullable=True)  # For audit trail

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    question = db_relationship("TableQuestion", back_populates="answers")
    answerer = db_relationship("User", foreign_keys=[answerer_user_id], backref="answers_given")

    def __repr__(self):
        return f"<TableAnswer {self.id}: question_{self.question_id} by user_{self.answerer_user_id}>"


class SafetySignal(Base):
    """
    "Ate safely" signals with source credibility and attribution choice.
    Signals expire after 90 days (decay principle).
    """
    __tablename__ = 'safety_signals'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=False)

    # Signal details
    dish_name = Column(String(255), nullable=True)
    restrictions_met = Column(Text, nullable=False)
    # STANDARDIZED: Always JSON string array format: '["gluten_free", "dairy_free"]'
    # VALIDATION: API must json.loads() and validate format
    what_worked = Column(String(100), nullable=True)
    # VALIDATION: Must be in allowed set (enforced in API)
    notes = Column(Text, nullable=True)

    # Source credibility (affects trust scoring weight)
    verification_state = Column(String(30), default='unverified', nullable=False)
    # VALIDATION: Must be in ['unverified', 'restaurant_verified', 'staff_verified', 'kitchen_confirmed']

    evidence_type = Column(String(50), default='user_experience', nullable=False)
    # VALIDATION: Must be in ['menu_label', 'server_confirmed', 'kitchen_confirmed', 'user_experience']

    # Confidence (1-5 scale)
    confidence = Column(Integer, default=5, nullable=False)
    # VALIDATION: CheckConstraint would be nice but SQLite limited, enforce in API

    # Visibility (NO public option)
    visibility = Column(String(20), default='table_only', nullable=False)
    # VALIDATION: Must be in ['table_only', 'private']

    # Attribution choice
    attribution = Column(String(20), default='attributed', nullable=False)
    # VALIDATION: Must be in ['attributed', 'anonymous']

    # Timestamps (90-day expiration)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # MUST be set to created_at + 90 days in API

    # Relationships
    user = db_relationship("User", foreign_keys=[user_id], backref="safety_signals_shared")
    restaurant = db_relationship("Restaurant", foreign_keys=[restaurant_id])

    # Constraints
    __table_args__ = (
        CheckConstraint('confidence >= 1 AND confidence <= 5', name='valid_confidence'),
    )

    def __repr__(self):
        return f"<SafetySignal {self.id}: user_{self.user_id} at restaurant_{self.restaurant_id}>"


class RestaurantTrustScore(Base):
    """
    Trust indicators (NOT star ratings) by restriction type.
    Calculated with 30-day decay + source credibility weighting.
    """
    __tablename__ = 'restaurant_trust_scores'

    id = Column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=False)
    restriction_type = Column(String(50), nullable=False)  # 'gluten_free', 'nut_free', etc.

    # Trust metrics
    trust_score = Column(Float, default=0.0, nullable=False)  # 0.0 to 1.0
    signal_count = Column(Integer, default=0, nullable=False)

    # Confidence state (for fail-safe UI)
    confidence_state = Column(String(30), default='insufficient_data', nullable=False)
    # VALIDATION: Must be in ['high_confidence', 'medium_confidence', 'low_confidence', 'insufficient_data', 'conflicting_signals']

    # Timestamps
    last_signal_at = Column(DateTime, nullable=True)
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    restaurant = db_relationship("Restaurant", foreign_keys=[restaurant_id])

    # Constraints
    __table_args__ = (
        UniqueConstraint('restaurant_id', 'restriction_type', name='unique_restaurant_restriction'),
        CheckConstraint('trust_score >= 0.0 AND trust_score <= 1.0', name='valid_trust_score'),
    )

    def __repr__(self):
        return f"<TrustScore {self.id}: restaurant_{self.restaurant_id} {self.restriction_type} = {self.trust_score:.2f}>"


class HelpHistory(Base):
    """
    Tracks who helped whom (for discovery, NOT social graph).
    Only counts when answer marked helpful.
    """
    __tablename__ = 'help_history'

    id = Column(Integer, primary_key=True, autoincrement=True)
    helped_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # Person who asked
    helper_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # Person who answered

    # Interaction tracking
    interaction_type = Column(String(50), nullable=False)
    # VALIDATION: Must be in ['answered_question', 'confirmed_restaurant', 'shared_safe_meal']

    # References
    question_id = Column(Integer, ForeignKey('table_questions.id'), nullable=True)
    signal_id = Column(Integer, ForeignKey('safety_signals.id'), nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    helped_user = db_relationship("User", foreign_keys=[helped_user_id], backref="help_received")
    helper_user = db_relationship("User", foreign_keys=[helper_user_id], backref="help_given")

    def __repr__(self):
        return f"<HelpHistory {self.id}: user_{self.helper_user_id} helped user_{self.helped_user_id}>"


class RateLimit(Base):
    """
    Rate limiting (abuse prevention).
    Tracks: invites (3/day), questions (5/day), answers (20/day), signals (10/day).
    """
    __tablename__ = 'rate_limits'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    action_type = Column(String(50), nullable=False)
    # VALIDATION: Must be in ['invite', 'question', 'answer', 'signal']

    # Counter
    count = Column(Integer, default=0, nullable=False)

    # Window (FIXED: Use date string instead of timestamp to prevent duplicates)
    window_date = Column(String(10), nullable=False)  # YYYY-MM-DD format
    # CRITICAL: Set to datetime.utcnow().strftime('%Y-%m-%d') in API

    # Relationships
    user = db_relationship("User", foreign_keys=[user_id])

    # Constraint: Unique per user + action + date (not timestamp!)
    __table_args__ = (
        UniqueConstraint('user_id', 'action_type', 'window_date', name='unique_rate_limit_window'),
    )

    def __repr__(self):
        return f"<RateLimit {self.id}: user_{self.user_id} {self.action_type} on {self.window_date} = {self.count}>"


class AbuseReport(Base):
    """
    Abuse reporting system.
    Report types: spam, inappropriate, unsafe_advice, harassment.
    """
    __tablename__ = 'abuse_reports'

    id = Column(Integer, primary_key=True, autoincrement=True)
    reporter_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    # Report details
    report_type = Column(String(50), nullable=False)
    # VALIDATION: Must be in ['spam', 'inappropriate', 'unsafe_advice', 'harassment']
    reason = Column(Text, nullable=False)

    # Target (one of these will be set)
    target_type = Column(String(50), nullable=False)
    # VALIDATION: Must be in ['table_member', 'question', 'answer', 'signal']
    table_member_id = Column(Integer, ForeignKey('table_connections.id'), nullable=True)
    question_id = Column(Integer, ForeignKey('table_questions.id'), nullable=True)
    answer_id = Column(Integer, ForeignKey('table_answers.id'), nullable=True)
    signal_id = Column(Integer, ForeignKey('safety_signals.id'), nullable=True)

    # Status tracking
    status = Column(String(20), default='pending', nullable=False)
    # VALIDATION: Must be in ['pending', 'reviewed', 'actioned']

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    reporter = db_relationship("User", foreign_keys=[reporter_user_id], backref="reports_filed")

    def __repr__(self):
        return f"<AbuseReport {self.id}: {self.report_type} by user_{self.reporter_user_id}>"


# Indexes for My Table query performance (removed .desc() for SQLite compatibility)
Index('idx_table_connections_user_status', TableConnection.user_id, TableConnection.status)
Index('idx_table_connections_strength', TableConnection.user_id, TableConnection.connection_strength)
Index('idx_table_questions_asker_status', TableQuestion.asker_user_id, TableQuestion.status, TableQuestion.created_at)
Index('idx_table_answers_question', TableAnswer.question_id, TableAnswer.created_at)
Index('idx_safety_signals_restaurant', SafetySignal.restaurant_id, SafetySignal.expires_at)
Index('idx_safety_signals_user', SafetySignal.user_id, SafetySignal.created_at)
Index('idx_trust_scores_restaurant', RestaurantTrustScore.restaurant_id)
Index('idx_help_history_helped', HelpHistory.helped_user_id, HelpHistory.created_at)


def create_marshmallow_schema(cls, include_foreign=False, **kwargs):
    if include_foreign:
        class Schema(SQLAlchemyAutoSchema):
            class Meta:
                model = cls
                load_instance = True
                include_relationships = True
                include_fk = True
            @marshmallow.post_dump
            def handle_enums(self, data, **kwargs):
                # Handle both single object (dict) and many objects (list of dicts)
                if isinstance(data, list):
                    return [self._convert_enums(item) for item in data]
                return self._convert_enums(data)

            def _convert_enums(self, data):
                if not isinstance(data, dict):
                    return data
                for key, value in data.items():
                    if isinstance(value, enum.Enum):
                        data[key] = value.value
                return data
    else:
        class Schema(SQLAlchemyAutoSchema):
            class Meta:
                model = cls
                load_instance = True  # Optional: deserialize to model instances
            @marshmallow.post_dump
            def handle_enums(self, data, **kwargs):
                # Handle both single object (dict) and many objects (list of dicts)
                if isinstance(data, list):
                    return [self._convert_enums(item) for item in data]
                return self._convert_enums(data)

            def _convert_enums(self, data):
                if not isinstance(data, dict):
                    return data
                for key, value in data.items():
                    if isinstance(value, enum.Enum):
                        data[key] = value.value
                return data
    return Schema(**kwargs)


def create_all(engine):
    Base.metadata.create_all(engine)

def transact(session):
    try:
        with DB_LOCK:
            session.commit()
    except:
        logger.warning(f"Got exception in db transact. Rolling back.", exc_info=True)
        session.rollback()
        raise
    else:
        return


def get_or_create(session, model, defaults=None, **kwargs):
    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        return instance
    else:
        params = dict((k, v) for k, v in kwargs.items() if not isinstance(v, ClauseElement))
        params.update(defaults or {})
        instance = model(**params)
        session.add(instance)
        transact(session)
        return instance
