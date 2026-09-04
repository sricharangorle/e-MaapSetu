"""
Authentication and User Profile Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User
from backend.app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: str
    role: str  # 'trader', 'gatc', 'lmo'
    organization_name: Optional[str] = None
    gstin_or_license: Optional[str] = None
    designation: Optional[str] = None
    jurisdiction_district: Optional[str] = "South Delhi"
    jurisdiction_circle: Optional[str] = "Hauz Khas Circle"


class LoginRequest(BaseModel):
    username: str
    password: str


class SwitchDemoUserRequest(BaseModel):
    role: str  # 'admin', 'lmo', 'gatc', 'trader', 'public'


@router.post("/register")
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new stakeholder (Trader, GATC, LMO)"""
    existing_user = db.query(User).filter((User.username == req.username) | (User.email == req.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email is already registered")

    new_user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        phone=req.phone,
        role=req.role.lower(),
        organization_name=req.organization_name,
        gstin_or_license=req.gstin_or_license,
        designation=req.designation,
        jurisdiction_district=req.jurisdiction_district,
        jurisdiction_circle=req.jurisdiction_circle,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.username, "role": new_user.role, "uid": new_user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "organization_name": new_user.organization_name,
            "phone": new_user.phone
        }
    }


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Standard authentication endpoint"""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    token = create_access_token({"sub": user.username, "role": user.role, "uid": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "organization_name": user.organization_name,
            "designation": user.designation,
            "jurisdiction_circle": user.jurisdiction_circle,
            "phone": user.phone
        }
    }


@router.post("/switch-demo-user")
def switch_demo_user(req: SwitchDemoUserRequest, db: Session = Depends(get_db)):
    """Convenient demo switcher to effortlessly test between different stakeholder views"""
    role_map = {
        "admin": "admin",
        "lmo": "lmo_verma",
        "gatc": "gatc_apex",
        "trader": "prem_jewellers",
        "trader_petrol": "delhi_fuels",
        "trader_weighbridge": "metro_freight"
    }
    target_username = role_map.get(req.role, "admin")
    user = db.query(User).filter(User.username == target_username).first()
    if not user:
        # Fallback to any user with that role
        user = db.query(User).filter(User.role == req.role).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Demo user not found for specified role")

    token = create_access_token({"sub": user.username, "role": user.role, "uid": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "organization_name": user.organization_name,
            "designation": user.designation,
            "jurisdiction_circle": user.jurisdiction_circle,
            "phone": user.phone
        }
    }


@router.get("/me")
def get_current_profile(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "organization_name": current_user.organization_name,
        "gstin_or_license": current_user.gstin_or_license,
        "designation": current_user.designation,
        "jurisdiction_district": current_user.jurisdiction_district,
        "jurisdiction_circle": current_user.jurisdiction_circle,
        "phone": current_user.phone
    }


@router.get("/officers")
def list_officers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List officers and test centres for application scheduling and allocation"""
    officers = db.query(User).filter(User.role.in_(["lmo", "gatc"])).all()
    return [
        {
            "id": o.id,
            "name": o.full_name,
            "role": o.role.upper(),
            "designation": o.designation or o.role.upper(),
            "organization": o.organization_name or "Legal Metrology Dept",
            "circle": o.jurisdiction_circle,
            "district": o.jurisdiction_district
        }
        for o in officers
    ]
