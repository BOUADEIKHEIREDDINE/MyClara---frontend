import os
import uuid
# from dotenv import load_dotenv, find_dotenv
import mysql.connector
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from typing import List, Dict, Any, Optional

# Charger les variables d'environnement (ex: .env)
# load_dotenv(find_dotenv('.env'))

class DBManager:
    """
    Gère la connexion et les opérations de base de données MySQL
    en utilisant SQLAlchemy pour une gestion de connexion robuste.
    """
    def __init__(self):
        db_url = os.getenv("DATABASE_URL")
        
        if not db_url:
            raise ValueError("La variable d'environnement DATABASE_URL est manquante dans le fichier .env.")

        # Créer un "engine" SQLAlchemy. C'est lui qui gère la connexion.
        # NullPool est utilisé pour s'assurer que chaque opération prend une nouvelle connexion,
        # ce qui est plus sûr pour les applications de bureau et les scripts.
        try:
            self.engine = create_engine(db_url, poolclass=NullPool)
        except ImportError:
            raise ImportError("SQLAlchemy n'est pas installé. Exécutez : pip install SQLAlchemy")
        except Exception as e:
            raise ConnectionError(f"Erreur lors de la création du moteur de connexion SQLAlchemy: {e}")

    def _get_connection(self):
        """Établit et retourne une nouvelle connexion à la base de données via l'engine."""
        try:
            # L'engine gère tous les détails complexes de la connexion, y compris 'allow_public_key_retrieval'.
            conn = self.engine.raw_connection()
            return conn
        except mysql.connector.Error as err:
            print(f"Erreur de connexion MySQL: {err}")
            # Cette erreur est souvent celle que l'utilisateur voit, il faut être clair.
            if "Access denied" in str(err):
                raise ConnectionError("Accès refusé. Vérifiez l'utilisateur, le mot de passe et l'hôte dans DATABASE_URL.")
            if "Unknown database" in str(err):
                raise ConnectionError("La base de données n'existe pas. Vérifiez le nom de la base dans DATABASE_URL.")
            raise ConnectionError(f"Erreur de connexion MySQL non gérée: {err}")
        except Exception as e:
            # Capture les erreurs liées à SQLAlchemy (ex: URL mal formée)
            raise ConnectionError(f"Erreur lors de la tentative de connexion via l'engine: {e}")

    def create_user(self, username: str, email: str, hashed_password: str, user_type: str) -> str | None:
        """
        Crée un nouvel utilisateur avec un UUID généré et un mot de passe haché.
        Retourne le nouvel UserID en cas de succès, sinon None.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            user_id = str(uuid.uuid4())
            query = "INSERT INTO Users (UserID, Username, Email, PasswordHash, UserType) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(query, (user_id, username, email, hashed_password, user_type))
            conn.commit()
            return user_id
        except mysql.connector.IntegrityError: # Se produit si l'email est déjà utilisé
            conn.rollback()
            return None
        finally:
            cursor.close()
            conn.close()

    def get_user_by_email(self, email: str) -> dict | None:
        """
        Récupère un utilisateur complet (y compris son mot de passe haché) par son email.
        """
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM Users WHERE Email = %s", (email,))
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()
    
    def get_all_users(self) -> list[dict]:
        """
        Récupère tous les utilisateurs enregistrés dans la table Users.
        """
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True) # Retourne les résultats sous forme de dictionnaires
        try:
            # Note: Il est courant de ne pas récupérer le PasswordHash dans les requêtes de listing
            cursor.execute("SELECT UserID, Username, Email, UserType FROM Users")
            return cursor.fetchall()
        except Exception as e:
            # Vous pouvez logguer l'erreur ou la relancer selon votre stratégie
            raise Exception(f"Erreur SQL lors de la récupération des utilisateurs: {e}")
        finally:
            cursor.close()
            conn.close()
    
    # Mettez à jour la signature et la requête SQL
    def create_file_record(self, file_uuid, owner_user_id, original_filename, blob_name, file_size, file_type, file_category, module_name, parent_file_uuid=None):
        """Insère un nouvel enregistrement de fichier dans la table Files."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Ajout de Modul_Name dans la requête
        insert_query = """
            INSERT INTO Files (FileUUID, OwnerUserID, OriginalFilename, BlobName, FileSize, FileType, FileCategory, ParentFileUUID, Modul_Name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        try:
            cursor.execute(insert_query, (
                file_uuid, 
                owner_user_id, 
                original_filename, 
                blob_name, 
                file_size, 
                file_type, 
                file_category, 
                parent_file_uuid,
                module_name  # <-- NOUVELLE VALEUR
            ))
            conn.commit()
            return True
        # ... (gestion des erreurs)
        finally:
            cursor.close()
            conn.close()

    # Vous aurez besoin de cette nouvelle fonction pour l'héritage
    def get_file_details(self, file_uuid):
        """Récupère les détails d'un fichier, y compris OwnerUserID."""
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        query = "SELECT OwnerUserID, BlobName FROM Files WHERE FileUUID = %s"
        try:
            cursor.execute(query, (file_uuid,))
            return cursor.fetchone() # Retourne un dictionnaire avec les détails ou None
        finally:
            cursor.close()
            conn.close()


    def get_user_files(self, owner_user_id):
        """Récupère la liste des fichiers pour un utilisateur donné."""
        conn = self._get_connection()
        # dictionary=True est très pratique pour l'UI
        cursor = conn.cursor(dictionary=True)
        
        query = "SELECT * FROM Files WHERE OwnerUserID = %s ORDER BY UploadedAt DESC"
        
        try:
            cursor.execute(query, (owner_user_id,))
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    
    def add_user(self, username, email, password_hash):
        """Ajoute un nouvel utilisateur."""
        conn = self._get_connection()
        cursor = conn.cursor()
        user_id = str(uuid.uuid4())
        
        query = "INSERT INTO Users (UserID, Username, Email, PasswordHash) VALUES (%s, %s, %s, %s)"
        try:
            cursor.execute(query, (user_id, username, email, password_hash))
            conn.commit()
            return user_id
        except mysql.connector.IntegrityError:
            # Gérer le cas où l'utilisateur existe déjà
            conn.rollback()
            cursor.execute("SELECT UserID FROM Users WHERE Email = %s", (email,))
            result = cursor.fetchone()
            return result[0] if result else None
        finally:
            cursor.close()
            conn.close()
    def create_module(self, module_name: str, creator_user_id: str) -> Optional[int]:
        """Crée un nouveau module et retourne son ID."""
        conn = self._get_connection()
        # Utilisez cursor() sans argument pour les requêtes INSERT/UPDATE/DELETE
        cursor = conn.cursor() 
        try:
            # Vérification simple de l'existence de l'utilisateur (facultatif mais recommandé)
            # if not self.get_user_by_id(creator_user_id):
            #     return None # Utilisateur non trouvé
                
            query = "INSERT INTO modules (ModuleName, CreatorUserID) VALUES (%s, %s)"
            cursor.execute(query, (module_name, creator_user_id))
            conn.commit()
            # Récupère l'ID auto-incrémenté du module inséré
            return cursor.lastrowid 
        except mysql.connector.Error as err:
            conn.rollback()
            print(f"Erreur SQL lors de la création du module: {err}")
            return None
        finally:
            cursor.close()
            conn.close()

    def get_modules_by_creator(self, creator_user_id: str) -> List[Dict[str, Any]]:
        """Récupère les modules créés par un utilisateur."""
        conn = self._get_connection()
        # Utilisez cursor(dictionary=True) pour récupérer les résultats sous forme de dictionnaires
        cursor = conn.cursor(dictionary=True) 
        try:
            query = "SELECT ModuleID, ModuleName, CreatorUserID, CreatedAt FROM modules WHERE CreatorUserID = %s"
            cursor.execute(query, (creator_user_id,))
            return cursor.fetchall()
        except mysql.connector.Error as err:
            print(f"Erreur SQL lors de la récupération des modules: {err}")
            return []
        finally:
            cursor.close()
            conn.close()

    def get_module_by_id(self, module_id: int) -> Optional[Dict[str, Any]]:
        """Récupère un module par son ID."""
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            query = "SELECT ModuleID, ModuleName, CreatorUserID, CreatedAt FROM modules WHERE ModuleID = %s"
            cursor.execute(query, (module_id,))
            return cursor.fetchone()
        except mysql.connector.Error as err:
            print(f"Erreur SQL lors de la récupération du module: {err}")
            return None
        finally:
            cursor.close()
            conn.close()

    # --- Fonctions pour les Classes ---

    def create_class(self, class_name: str, teacher_id: str, enrollment_code: str, module_id: int) -> Optional[int]:
        """Crée une nouvelle classe et retourne son ID."""
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            # 1. Vérifier l'unicité du code d'inscription
            cursor.execute("SELECT ClassID FROM classes WHERE EnrollmentCode = %s", (enrollment_code,))
            if cursor.fetchone():
                return -1 # Code spécial pour indiquer que le code existe déjà

            # 2. Insérer la nouvelle classe
            insert_query = "INSERT INTO classes (ClassName, TeacherID, EnrollmentCode, ModuleID) VALUES (%s, %s, %s, %s)"
            cursor.execute(insert_query, (class_name, teacher_id, enrollment_code, module_id))
            conn.commit()
            return cursor.lastrowid
        except mysql.connector.Error as err:
            conn.rollback()
            print(f"Erreur SQL lors de la création de la classe: {err}")
            return None
        finally:
            cursor.close()
            conn.close()

    def get_classes_by_teacher(self, teacher_id: str) -> List[Dict[str, Any]]:
        """Récupère les classes d'un enseignant, avec le nom du module (jointure)."""
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            # Jointure pour récupérer le nom du module (TeachingModuleName)
            query = """
                SELECT 
                    c.ClassID, c.ClassName, c.TeacherID, c.EnrollmentCode, c.CreatedAt, c.ModuleID,
                    m.ModuleName AS TeachingModuleName
                FROM classes c
                JOIN modules m ON c.ModuleID = m.ModuleID
                WHERE c.TeacherID = %s
            """
            cursor.execute(query, (teacher_id,))
            return cursor.fetchall()
        except mysql.connector.Error as err:
            print(f"Erreur SQL lors de la récupération des classes: {err}")
            return []
        finally:
            cursor.close()
            conn.close()

    def get_class_by_enrollment_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Récupère une classe par son code d'inscription."""
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            # On ne sélectionne que les champs nécessaires pour l'inscription
            query = "SELECT ClassID, ClassName, EnrollmentCode FROM classes WHERE EnrollmentCode = %s"
            cursor.execute(query, (code,))
            return cursor.fetchone()
        except mysql.connector.Error as err:
            print(f"Erreur SQL lors de la récupération de la classe par code: {err}")
            return None
        finally:
            cursor.close()
            conn.close()

    # --- Fonctions pour les Inscriptions (Enrollments) ---

    def create_enrollment(self, class_id: int, student_id: str, enrollment_code: str) -> Optional[int]:
        """
        Inscrit un étudiant à une classe après avoir vérifié le code de la classe 
        et retourne l'ID d'inscription.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 1. Vérifier si l'inscription existe déjà
            check_enrollment_query = "SELECT EnrollmentID FROM enrollments WHERE ClassID = %s AND StudentID = %s"
            cursor.execute(check_enrollment_query, (class_id, student_id))
            if cursor.fetchone():
                return -1 # L'inscription existe déjà

            # 2. Récupérer le code de la classe réelle (ClassID) pour vérification.
            # ATTENTION: Si votre colonne dans 'classes' s'appelle 'ClassID' et
            # contient le code, c'est ce que vous récupérez. 
            # S'il y a une colonne 'EnrollmentCode', utilisez plutôt 'EnrollmentCode'.
            
            # Ici, nous supposons qu'une colonne 'EnrollmentCode' existe dans la table 'classes'.
            # Si le code est stocké dans 'ClassID' (moins probable, mais possible) :
            code_query = "SELECT EnrollmentCode FROM classes WHERE ClassID = %s" 
            # Ou, si c'est un code dédié (plus probable):
            # code_query = "SELECT EnrollmentCode FROM classes WHERE ClassID = %s"
            
            cursor.execute(code_query, (class_id,))
            class_info = cursor.fetchone()

            if not class_info:
                # La classe n'existe pas
                print(f"Erreur: La classe avec l'ID {class_id} n'existe pas.")
                return None 

            real_code = str(class_info[0]) # Récupère la valeur du code (première colonne)

            # 3. Comparer le code fourni par l'utilisateur avec le code réel
            if real_code != enrollment_code:
                print(f"Erreur: Code d'inscription invalide fourni. Reçu: {enrollment_code}, Attendu: {real_code}")
                return -2 # Code spécial pour indiquer que le code est incorrect

            # 4. Si la vérification est réussie, insérer la nouvelle inscription
            insert_query = "INSERT INTO enrollments (ClassID, StudentID) VALUES (%s, %s)"
            cursor.execute(insert_query, (class_id, student_id))
            
            conn.commit()
            return cursor.lastrowid
            
        except mysql.connector.Error as err:
            conn.rollback()
            print(f"Erreur SQL lors de la création de l'inscription: {err}")
            return None
            
        finally:
            cursor.close()
            conn.close()

    def get_enrollments_by_student(self, student_id: str) -> List[Dict[str, Any]]:
        """Récupère les inscriptions d'un étudiant."""
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            query = "SELECT EnrollmentID, ClassID, StudentID FROM enrollments WHERE StudentID = %s"
            cursor.execute(query, (student_id,))
            return cursor.fetchall()
        except mysql.connector.Error as err:
            print(f"Erreur SQL lors de la récupération des inscriptions: {err}")
            return []
        finally:
            cursor.close()
            conn.close()
