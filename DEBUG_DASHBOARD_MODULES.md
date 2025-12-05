# Guide de Débogage - Modules Dashboard

## Problème : Les modules ne s'affichent pas dans le dashboard

### Étapes de débogage :

## 1. Vérifier la Console du Navigateur (F12)

Ouvrez la console (F12) et regardez les logs. Vous devriez voir :

### A. Au chargement de la page :
```
Dashboard loaded:
  - User ID (should be UserID from users table): [valeur]
  - User Email: [email]
  - User ID type: [type]
```

**Vérifiez :**
- ✅ `currentUserId` existe et est un nombre
- ✅ Le type est `"string"` ou `"number"`

### B. Lors de la récupération des modules :
```
Fetching modules from SQL:
  - UserID (from users table): [nombre]
  - Will query modules WHERE CreatorUserID = [nombre]
Fetching from URL: http://localhost/myclara-api/list_student_modules.php?creatorUserId=[nombre]
```

**Vérifiez :**
- ✅ L'URL est correcte
- ✅ Le `creatorUserId` dans l'URL correspond au `UserID` de votre table `users`

### C. Réponse du serveur :
```
Response status: 200 OK
Raw response text: [JSON]
Parsed response data: {success: true, modules: [...]}
  - Success: true
  - Modules count: [nombre]
```

**Vérifiez :**
- ✅ Status est `200 OK`
- ✅ `success` est `true`
- ✅ `modules` est un tableau (array)
- ✅ Le nombre de modules correspond à ce que vous avez en base

## 2. Vérifier la Base de Données

### A. Vérifier que vous avez des modules :
```sql
SELECT * FROM modules WHERE CreatorUserID = [VOTRE_USER_ID];
```

**Remplacez `[VOTRE_USER_ID]`** par le `UserID` de votre utilisateur dans la table `users`.

### B. Vérifier que le UserID correspond :
```sql
-- Trouver votre UserID
SELECT UserID, Email FROM users WHERE Email = 'votre@email.com';

-- Vérifier les modules avec ce UserID
SELECT ModuleID, ModuleName, CreatorUserID 
FROM modules 
WHERE CreatorUserID = [UserID_trouvé];
```

**Important :**
- `CreatorUserID` dans `modules` doit correspondre à `UserID` dans `users`
- Les deux doivent être des nombres (INT)

## 3. Vérifier le Fichier PHP

### A. Vérifier que le fichier existe :
- Le fichier `list_student_modules.php` doit être dans `C:\xampp\htdocs\myclara-api\`

### B. Tester directement l'URL :
Ouvrez dans votre navigateur :
```
http://localhost/myclara-api/list_student_modules.php?creatorUserId=[VOTRE_USER_ID]
```

**Vous devriez voir :**
```json
{
  "success": true,
  "modules": [
    {
      "ModuleID": 1,
      "ModuleName": "Nom du module",
      "CreatorUserID": [VOTRE_USER_ID],
      "CreatedAt": "2024-..."
    }
  ],
  "count": 1
}
```

## 4. Problèmes Courants

### Problème 1 : `currentUserId` est `null` ou `undefined`
**Solution :** Reconnectez-vous. Le `currentUserId` est défini lors du login.

### Problème 2 : `currentUserId` n'est pas un nombre
**Solution :** Vérifiez que `login.php` retourne bien `userId` comme nombre.

### Problème 3 : Aucun module retourné mais vous en avez en base
**Solution :** Vérifiez que `CreatorUserID` dans `modules` correspond bien à `UserID` dans `users`.

### Problème 4 : Erreur CORS
**Solution :** Vérifiez que vous accédez au site via `http://localhost` et non via `file://`

### Problème 5 : Erreur 404 ou 500
**Solution :** 
- Vérifiez que le fichier PHP existe dans `myclara-api`
- Vérifiez les logs d'erreur PHP dans XAMPP
- Vérifiez que `config.php` est correctement configuré

## 5. Test Rapide

Dans la console du navigateur, exécutez :

```javascript
// Vérifier le UserID
console.log('UserID:', localStorage.getItem('currentUserId'));

// Tester la requête manuellement
fetch('http://localhost/myclara-api/list_student_modules.php?creatorUserId=' + localStorage.getItem('currentUserId'))
  .then(res => res.text())
  .then(text => {
    console.log('Raw response:', text);
    try {
      const data = JSON.parse(text);
      console.log('Parsed:', data);
      console.log('Modules:', data.modules);
    } catch(e) {
      console.error('Not JSON:', e);
    }
  });
```

## 6. Points à Vérifier

- [ ] `currentUserId` existe dans localStorage
- [ ] `currentUserId` est un nombre valide
- [ ] Le fichier `list_student_modules.php` existe dans `myclara-api`
- [ ] La requête retourne un status 200
- [ ] La réponse JSON contient `success: true`
- [ ] La réponse JSON contient un tableau `modules`
- [ ] Les modules en base ont `CreatorUserID` qui correspond à `UserID` de l'utilisateur

