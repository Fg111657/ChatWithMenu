#!/usr/bin/env python3
"""
Migration 006: My Table - Social Trust Infrastructure
Creates tables for trust-based connections (NOT social media)

Features:
- Table connections (max 10, 2-way handshake)
- Structured questions (templates only, 24h expiration)
- Safety signals (90-day expiration, source credibility)
- Trust scoring (indicators, not ratings)
- Help history (for discovery)
- Rate limiting (abuse prevention)
- Abuse reporting
"""

from sqlalchemy import create_engine, text
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_database_url():
    """Get database URL from environment or use default SQLite"""
    pg_url = os.environ.get('DATABASE_URL')
    if pg_url:
        return pg_url
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localdata.db')
    return f'sqlite:///{db_path}'

def run_migration():
    """Apply the migration"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    print(f"Running migration 006: My Table on database: {database_url}")

    with engine.connect() as conn:
        # Check if already applied
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='table_connections'"))
        if result.fetchone():
            print("✓ Migration already applied. Skipping.")
            return

        # =====================================================================
        # TABLE 1: table_connections (2-way handshake, max 10 accepted)
        # =====================================================================
        print("Creating table_connections table...")
        conn.execute(text("""
            CREATE TABLE table_connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                table_member_user_id INTEGER NOT NULL REFERENCES users(id),
                status VARCHAR(20) NOT NULL DEFAULT 'invited',
                connection_strength INTEGER NOT NULL DEFAULT 0,
                help_count INTEGER NOT NULL DEFAULT 0,
                invited_reason TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, table_member_user_id),
                CHECK(user_id != table_member_user_id)
            )
        """))

        # =====================================================================
        # TABLE 2: table_questions (structured templates, 24h expiration)
        # =====================================================================
        print("Creating table_questions table...")
        conn.execute(text("""
            CREATE TABLE table_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asker_user_id INTEGER NOT NULL REFERENCES users(id),
                restaurant_id INTEGER REFERENCES restaurants(id),
                template_id VARCHAR(50) NOT NULL,
                question_text TEXT NOT NULL,
                restriction_type VARCHAR(100),
                context_json TEXT,
                optional_note VARCHAR(200),
                visibility VARCHAR(20) NOT NULL DEFAULT 'table_only',
                status VARCHAR(20) NOT NULL DEFAULT 'open',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            )
        """))

        # =====================================================================
        # TABLE 3: table_answers (SIMPLIFIED: no marked_helpful_by_user_id)
        # =====================================================================
        print("Creating table_answers table...")
        conn.execute(text("""
            CREATE TABLE table_answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id INTEGER NOT NULL REFERENCES table_questions(id) ON DELETE CASCADE,
                answerer_user_id INTEGER NOT NULL REFERENCES users(id),
                answer_text TEXT NOT NULL,
                what_ordered VARCHAR(255),
                helpful INTEGER NOT NULL DEFAULT 0,
                helpful_marked_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        # NOTE: No unique constraint needed. API enforces:
        #   - Only asker can mark helpful (auth check)
        #   - Idempotent: if already helpful, return OK without side effects

        # =====================================================================
        # TABLE 4: safety_signals (90-day expiration, source credibility)
        # =====================================================================
        print("Creating safety_signals table...")
        conn.execute(text("""
            CREATE TABLE safety_signals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
                dish_name VARCHAR(255),
                restrictions_met TEXT NOT NULL,
                what_worked VARCHAR(100),
                notes TEXT,
                verification_state VARCHAR(30) NOT NULL DEFAULT 'unverified',
                evidence_type VARCHAR(50) NOT NULL DEFAULT 'user_experience',
                confidence INTEGER NOT NULL DEFAULT 5,
                visibility VARCHAR(20) NOT NULL DEFAULT 'table_only',
                attribution VARCHAR(20) NOT NULL DEFAULT 'attributed',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                CHECK(confidence >= 1 AND confidence <= 5)
            )
        """))

        # =====================================================================
        # TABLE 5: restaurant_trust_scores (indicators, not ratings)
        # =====================================================================
        print("Creating restaurant_trust_scores table...")
        conn.execute(text("""
            CREATE TABLE restaurant_trust_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
                restriction_type VARCHAR(50) NOT NULL,
                trust_score REAL NOT NULL DEFAULT 0.0,
                signal_count INTEGER NOT NULL DEFAULT 0,
                confidence_state VARCHAR(30) NOT NULL DEFAULT 'insufficient_data',
                last_signal_at TIMESTAMP,
                calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(restaurant_id, restriction_type),
                CHECK(trust_score >= 0.0 AND trust_score <= 1.0)
            )
        """))

        # =====================================================================
        # TABLE 6: help_history (for discovery, not social graph)
        # =====================================================================
        print("Creating help_history table...")
        conn.execute(text("""
            CREATE TABLE help_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                helped_user_id INTEGER NOT NULL REFERENCES users(id),
                helper_user_id INTEGER NOT NULL REFERENCES users(id),
                interaction_type VARCHAR(50) NOT NULL,
                question_id INTEGER REFERENCES table_questions(id),
                signal_id INTEGER REFERENCES safety_signals(id),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # =====================================================================
        # TABLE 7: rate_limits (abuse prevention)
        # =====================================================================
        print("Creating rate_limits table...")
        conn.execute(text("""
            CREATE TABLE rate_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                action_type VARCHAR(50) NOT NULL,
                count INTEGER NOT NULL DEFAULT 0,
                window_date VARCHAR(10) NOT NULL,
                UNIQUE(user_id, action_type, window_date)
            )
        """))

        # =====================================================================
        # TABLE 8: abuse_reports (reporting system)
        # =====================================================================
        print("Creating abuse_reports table...")
        conn.execute(text("""
            CREATE TABLE abuse_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reporter_user_id INTEGER NOT NULL REFERENCES users(id),
                report_type VARCHAR(50) NOT NULL,
                reason TEXT NOT NULL,
                target_type VARCHAR(50) NOT NULL,
                table_member_id INTEGER REFERENCES table_connections(id),
                question_id INTEGER REFERENCES table_questions(id),
                answer_id INTEGER REFERENCES table_answers(id),
                signal_id INTEGER REFERENCES safety_signals(id),
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP
            )
        """))

        # =====================================================================
        # INDEXES (for query performance)
        # =====================================================================
        print("Creating indexes...")

        # table_connections indexes
        conn.execute(text("CREATE INDEX idx_table_connections_user_status ON table_connections(user_id, status)"))
        conn.execute(text("CREATE INDEX idx_table_connections_strength ON table_connections(user_id, connection_strength)"))

        # table_questions indexes
        conn.execute(text("CREATE INDEX idx_table_questions_asker_status ON table_questions(asker_user_id, status, created_at)"))

        # table_answers indexes
        conn.execute(text("CREATE INDEX idx_table_answers_question ON table_answers(question_id, created_at)"))

        # safety_signals indexes
        conn.execute(text("CREATE INDEX idx_safety_signals_restaurant ON safety_signals(restaurant_id, expires_at)"))
        conn.execute(text("CREATE INDEX idx_safety_signals_user ON safety_signals(user_id, created_at)"))

        # restaurant_trust_scores indexes
        conn.execute(text("CREATE INDEX idx_trust_scores_restaurant ON restaurant_trust_scores(restaurant_id)"))

        # help_history indexes
        conn.execute(text("CREATE INDEX idx_help_history_helped ON help_history(helped_user_id, created_at)"))

        conn.commit()

    print("\n✓ Migration 006 completed successfully!")
    print("\n=== My Table Features Enabled ===")
    print("✓ Table connections (max 10, 2-way handshake)")
    print("✓ Structured questions (templates only, 24h expiration)")
    print("✓ Safety signals (90-day expiration, source credibility)")
    print("✓ Trust scoring (indicators, not star ratings)")
    print("✓ Help history (discovery via helpfulness)")
    print("✓ Rate limiting (abuse prevention)")
    print("✓ Abuse reporting system")
    print("\n=== Anti-Social Media Safeguards ===")
    print("✓ No follower counts (only accepted table members)")
    print("✓ No permanent posts (questions 24h, signals 90d)")
    print("✓ No public feeds (table_only or private visibility)")
    print("✓ No likes (only asker can mark helpful)")
    print("✓ Rate limits prevent spam")
    print("\n=== Critical Security Notes ===")
    print("⚠ API LAYER must enforce:")
    print("  - Max 10 ACCEPTED table members per user")
    print("  - invited_reason min 20 chars")
    print("  - template_id validation against ALLOWED_QUESTION_TEMPLATES")
    print("  - Only asker can mark answer helpful")
    print("  - expires_at auto-set (questions +24h, signals +90d)")
    print("  - Rate limits: invites 3/day, questions 5/day, answers 20/day, signals 10/day")
    print("  - All queries filtered by g.user_id from JWT")

def rollback_migration():
    """Rollback the migration (for development only)"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    print(f"Rolling back migration 006 on database: {database_url}")
    print("⚠ WARNING: This will delete ALL My Table data!")

    with engine.connect() as conn:
        print("Dropping tables in reverse dependency order...")
        conn.execute(text("DROP TABLE IF EXISTS abuse_reports"))
        conn.execute(text("DROP TABLE IF EXISTS rate_limits"))
        conn.execute(text("DROP TABLE IF EXISTS help_history"))
        conn.execute(text("DROP TABLE IF EXISTS restaurant_trust_scores"))
        conn.execute(text("DROP TABLE IF EXISTS safety_signals"))
        conn.execute(text("DROP TABLE IF EXISTS table_answers"))
        conn.execute(text("DROP TABLE IF EXISTS table_questions"))
        conn.execute(text("DROP TABLE IF EXISTS table_connections"))
        conn.commit()

    print("✓ Migration 006 rolled back!")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'rollback':
        rollback_migration()
    else:
        run_migration()
