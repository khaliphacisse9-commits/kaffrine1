# 🗄️ Kaffrine — Version SQL (PHP + MySQL)

## ⚙️ Installation avec XAMPP/WAMP

### Étape 1 — Copier les fichiers
Copie tout le dossier `kaffrine_sql/` dans :
- **XAMPP** : `C:\xampp\htdocs\kaffrine\`
- **WAMP**  : `C:\wamp64\www\kaffrine\`

### Étape 2 — Créer la base de données
1. Ouvre **phpMyAdmin** → http://localhost/phpmyadmin
2. Clique sur **Importer** (en haut)
3. Sélectionne le fichier `kaffrine.sql`
4. Clique **Exécuter**

### Étape 3 — Lancer l'application
Ouvre ton navigateur : **http://localhost/kaffrine/**

---
## 🔐 Comptes par défaut
   Voir les variables d'environnement / secrets configurés lors du déploiement (SUPER_ADMIN_PASS, VIEWER_PASS).

---

## 📁 Structure
```
kaffrine/
├── index.html          ← Application principale
├── kaffrine.sql        ← Script de création des tables
├── api/
│   ├── config.php      ← Connexion MySQL (modifier si besoin)
│   ├── auth.php        ← Login / Logout / Comptes
│   ├── arbitres.php    ← CRUD Arbitres
│   ├── programmes.php  ← CRUD Programmes + Présences
│   ├── seminaires.php  ← CRUD Séminaires + Présences
│   ├── performances.php← CRUD Performances
│   └── bureau.php      ← CRUD Bureau
├── js/
│   ├── api.js          ← Communication avec le serveur (remplace localStorage)
│   ├── utils.js        ← Fonctions utilitaires
│   ├── nav.js          ← Navigation SPA
│   ├── admin.js        ← Formulaires et modals
│   ├── render.js       ← Affichage des pages
│   └── bureau.js       ← Gestion du bureau
└── css/                ← Styles (inchangés)
```

---

## 🔧 Configuration (si besoin)
`api/config.php` lit d'abord les variables d'environnement (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`), avec des valeurs par défaut adaptées à XAMPP/WAMP en local :
```php
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');   // vide par défaut sur XAMPP/WAMP
define('DB_NAME', getenv('DB_NAME') ?: 'kaffrine');
```
En production (o2switch, Hostinger, LWS…), définis ces variables d'environnement plutôt que de modifier le fichier.

© 2026 Commission des Arbitres de Kaffrine
