<?php
/* ══════════════════════════════════════
   api/comptes.php — Gestion des comptes admin
══════════════════════════════════════ */
require_once 'config.php';

$session = requireAdmin(); // Seuls les admins/superadmins accèdent
$db      = getDB();
$method  = $_SERVER['REQUEST_METHOD'];
$body    = getInput(); // Correction : getBody() n'existe pas → getInput()

switch ($method) {

    case 'GET':
        $rows = $db->query("SELECT id, nom, email, password, role, actif, date_creation FROM comptes ORDER BY id")->fetchAll();
        $result = array_map(function($r) {
            return [
                'id'            => (int)$r['id'],
                'nom'           => $r['nom'],
                'email'         => $r['email'],
                'password'      => $r['password'],
                'role'          => $r['role'],
                'actif'         => (bool)$r['actif'],
                'dateCreation'  => $r['date_creation'],
            ];
        }, $rows);
        jsonResponse($result);
        break;

    case 'POST':
        if ($session['role'] !== 'superadmin') jsonResponse(['error' => 'Réservé au Super Admin'], 403);
        $nom      = trim($body['nom']      ?? '');
        $email    = strtolower(trim($body['email']    ?? ''));
        $password = $body['password'] ?? '';
        $actif    = isset($body['actif']) ? (int)$body['actif'] : 1;

        if (!$nom || !$email || !$password) {
            jsonResponse(['error' => 'Champs obligatoires manquants'], 400);
        }
        if (strlen($password) < 6) {
            jsonResponse(['error' => 'Mot de passe trop court (6 caractères min)'], 400);
        }

        try {
            $stmt = $db->prepare("INSERT INTO comptes (nom, email, password, role, actif) VALUES (?, ?, ?, 'admin', ?)");
            $stmt->execute([$nom, $email, $password, $actif]);
            jsonResponse(['success' => true, 'id' => (int)$db->lastInsertId()]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Email déjà utilisé'], 409);
        }
        break;

    case 'PUT':
        if ($session['role'] !== 'superadmin') jsonResponse(['error' => 'Réservé au Super Admin'], 403);
        $id       = (int)($body['id']       ?? 0);
        $nom      = trim($body['nom']      ?? '');
        $email    = strtolower(trim($body['email']    ?? ''));
        $password = $body['password'] ?? '';
        $actif    = isset($body['actif']) ? (int)$body['actif'] : 1;

        if (!$id || !$nom || !$email || !$password) {
            jsonResponse(['error' => 'Données invalides'], 400);
        }

        $stmt = $db->prepare("UPDATE comptes SET nom=?, email=?, password=?, actif=? WHERE id=?");
        $stmt->execute([$nom, $email, $password, $actif, $id]);
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if ($session['role'] !== 'superadmin') jsonResponse(['error' => 'Réservé au Super Admin'], 403);
        // Correction : lire l'id depuis $_GET (paramètre URL), pas depuis $body
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'ID manquant'], 400);
        $db->prepare("DELETE FROM comptes WHERE id=?")->execute([$id]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Méthode non autorisée'], 405);
}
