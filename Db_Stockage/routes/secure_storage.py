from fastapi import APIRouter, HTTPException,Depends
from handlers.secure_storage_handler import (
    generate_secure_upload_url,
    generate_secure_download_url,
    get_user_file_list,
    handle_transformed_file
)
from handlers.security_jwt import get_current_user
router = APIRouter(prefix="/storage", tags=["storage"])


@router.post("/upload-url")
def create_upload_url(
    original_filename: str, 
    filesize: int, 
    filetype: str, 
    modulename: str,
    # L'ID utilisateur est injecté ici après validation du JWT
    owner_user_id: str = Depends(get_current_user)
):
    # L'ancienne route demandait owner_user_id en paramètre URL, maintenant il est extrait du token
    # Les anciennes routes doivent être modifiées pour retirer owner_user_id des paramètres de l'URL
    result = generate_secure_upload_url(owner_user_id, original_filename, filesize, filetype, modulename)
    if not result:
        raise HTTPException(status_code=500, detail="URL d'upload non générée")
    return result

@router.get("/download-url/{fileuuid}")
def create_download_url(fileuuid: str, owner_user_id: str = Depends(get_current_user)):
    result = generate_secure_download_url(fileuuid, owner_user_id) 
    if not result:
        raise HTTPException(status_code=403, detail="Accès refusé ou fichier non trouvé") # 403 est mieux pour l'accès refusé
    return result

@router.get("/user-files") # URL sans ID utilisateur dans le path
def list_user_files(owner_user_id: str = Depends(get_current_user)):
    return get_user_file_list(owner_user_id)

@router.post("/handle-transform")
def create_transformed_file(
    parentfileuuid: str, transformedfilename: str, transformedfilesize: int,
    transformedfiletype: str, transformationcategory: str,
    owner_user_id: str = Depends(get_current_user) # L'utilisateur doit être connecté
):
    # Le handler (handle_transformed_file) doit être modifié pour accepter owner_user_id
    # et vérifier que l'utilisateur a le droit de transformer le parentfileuuid.
    return handle_transformed_file(owner_user_id, parentfileuuid, transformedfilename, transformedfilesize, transformedfiletype, transformationcategory)