# auth_handler.py
import bcrypt
from .db_manager import DBManager
from .security_jwt import create_access_token

# Initialiser une instance du DBManager pour être utilisée par les fonctions
db_manager = DBManager()

def register_new_user(username: str, email: str, password: str, user_type: str) -> dict:
    """
    Inscrit un nouvel utilisateur en hachant son mot de passe.
    Retourne un dictionnaire avec le statut du succès.
    """
    print(f"--- Tentative d'inscription pour l'email : {email} ---")
    
    if db_manager.get_user_by_email(email):
        return {"success": False, "message": "Cette adresse email est déjà utilisée."}

    try:
        # Hachage sécurisé du mot de passe
        password_bytes = password.encode('utf-8')
        hashed_password_bytes = bcrypt.hashpw(password_bytes, bcrypt.gensalt(rounds=12))
        hashed_password_str = hashed_password_bytes.decode('utf-8')

        # Création de l'utilisateur en base de données
        user_id = db_manager.create_user(
            username=username,
            email=email,
            hashed_password=hashed_password_str,
            user_type=user_type
        )

        if user_id:
            print(f"✅ Succès de l'inscription pour {email}.")
            return {"success": True, "user_id": user_id}
        else:
            raise Exception("L'insertion en base de données a échoué.")

    except Exception as e:
        print(f"❌ Erreur critique lors de l'inscription : {e}")
        return {"success": False, "message": f"Une erreur interne est survenue."}


def loginuser(email: str, password: str) -> dict:
    """
    Vérifie les identifiants d'un utilisateur et le connecte.
    Retourne un dictionnaire avec le statut du succès et les données de l'utilisateur.
    """
    print(f"--- Tentative de connexion pour l'email : {email} ---")
    
    # 1. Trouver l'utilisateur par email
    user_record = db_manager.get_user_by_email(email)
    if not user_record:
        print("❌ Échec de la connexion : email non trouvé.")
        return {"success": False, "message": "Email ou mot de passe incorrect."}

    # 2. Vérifier le mot de passe
    password_fourni_bytes = password.encode('utf-8')
    hash_stocke_bytes = user_record['PasswordHash'].encode('utf-8')

    if bcrypt.checkpw(password_fourni_bytes, hash_stocke_bytes):
        # Authentification réussie !
        print(f"✅ Succès de la connexion pour {email}.")
        # Le jeton stocke l'ID utilisateur, qui sera utilisé par les routes protégées
        access_token = create_access_token(
            data={"sub": user_record['Email'], "user_id": user_record['UserID']}
        )
        
        return {
            "success": True,
            "access_token": access_token, 
            "token_type": "bearer",
            "username": user_record['Username']    }
    else:
        # Mot de passe incorrect
        print("❌ Échec de la connexion : mot de passe incorrect.")
        return {"success": False, "message": "Email ou mot de passe incorrect."}
