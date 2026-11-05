"""
Database connection setup using SQLAlchemy.
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./credchain.db")

# For SQLite, we need connect_args to allow multi-threaded access
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables in the database."""
    from app.database.models import CreditAssessment, LoanRecord, UserProfile  # noqa: F401

    Base.metadata.create_all(bind=engine)


def ensure_columns():
    """Add columns that exist in the models but are missing from an older database file.

    ``create_all`` creates missing tables but never alters existing ones, so a
    database created before the integrity fields were added would otherwise fail
    on the first query that selects them. Only nullable columns are added.
    """
    from sqlalchemy import inspect, text

    from app.database.models import CreditAssessment

    inspector = inspect(engine)
    if CreditAssessment.__tablename__ not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns(CreditAssessment.__tablename__)}
    with engine.begin() as conn:
        for column in CreditAssessment.__table__.columns:
            if column.name in existing or column.primary_key:
                continue
            col_type = column.type.compile(dialect=engine.dialect)
            conn.execute(text(f'ALTER TABLE {CreditAssessment.__tablename__} ADD COLUMN "{column.name}" {col_type}'))


def create_schema():
    """Create missing tables and add missing columns."""
    Base.metadata.create_all(bind=engine)
    ensure_columns()
