import os
from datetime import datetime, timedelta, timezone

import bcrypt  #used for password hashing
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import database

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

if not JWT_SECRET:
    JWT_SECRET = "dev-only-insecure-secret-change-me"
    print(
        "WARNING: JWT_SECRET_KEY is not set. Using an insecure dev default — "
        "set it in .env (and in Render's env vars before deploying)."
    )

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: int, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Returns the payload, or raises a jwt.PyJWTError subclass if invalid/expired."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Drop into any route with `current_user: dict = Depends(get_current_user)`.
    Only wired into /auth/me for now — Phase B applies it to
    ingest/query/chapters/etc. and scopes storage by user_id.
    """
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please sign in again")
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid authentication token")

    user = database.get_user_by_id(int(payload["sub"]))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")

    return {"id": user["id"], "email": user["email"]}