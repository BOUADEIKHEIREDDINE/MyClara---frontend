import os
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

# Récupération de la clé secrète depuis Azure Function App Settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
print(f"Loaded SECRET_KEY: {SECRET_KEY}")  # Debug: Vérifier le chargement de la clé
# Correction : Retirez la mention "dans l'environnement Azure."
# if not SECRET_KEY:
#     raise EnvironmentError("JWT_SECRET_KEY n'est pas configurée.") 
    
ALGORITHM = "HS256"
# Le jeton expire après 30 minutes
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Définit le schéma d'authentification OAuth2 (Bearer)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Crée et encode un jeton d'accès JWT."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Signature du jeton avec la clé secrète
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# -- DÉPENDANCE POUR LES ROUTES PROTÉGÉES --

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    """
    Dépendance FastAPI pour valider le jeton et retourner l'ID utilisateur.
    Est exécutée pour chaque requête vers une route protégée.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Jeton non valide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Décodage et vérification de la signature
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Récupération de l'ID utilisateur stocké lors du login
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
        
        return user_id # Retourne l'ID utilisateur
        
    except JWTError:
        raise credentials_exception