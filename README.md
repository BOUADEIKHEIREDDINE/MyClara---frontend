# MyClara - Frontend

MyClara is an educational platform that allows teachers to create classes and modules, and students to access and manage their learning materials.

## Prerequisites

- **XAMPP** (or similar local server environment)
  - Download from: https://www.apachefriends.org/
  - Includes Apache web server and MySQL database

## Setup Instructions

### 1. Install XAMPP

1. Download and install XAMPP from the official website
2. During installation, make sure to install:
   - **Apache** (web server)
   - **MySQL** (database server)

### 2. Start XAMPP Services

1. Open the **XAMPP Control Panel**
2. Click **Start** next to:
   - **Apache** (web server)
   - **MySQL** (database server)
3. Both services should show a green status when running

### 3. Copy Project Files to htdocs

1. Navigate to your XAMPP installation directory (usually `C:\xampp\` on Windows)
2. Open the `htdocs` folder
3. Copy the entire `MyClara---frontend` folder into `htdocs`
4. Copy the `myclara-api` folder (backend API) into `htdocs` as well

Your `htdocs` folder structure should look like this:
```
C:\xampp\htdocs\
├── MyClara---frontend\
│   ├── assets\
│   ├── index.html
│   ├── student-dashboard.html
│   ├── teacher-create-class.html
│   └── ... (other frontend files)
└── myclara-api\
    ├── db_config.php
    ├── list_student_modules.php
    ├── create_module_with_files.php
    └── ... (other PHP API files)
```

### 4. Database Configuration

1. Open **phpMyAdmin** (usually accessible at `http://localhost/phpmyadmin`)
2. Create a database named `myclara` (or update the database name in `myclara-api/db_config.php` if you use a different name)
3. Import any SQL schema files if provided
4. Update database credentials in `myclara-api/db_config.php` if needed:
   ```php
   $host = 'localhost';
   $dbname = 'myclara';
   $username = 'root';
   $password = ''; // Default XAMPP MySQL password is empty
   ```

### 5. Access the Application

1. Open your web browser
2. Navigate to: `http://localhost/MyClara---frontend/`
3. You should see the MyClara homepage

## Project Structure

```
MyClara---frontend/
├── assets/
│   ├── icons/          # SVG icons
│   ├── images/          # Images and logos
│   ├── scripts/         # JavaScript files
│   └── styles/          # CSS stylesheets
├── student-pages/       # Student-specific pages
├── teacher-pages/       # Teacher-specific pages
├── index.html           # Homepage
├── student-dashboard.html
├── teacher-dashboard.html
└── ... (other HTML pages)
```

## API Endpoints

The backend API is located in `myclara-api/` and provides endpoints for:
- User authentication (login, signup)
- Module management (create, list, delete)
- Class management (create, list, delete)
- File uploads and management
- Student enrollment

## Troubleshooting

### Apache/MySQL won't start
- Check if ports 80 (Apache) and 3306 (MySQL) are already in use
- Stop other services using these ports or change XAMPP port settings

### Database connection errors
- Verify MySQL is running in XAMPP Control Panel
- Check database credentials in `myclara-api/db_config.php`
- Ensure the database exists in phpMyAdmin

### Files not loading
- Make sure both Apache and MySQL are running
- Check browser console for errors (F12)
- Verify file paths are correct

### CORS errors
- Ensure the API folder is in the same `htdocs` directory
- Check that API endpoints are accessible at `http://localhost/myclara-api/`

## Development

This project uses:
- Vanilla JavaScript (no frameworks)
- PHP for backend API
- MySQL for database
- HTML/CSS for frontend

## Notes

- The frontend communicates with the backend API via fetch requests
- User session data is stored in `localStorage`
- File uploads are handled through PHP endpoints in `myclara-api/`
