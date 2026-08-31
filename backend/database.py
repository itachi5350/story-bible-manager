import sqlite3
import os
from datetime import datetime, timezone

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "auth_store")
DB_PATH = os.path.join(DB_DIR, "users.db")


def get_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the users table if it doesn't exist yet. Call once on startup."""
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def create_user(email: str, hashed_password: str) -> dict:
    """Insert a new user. Raises sqlite3.IntegrityError if the email is taken."""
    conn = get_connection()
    try:
        now = datetime.now(timezone.utc).isoformat()
        cursor = conn.execute(
            "INSERT INTO users (email, hashed_password, created_at) VALUES (?, ?, ?)",
            (email, hashed_password, now),
        )
        conn.commit()
        return {"id": cursor.lastrowid, "email": email, "created_at": now}
    finally:
        conn.close()


def get_user_by_email(email: str) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()