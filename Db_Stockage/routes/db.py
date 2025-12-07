# Fichier: routes/db.py (Version Améliorée)

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from handlers.db_manager import DBManager
from handlers.security_jwt import get_current_user
from models import (
    ModuleBase, ModuleCreateResponse, ModuleListResponse, Module,
    ClassBase, ClassCreateResponse, ClassListResponse, ClassByCodeResponse,
    EnrollmentBase, EnrollmentCreateResponse, EnrollmentListResponse, Enrollment,
    Class
)

# --- Initialisation (Pas de duplication de 'router = APIRouter...') ---
router = APIRouter(prefix="/db", tags=["Database & Core"])
dbmanager = DBManager()

# --- Section 1: Endpoints de Base et de Test ---
# -------------------------------------------------------------

@router.get("/ping", summary="Vérifie la connexion à la base de données")
def ping_db():
    """Tente d'établir une connexion à la DB et la ferme pour vérifier l'état."""
    try:
        # NOTE: Décommentez les lignes suivantes si dbmanager.getconnection() est opérationnel
        conn = dbmanager.getconnection()
        conn.close()
        return {"status": "OK (connexion réussie)"}
    except Exception as e:
        # Utilisation de status.HTTP_503_SERVICE_UNAVAILABLE pour une erreur de service (DB)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Erreur de connexion à la DB: {str(e)}")

@router.get("/users", summary="Liste tous les utilisateurs (pour debug)")
def list_users(current_user_id: str = Depends(get_current_user)):
    """
    Récupère la liste de tous les utilisateurs.
    NOTE: Cette route est généralement restreinte en production.
    """
    try:
        users = dbmanager.get_all_users()
        return users
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur lors de la récupération des utilisateurs: {str(e)}")

# -------------------------------------------------------------
# --- Section 2: Endpoints pour les Modules ---
# -------------------------------------------------------------

@router.post("/modules", response_model=ModuleCreateResponse, status_code=status.HTTP_201_CREATED, summary="Crée un nouveau module")
def create_module(module_data: ModuleBase, current_user_id: str = Depends(get_current_user)):
    """Crée un nouveau module, assigné à l'utilisateur authentifié."""
    try:
        # Vous utilisez current_user_id (plus propre) plutôt que de dépendre de module_data.creatorUserId
        module_id = dbmanager.create_module(
            module_name=module_data.moduleName,
            creator_user_id=current_user_id 
        )
        
        if module_id is None:
            # Erreur DB générique ou créateur invalide
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Erreur lors de l'enregistrement du module (Créateur invalide ou DB).")
            
        return ModuleCreateResponse(
            moduleId=module_id,
            moduleName=module_data.moduleName,
            success=True
        )
    except Exception as e:
        # Permet de capturer les erreurs spécifiques de la DB (e.g., contrainte)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne lors de la création du module: {str(e)}")

