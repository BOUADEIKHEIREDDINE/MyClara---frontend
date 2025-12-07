import os
import uuid
from datetime import datetime, timedelta

from azure.storage.blob import BlobSasPermissions, BlobServiceClient, generate_blob_sas

# from dotenv import load_dotenv, find_dotenv
from .db_manager import DBManager  # Import de notre classe de gestion de DB

# load_dotenv(find_dotenv('config.env'))

# --- CONFIGURATION AZURE ---
ACCOUNT_NAME = os.getenv('AZURE_STORAGE_ACCOUNT_NAME')
ACCOUNT_KEY = os.getenv('AZURE_STORAGE_ACCOUNT_KEY')
CONTAINER_NAME = os.getenv('AZURE_CONTAINER_NAME', 'myclr') # Utiliser 'myclr' par défaut

# --- INITIALISATION ---
db_manager = DBManager()

def get_blob_service_client():
    """Retourne le client BlobServiceClient."""
    connect_str = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
    if not connect_str:
        raise ValueError("AZURE_STORAGE_CONNECTION_STRING non définie.")
    return BlobServiceClient.from_connection_string(connect_str)

def generate_secure_upload_url(owner_user_id: str, original_filename: str, file_size: int, file_type: str,module_name: str) -> dict | None:
    """
    Génère une URL d'upload sécurisée (SAS) et enregistre le fichier dans la base de données.
    Le fichier est initialement considéré comme 'RAW'.
    """
    print(f"\n--- Demande d'URL d'upload pour l'utilisateur '{owner_user_id}' ---")
    
    # Simuler un dossier de stockage par utilisateur dans Azure
    storage_folder = f"user_{owner_user_id}" 
    
    try:
        # 1. Préparer les noms de fichiers et BlobName
        file_extension = os.path.splitext(original_filename)[1]
        file_uuid = uuid.uuid4()
        # Nouvelle structure de nom de blob : user_{UserID}/FileUUID.extension
        unique_blob_name = f"{storage_folder}/{file_uuid}{file_extension}"
        
        # 2. Enregistrer le fichier dans la base de données AVANT de générer l'URL
        # Ceci "réserve" le nom du fichier dans notre système.
        file_record_success = db_manager.create_file_record(
            file_uuid=str(file_uuid),
            owner_user_id=owner_user_id,
            original_filename=original_filename,
            blob_name=unique_blob_name,
            file_size=file_size,
            file_type=file_type,
            file_category='RAW',# Le fichier initial est toujours RAW
            module_name= module_name
        )
        
        if not file_record_success:
            raise Exception("Échec de la création de l'enregistrement en base de données.")

        # 3. Générer l'URL SAS pour Azure Blob Storage
        if not all([ACCOUNT_NAME, ACCOUNT_KEY]):
            raise ValueError("Clés du compte de stockage Azure introuvables.")

        sas_token = generate_blob_sas(
            account_name=ACCOUNT_NAME,
            container_name=CONTAINER_NAME,
            blob_name=unique_blob_name,
            account_key=ACCOUNT_KEY,
            # Permissions: Create (c) et Write (w)
            permission=BlobSasPermissions(create=True, write=True),
            expiry=datetime.utcnow() + timedelta(minutes=30)
        )
        
        upload_url = f"https://{ACCOUNT_NAME}.blob.core.windows.net/{CONTAINER_NAME}/{unique_blob_name}?{sas_token}"
        
        print(f"✅ [Azure] URL d'upload générée pour le blob : {unique_blob_name}")
        
        return {
            "file_uuid": str(file_uuid),
            "blob_name": unique_blob_name,
            "upload_url": upload_url
        }

    except Exception as ex:
        print(f"❌ Erreur lors de la génération de l'URL d'upload: {ex}")
        return None

