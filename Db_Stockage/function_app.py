import azure.functions as func
import logging
from main import app as fastapi_app # Importe l'application FastAPI depuis main.py

# Configurez le niveau d'authentification selon vos besoins
# func.AuthLevel.ANONYMOUS est utilisé ici pour la simplicité
app = func.AsgiFunctionApp(app=fastapi_app, http_auth_level=func.AuthLevel.ANONYMOUS)

# Cette fonction agit comme le point d'entrée unique pour toutes les requêtes HTTP
# qui seront ensuite routées par l'application FastAPI.
# Le nom de la fonction est 'http_app_func' par défaut dans l'exemple Microsoft.
# Avec le modèle v2 et AsgiFunctionApp, cela est géré par l'application elle-même.
