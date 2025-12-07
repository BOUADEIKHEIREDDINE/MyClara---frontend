# main.py
from fastapi import FastAPI
from routes.db import router as db_router
from routes.auth import router as auth_router
from routes.secure_storage import router as storage_router
from contextlib import asynccontextmanager

# NOTE: La connexion à la DB est établie au démarrage (dans DBManager.__init__).
# Une fonction d'initialisation de l'application (lifespan) est bonne pratique pour FastAPI.

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Démarrage: (Ex: Charger des modèles de ML si vous en aviez, ici on ne fait rien de spécial)
    print("API en cours de démarrage...")
    yield
    # Arrêt: (Ex: Fermer des pools de connexion, ici ce n'est pas nécessaire car DBManager n'utilise pas de pool persistant)
    print("API en cours d'arrêt.")

# Création de l'application FastAPI
app = FastAPI(
    title="Myclr - API de Gestion de Fichiers Sécurisée",
    version="1.0.0",
    description="API pour l'authentification et la génération d'URL SAS pour Azure Blob Storage.",
    lifespan=lifespan
)

# 1. Ajustement des imports dans les fichiers de routes (essentiel)
# Pour que les routes fonctionnent, vous devez vous assurer que les imports sont corrects.

# Ex: Dans azureapi.zip/azureapi/routes - Copie/auth.py
# Changez : from auth_handler import registernewuser, loginuser
# En :    from ..handlers.auth_handler import register_new_user, login_user # (après avoir renommé les fonctions dans auth_handler.py pour snake_case)

# 2. Enregistrement des routes
app.include_router(auth_router)
app.include_router(storage_router)
app.include_router(db_router)

# Endpoint de base pour vérifier que l'API est en ligne
@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Bienvenue dans l'API Myclr. Accédez à /docs pour la documentation."}

# Pour le déploiement sur Azure Function/App Service, le serveur WSGI (Gunicorn/Uvicorn)
# appellera l'objet 'app'.