def generate_secure_download_url(fileuuid: str, owner_user_id: str) -> dict | None:
    """
    Vérifie l'appartenance du fichier via owner_user_id et génère l'URL SAS.
    """
    try:
        # 1. Récupérer les infos du fichier (y compris l'ID du propriétaire)
        conn = db_manager._get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # AJOUT CRITIQUE : on récupère OwnerUserID pour la vérification
        select_query = "SELECT BlobName, OwnerUserID FROM Files WHERE FileUUID = %s" 
        cursor.execute(select_query, (fileuuid,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close() 
        
        if not result:
            print(f"❌ Fichier avec UUID {fileuuid} non trouvé en base de données.")
            return None
            
        # 2. VÉRIFICATION D'APPARTENANCE
        # Si l'ID de l'utilisateur qui fait la requête ne correspond pas au propriétaire
        if result['OwnerUserID'] != owner_user_id:
            print(f"❌ Téléchargement refusé : L'utilisateur {owner_user_id} n'est pas le propriétaire de {fileuuid}.")
            # Cela retournera None, et la route FastAPI lèvera un 403 (Accès refusé)
            return None 

        # 3. Générer l'URL SAS de lecture (votre logique Azure Storage)
        blob_name = result['BlobName']
        
        if not all([ACCOUNT_NAME, ACCOUNT_KEY]):
             # Cette erreur est capturée par le 'try/except'
            raise ValueError("Clés du compte de stockage Azure introuvables.")

        sas_token = generate_blob_sas(
            account_name=ACCOUNT_NAME,
            container_name=CONTAINER_NAME,
            blob_name=blob_name,
            account_key=ACCOUNT_KEY,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(minutes=30)
        )
        
        download_url = f"https://{ACCOUNT_NAME}.blob.core.windows.net/{CONTAINER_NAME}/{blob_name}?{sas_token}"
        
        print(f"✅ [Azure] URL de téléchargement générée pour le blob : {blob_name}")
        
        return {
            "file_uuid": fileuuid,
            "blob_name": blob_name,
            "download_url": download_url
        }

    except Exception as ex:
        print(f"❌ Erreur lors de la génération de l'URL de téléchargement: {ex}")
        return None

def get_user_file_list(owner_user_id: str) -> dict:
    """
    Récupère et organise la liste des fichiers de l'utilisateur, en liant les fichiers transformés
    à leurs fichiers RAW d'origine.
    """
    all_files = db_manager.get_user_files(owner_user_id)
    
    # Dictionnaire pour stocker les fichiers RAW et leurs enfants
    file_tree = {}
    
    # Dictionnaire pour un accès rapide aux fichiers par UUID
    files_by_uuid = {file['FileUUID']: file for file in all_files}
    
    for file in all_files:
        file['children'] = [] # Ajoute une liste pour les fichiers transformés
        
        # Si c'est un fichier RAW, il devient une clé dans l'arbre
        if file['FileCategory'] == 'RAW':
            file_tree[file['FileUUID']] = file
        
        # Si c'est un fichier transformé, on essaie de le lier à son parent
        elif file['FileCategory'] != 'RAW' and file['ParentFileUUID']:
            parent_uuid = file['ParentFileUUID']
            if parent_uuid in files_by_uuid:
                # Ajoute ce fichier à la liste des enfants du parent
                files_by_uuid[parent_uuid]['children'].append(file)
            else:
                # Cas où le parent n'est pas dans la liste (ex: parent supprimé)
                print(f"Avertissement: Fichier transformé {file['FileUUID']} a un parent {parent_uuid} introuvable.")
                
    # Retourne uniquement les fichiers RAW (qui contiennent maintenant leurs enfants)
    return list(file_tree.values())

def handle_transformed_file(parent_file_uuid, transformed_filename, transformed_filesize, transformed_filetype, transformation_category):
    """
    Gère la création d'un fichier transformé (ex: résumé, quiz).
    """
    db = DBManager()
    
    # 1. Récupérer les détails du fichier parent pour hériter des informations
    parent_file = db.get_file_details(parent_file_uuid) # Vous devez créer cette fonction
    if not parent_file:
        raise ValueError("Fichier parent introuvable.")
        
    # 2. HÉRITAGE DU NOM DU MODULE
    module_name_to_inherit = parent_file['Modul_Name']
    owner_user_id = parent_file['OwnerUserID']
    
    # ... (générer un nouvel UUID et blob_name pour le fichier transformé)
    new_file_uuid = str(uuid.uuid4())
    new_blob_name = f"{owner_user_id}/{new_file_uuid}/{transformed_filename}"
    
    # 3. Créer l'enregistrement pour le fichier transformé
    db.create_file_record(
        file_uuid=new_file_uuid,
        owner_user_id=owner_user_id,
        original_filename=transformed_filename,
        blob_name=new_blob_name,
        file_size=transformed_filesize,
        file_type=transformed_filetype,
        file_category=transformation_category, # ex: 'SUMMARY', 'QUIZ'
        module_name=module_name_to_inherit, # <-- HÉRITAGE
        parent_file_uuid=parent_file_uuid
    )