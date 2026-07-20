<?php

// ══════════════════════════════════════
//  config.php — Connexion MariaDB/MySQL (WAMP + XAMPP)
//  Les valeurs peuvent être surchargées via variables d'environnement
//  (utile en hébergement production : o2switch, Hostinger, LWS...)
// ══════════════════════════════════════
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'kaffrine');

define('SESSION_DURATION', 8 * 3600);

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=".DB_HOST.";port=".DB_PORT.";dbname=".DB_NAME.";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            // Afficher l'erreur exacte pour faciliter le diagnostic
            die(json_encode([
                'error'   => 'Connexion DB impossible',
                'details' => $e->getMessage(),
                'host'    => DB_HOST,
                'port'    => DB_PORT,
                'db'      => DB_NAME,
                'user'    => DB_USER,
            ], JSON_UNESCAPED_UNICODE));
        }
    }
    return $pdo;
}

function jsonResponse(mixed $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Session-Token');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getInput(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (is_array($data)) return $data;
    // Fallback $_POST si JSON invalide
    return $_POST ?: [];
}

// Récupère le token de session de façon fiable (WAMP/mod_fcgid ne transmet pas
// toujours les headers customisés dans $_SERVER)
function getSessionToken(): string {
    if (!empty($_SERVER['HTTP_X_SESSION_TOKEN'])) {
        return $_SERVER['HTTP_X_SESSION_TOKEN'];
    }
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $k => $v) {
            if (strtolower($k) === 'x-session-token') return $v;
        }
    }
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $k => $v) {
            if (strtolower($k) === 'x-session-token') return $v;
        }
    }
    // Fallback : token en paramètre GET/POST
    return $_GET['token'] ?? $_POST['token'] ?? '';
}

function requireAdmin(): array {
    $token = getSessionToken();
    if (!$token) jsonResponse(['error' => 'Non authentifié'], 401);
    $stmt = getDB()->prepare("SELECT * FROM sessions WHERE token=? AND expires_at>NOW()");
    $stmt->execute([$token]);
    $s = $stmt->fetch();
    if (!$s) jsonResponse(['error' => 'Session expirée'], 401);
    if (!in_array($s['role'], ['admin','superadmin'])) jsonResponse(['error' => 'Accès refusé'], 403);
    return $s;
}

function requireAuth(): array {
    $token = getSessionToken();
    if (!$token) jsonResponse(['error' => 'Non authentifié'], 401);
    $stmt = getDB()->prepare("SELECT * FROM sessions WHERE token=? AND expires_at>NOW()");
    $stmt->execute([$token]);
    $s = $stmt->fetch();
    if (!$s) jsonResponse(['error' => 'Session expirée'], 401);
    return $s;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Session-Token');
    exit(0);
}