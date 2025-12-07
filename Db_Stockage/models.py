from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- Modèles pour les Modules ---

class ModuleBase(BaseModel):
    """Schéma de base pour la création d'un module."""
    moduleName: str
    creatorUserId: str # L'ID utilisateur est un UUID/str

class Module(BaseModel):
    """Schéma complet d'un module pour les réponses GET."""
    ModuleID: int
    ModuleName: str
    CreatorUserID: str
    CreatedAt: datetime

class ModuleCreateResponse(BaseModel):
    """Schéma de réponse pour la création d'un module."""
    moduleId: int
    moduleName: str
    success: bool

class ModuleListResponse(BaseModel):
    """Schéma de réponse pour la liste des modules."""
    modules: List[Module]
    count: int

# --- Modèles pour les Classes ---

class ClassBase(BaseModel):
    """Schéma de base pour la création d'une classe."""
    className: str
    teacherId: str # L'ID utilisateur est un UUID/str
    enrollmentCode: str
    moduleId: int

class Class(BaseModel):
    """Schéma complet d'une classe pour les réponses GET."""
    ClassID: int
    ClassName: str
    TeacherID: str
    EnrollmentCode: str
    CreatedAt: datetime
    ModuleID: int
    TeachingModuleName: Optional[str] = None 

class ClassCreateResponse(BaseModel):
    """Schéma de réponse pour la création d'une classe."""
    classId: int
    className: str
    enrollmentCode: str

class ClassByCodeResponse(BaseModel):
    """Schéma de réponse pour la recherche d'une classe par code d'inscription."""
    ClassID: int
    ClassName: str
    EnrollmentCode: str

class ClassListResponse(BaseModel):
    """Schéma de réponse pour la liste des classes."""
    classes: List[Class]
    count: int

# --- Modèles pour les Inscriptions (Enrollments) ---

class EnrollmentBase(BaseModel):
    """Schéma de base pour l'inscription d'un étudiant à une classe."""
    classId: int
    studentId: str # L'ID utilisateur est un UUID/str
    enrollment_code: str

class Enrollment(BaseModel):
    """Schéma complet d'une inscription pour les réponses GET."""
    EnrollmentID: int
    ClassID: int
    StudentID: str

class EnrollmentCreateResponse(BaseModel):
    """Schéma de réponse pour la création d'une inscription."""
    enrollmentId: int
    classId: int
    studentId: str

class EnrollmentListResponse(BaseModel):
    """Schéma de réponse pour la liste des inscriptions."""
    enrollments: List[Enrollment]
    count: int