from fastapi import APIRouter, HTTPException
from handlers.auth_handler import register_new_user, loginuser

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
def register_user(username: str, email: str, password: str, usertype: str):
    result = register_new_user(username, email, password, usertype)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/login")
def login_user(email: str, password: str):
    result = loginuser(email, password)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result
