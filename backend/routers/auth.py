from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from rate_limiter import limiter
import database
from auth_utils import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="At least 8 characters")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


@router.post("/signup", response_model=AuthResponse)
@limiter.limit("5/minute")  # Limit to 5 signups per minute per IP
def signup(request: Request, data: SignupRequest):
    if database.get_user_by_email(data.email):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "An account with this email already exists")

    hashed = hash_password(data.password)
    user = database.create_user(data.email, hashed)
    token = create_access_token(user["id"], user["email"])
    return AuthResponse(access_token=token, email=user["email"])


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")  # Limit to 10 logins per minute per IP
def login(request: Request, data: LoginRequest):
    user = database.get_user_by_email(data.email)
    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    token = create_access_token(user["id"], user["email"])
    return AuthResponse(access_token=token, email=user["email"])


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Protected test route — confirms signup -> login -> token -> verify works end to end."""
    return current_user