@router.get("/modules", response_model=ModuleListResponse, summary="Liste les modules créés par l'utilisateur courant")
# Simplification: on ne demande pas creatorUserId en paramètre si on utilise current_user_id
def list_current_user_modules(current_user_id: str = Depends(get_current_user)):
    """Liste les modules créés par l'utilisateur authentifié."""
    # Le rôle de cette fonction est de lister les modules *du current user*.
    # Si on voulait lister ceux d'un autre, il faudrait une vérification de droit plus stricte (rôle Admin).
    
    try:
        modules = dbmanager.get_modules_by_creator(current_user_id)
        
        # Le nom des variables suit la convention Python (snake_case)
        module_models = [Module(**module_data) for module_data in modules]
        
        return ModuleListResponse(
            modules=module_models,
            count=len(module_models)
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne lors de la récupération des modules: {str(e)}")

@router.get("/modules/{module_id}", response_model=Module, summary="Récupère un module par ID")
# Utilisation de snake_case pour le chemin d'URL
def get_module_by_id(module_id: int, current_user_id: str = Depends(get_current_user)):
    """Récupère un module par son ID et vérifie (optionnel) l'accès."""
    try:
        module_data = dbmanager.get_module_by_id(module_id)
        
        if not module_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module non trouvé.")
            
        # NOTE: Si vous voulez restreindre l'accès:
        # if module_data["CreatorUserID"] != current_user_id:
        #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
        
        return Module(**module_data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne lors de la récupération du module: {str(e)}")

# -------------------------------------------------------------
# --- Section 3: Endpoints pour les Classes ---
# -------------------------------------------------------------

@router.post("/classes", response_model=ClassCreateResponse, status_code=status.HTTP_201_CREATED, summary="Crée une nouvelle classe")
def create_class(class_data: ClassBase, current_user_id: str = Depends(get_current_user)):
    """Crée une nouvelle classe. L'utilisateur authentifié doit être le professeur."""
    # Vérification des droits: c'est l'utilisateur authentifié qui crée la classe
    if class_data.teacherId != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez créer une classe qu'en tant que vous-même (TeacherID doit être égal à votre ID).")
        
    try:
        # NOTE: class_data.moduleId semble être une erreur conceptuelle si vous utilisez la table class_modules (relation Many-to-Many).
        # Je retire moduleId de l'appel, en supposant que la liaison module-classe est gérée séparément.
        class_id = dbmanager.create_class(
            class_name=class_data.className,
            teacher_id=class_data.teacherId,
            enrollment_code=class_data.enrollmentCode,
        )
        
        if class_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Professeur non trouvé ou erreur de base de données.")
        if class_id == -1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Le code d'inscription existe déjà.")
            
        return ClassCreateResponse(
            classId=class_id,
            className=class_data.className,
            enrollmentCode=class_data.enrollmentCode
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne lors de la création de la classe: {str(e)}")

@router.get("/classes", response_model=ClassListResponse, summary="Liste les classes ou recherche par code d'inscription")
def list_or_get_classes(
    teacher_id: Optional[str] = Query(None, description="ID du professeur pour lister ses classes."), 
    enrollment_code: Optional[str] = Query(None, description="Code d'inscription pour récupérer une classe spécifique."),
    current_user_id: str = Depends(get_current_user)
):
    """Gère la liste des classes d'un professeur ou la récupération d'une classe par code d'inscription."""
    
    if teacher_id:
        # Vérification des droits
        if teacher_id != current_user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé aux classes d'un autre professeur.")
            
        classes = dbmanager.get_classes_by_teacher(teacher_id)
        class_models = [Class(**c) for c in classes]
        return ClassListResponse(classes=class_models, count=len(class_models))
        
    elif enrollment_code:
        class_data = dbmanager.get_class_by_enrollment_code(enrollment_code)
        
        if not class_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classe non trouvée avec ce code d'inscription.")
            
        # Retourne le modèle simplifié (ClassByCodeResponse)
        return ClassByCodeResponse(
            ClassID=class_data["ClassID"],
            ClassName=class_data["ClassName"],
            EnrollmentCode=class_data["EnrollmentCode"]
        )
        
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Veuillez fournir soit 'teacher_id' soit 'enrollment_code'.")

# -------------------------------------------------------------
# --- Section 4: Endpoints pour les Inscriptions (Enrollments) ---
# -------------------------------------------------------------

@router.post("/enrollments", response_model=EnrollmentCreateResponse, status_code=status.HTTP_201_CREATED, summary="Inscrit l'utilisateur courant à une classe")
def enroll_in_class(enrollment_data: EnrollmentBase, current_user_id: str = Depends(get_current_user)):
    """Inscrit l'utilisateur authentifié à la classe spécifiée."""
    
    # 1. Assurez-vous que l'utilisateur authentifié est bien l'étudiant qui s'inscrit
    if enrollment_data.studentId != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Vous ne pouvez inscrire que vous-même."
        )
        
    try:
        # 2. Appel de la fonction DB avec le nouveau paramètre enrollment_code
        enrollment_id = dbmanager.create_enrollment(
            class_id=enrollment_data.classId,
            student_id=enrollment_data.studentId,
            enrollment_code=enrollment_data.enrollment_code # <-- PASSAGE DU CODE
        )
        
        # 3. Gestion des codes de retour du DB Manager
        
        # Le code était None (DB ou Classe/Étudiant non trouvé, ou autre erreur SQL)
        if enrollment_id is None:
            # L'erreur de votre dbmanager est "Erreur SQL lors de la création de l'inscription"
            # Un 500 est plus approprié ici si c'est une erreur DB, mais 400 si c'est l'ID non trouvé.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Échec de l'inscription: Classe, Étudiant ou Code Invalide."
            )
            
        # L'inscription existe déjà
        if enrollment_id == -1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, 
                detail="L'étudiant est déjà inscrit à cette classe."
            )

        # Nouveau: Le code d'inscription fourni est incorrect
        if enrollment_id == -2:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, # Ou 400 Bad Request
                detail="Code d'inscription (enrollment_code) incorrect pour cette classe."
            )
            
        # Succès de l'inscription
        return EnrollmentCreateResponse(
            enrollmentId=enrollment_id,
            classId=enrollment_data.classId,
            studentId=enrollment_data.studentId
        )
        
    except HTTPException:
        # Permet de re-lever les HTTPException gérées ci-dessus
        raise
        
    except Exception as e:
        # Pour toute autre erreur inattendue (ex: problème de connexion DB non géré par le try/except interne)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Erreur interne lors de l'inscription: {str(e)}"
        )
        
        
@router.get("/enrollments", response_model=EnrollmentListResponse, summary="Liste les inscriptions de l'utilisateur courant")
def list_student_enrollments(student_id: str = Query(..., description="ID de l'étudiant dont on veut lister les inscriptions."), current_user_id: str = Depends(get_current_user)):
    """Liste les inscriptions de l'utilisateur authentifié."""
    # Vérification des droits: seul l'étudiant peut voir ses inscriptions
    if student_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé aux inscriptions d'un autre étudiant.")
        
    try:
        enrollments = dbmanager.get_enrollments_by_student(student_id)
        
        enrollment_models = [Enrollment(**e) for e in enrollments]
        
        return EnrollmentListResponse(
            enrollments=enrollment_models,
            count=len(enrollment_models)
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne lors de la récupération des inscriptions: {str(e)}")