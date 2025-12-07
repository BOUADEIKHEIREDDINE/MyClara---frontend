# Azure Function v2 – Documentation

## 📌 Overview
This project is an **Azure Function App** providing a modular API with multiple routes for authentication, secure storage, and database management. It follows a clean architecture separating handlers, routes, and models.

The project is written in **Python 3.11** and uses **HTTP-triggered Azure Functions**.

---

## 📁 Project Structure
```
final_for_azure_function_v2/
├── function_app.py              # Azure Function entrypoint
├── main.py                      # App bootstrap
├── models.py                    # Data models (Pydantic)
│
├── routes/
│   ├── auth.py                  # Authentication endpoints
│   ├── db.py                    # Database endpoints
│   └── secure_storage.py        # Secure file storage endpoints
│
├── handlers/
│   ├── auth_handler.py          # Login, JWT, user auth logic
│   ├── db_manager.py            # SQL execution & DB utilities
│   ├── secure_storage_handler.py # File encoding, encryption, storage
│   └── security_jwt.py          # Token creation & validation
│
├── .env                         # Environment variables (not included)
├── host.json                    # Azure Function configuration
└── requirements.txt             # Python dependencies
```

---

## ⚙️ Installation (Local Development)

### 1️⃣ Install dependencies
```bash
pip install -r requirements.txt
```

### 2️⃣ Create a `.env` file
Your `.env` file should contain at least:
```
JWT_SECRET=your_secret_key
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
```

### 3️⃣ Run locally with Azure Functions Core Tools
```bash
func start
```

---

## 🚀 Available HTTP Endpoints

### 🔐 Authentication (`routes/auth.py`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/login` | Authenticate a user and return JWT |
| GET | `/validate` | Validate JWT and return user info |

### 🗄️ Database (`routes/db.py`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/db/query` | Execute SQL query and return results |
| POST | `/db/test` | Test database connection |

### 🔒 Secure Storage (`routes/secure_storage.py`)
| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/secure/upload` | Upload encrypted file |
| GET | `/secure/download` | Download and decrypt file |

---

## 🔑 Security
- JWT-based authentication
- Environment-based secret keys
- Secure file encoding and encrypted storage
- Input validation with Pydantic models

---

## 🌐 Deployment to Azure
1. Install Azure CLI & Function Core Tools
2. Login:
```bash
az login
```
3. Deploy:
```bash
func azure functionapp publish <YOUR_FUNCTIONAPP_NAME>
```

---

## 🧩 Notes
- The `.venv/` folder should **not** be committed or deployed.
- Keep `.env` secret — do not upload it.
- Works with Python 3.11 runtime on Azure.

---

## 📞 Support
Si tu veux, je peux aussi :
- Générer la documentation OpenAPI / Swagger
- Ajouter des exemples de requêtes Postman
- Créer un schéma d’architecture

Demande-moi simplement !

