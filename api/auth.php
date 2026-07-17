<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ─── LOGIN ───────────────────────────────────
if ($action === 'login') {

    // Lire les identifiants (GET ou POST JSON)
    if ($method === 'GET') {
        $email = strtolower(trim($_GET['email'] ?? ''));
        $pass  = $_GET['password'] ?? '';
    } else {
        // Lire le body brut — compatible WAMP et XAMPP
        $raw  = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            // Fallback : essayer $_POST si json_decode échoue
            $data = $_POST;
        }
        $email = strtolower(trim($data['email'] ?? ''));
        $pass  = $data['password'] ?? '';
    }

    // Ne pas trimmer le mot de passe (peut contenir des espaces intentionnels)
    if (!$email || $pass === '') {
        jsonResponse(['error' => 'Identifiant et mot de passe obligatoires'], 400);
    }

    $role = null;
    $nom  = null;

    // ── Comptes en base de données (superadmin, observateur, admins) ──
    try {
        $db   = getDB();
        $stmt = $db->prepare("SELECT * FROM comptes WHERE (email = ? OR SUBSTRING_INDEX(email,'@',1) = ?) AND actif = 1 LIMIT 1");
        $stmt->execute([$email, $email]);
        $compte = $stmt->fetch();
        if ($compte && password_verify($pass, $compte['password'])) {
            $role  = $compte['role'];
            $nom   = $compte['nom'];
            $email = $compte['email'];
        }
    } catch (Exception $e) {
        // DB inaccessible
        jsonResponse(['error' => 'Connexion base de données impossible'], 500);
    }

    if (!$role) {
        jsonResponse(['error' => 'Identifiant ou mot de passe incorrect'], 401);
    }

    // ── Créer la session ──
    try {
        $token   = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + SESSION_DURATION);
        $db      = getDB();
        $db->prepare("DELETE FROM sessions WHERE email = ?")->execute([$email]);
        $db->prepare("INSERT INTO sessions (token, email, role, nom, expires_at) VALUES (?, ?, ?, ?, ?)")
           ->execute([$token, $email, $role, $nom, $expires]);
        jsonResponse(['token' => $token, 'role' => $role, 'nom' => $nom, 'email' => $email]);
    } catch (Exception $e) {
        // Table sessions absente — token temporaire (fonctionne quand même)
        $token = bin2hex(random_bytes(32));
        jsonResponse(['token' => $token, 'role' => $role, 'nom' => $nom, 'email' => $email, 'warn' => 'session_not_saved']);
    }
}

// ─── LOGOUT ──────────────────────────────────
if ($method === 'POST' && $action === 'logout') {
    $token = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
    if ($token) {
        try { getDB()->prepare("DELETE FROM sessions WHERE token = ?")->execute([$token]); } catch(Exception $e) {}
    }
    jsonResponse(['ok' => true]);
}

// ─── CHECK SESSION ────────────────────────────
if ($action === 'me') {
    $token = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? $_GET['token'] ?? '';
    if (!$token) jsonResponse(['error' => 'Non connecté'], 401);
    try {
        $stmt = getDB()->prepare("SELECT email, role, nom FROM sessions WHERE token = ? AND expires_at > NOW()");
        $stmt->execute([$token]);
        $s = $stmt->fetch();
        if (!$s) jsonResponse(['error' => 'Session expirée'], 401);
        jsonResponse($s);
    } catch (Exception $e) {
        jsonResponse(['error' => 'Non connecté'], 401);
    }
}

// ─── COMPTES ─────────────────────────────────
if ($action === 'comptes') {
    $session = requireAuth();
    $db      = getDB();

    if ($method === 'GET') {
        $rows = $db->query("SELECT id, nom, email, role, actif, date_creation FROM comptes ORDER BY id")->fetchAll();
        jsonResponse($rows);
    }
    if ($method === 'POST') {
        if ($session['role'] !== 'superadmin') jsonResponse(['error' => 'Réservé au Super Admin'], 403);
        $d    = getInput();
        $nom  = $d['nom']   ?? '';
        $mail = strtolower($d['email']    ?? '');
        $pass = $d['password'] ?? '';
        $actif = $d['actif'] ?? 1;
        if (!$nom || !$mail || !$pass) jsonResponse(['error' => 'Champs obligatoires manquants'], 400);
        $hash = password_hash($pass, PASSWORD_DEFAULT);
        $db->prepare("INSERT INTO comptes (nom, email, password, role, actif) VALUES (?, ?, ?, 'admin', ?)")
           ->execute([$nom, $mail, $hash, (int)$actif]);
        jsonResponse(['id' => $db->lastInsertId()]);
    }
    if ($method === 'PUT') {
        if ($session['role'] !== 'superadmin') jsonResponse(['error' => 'Réservé au Super Admin'], 403);
        $d  = getInput();
        $id = (int)($d['id'] ?? 0);
        if (!empty($d['password'])) {
            $hash = password_hash($d['password'], PASSWORD_DEFAULT);
            $db->prepare("UPDATE comptes SET nom = ?, email = ?, password = ?, actif = ? WHERE id = ?")
               ->execute([$d['nom'], strtolower($d['email']), $hash, (int)$d['actif'], $id]);
        } else {
            $db->prepare("UPDATE comptes SET nom = ?, email = ?, actif = ? WHERE id = ?")
               ->execute([$d['nom'], strtolower($d['email']), (int)$d['actif'], $id]);
        }
        jsonResponse(['ok' => true]);
    }
    if ($method === 'DELETE') {
        if ($session['role'] !== 'superadmin') jsonResponse(['error' => 'Réservé au Super Admin'], 403);
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'ID manquant'], 400);
        $db->prepare("DELETE FROM comptes WHERE id = ?")->execute([$id]);
        jsonResponse(['ok' => true]);
    }
}

// ─── TEST CONNEXION (diagnostic) ─────────────
if ($action === 'test') {
    try {
        $db = getDB();
        $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        jsonResponse(['status' => 'OK', 'db' => DB_NAME, 'tables' => $tables]);
    } catch (Exception $e) {
        jsonResponse(['status' => 'ERREUR DB', 'message' => $e->getMessage()]);
    }
}

jsonResponse(['error' => 'Action inconnue'], 404);