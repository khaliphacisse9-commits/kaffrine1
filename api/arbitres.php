<?php
require_once 'config.php';
$session = requireAuth();
$db      = getDB();
$method  = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = $db->query("SELECT id, prenom, nom, CONCAT(prenom,' ',nom) AS nomComplet, grade, date_naissance AS dateNaissance, lieu_naissance AS lieuNaissance, photo FROM arbitres ORDER BY nom, prenom")->fetchAll();
    jsonResponse($rows);
}

if ($method === 'POST') {
    requireAdmin();
    $d = getInput();
    if (!trim($d['prenom']??'') || !trim($d['nom']??'') || !($d['grade']??'')) {
        jsonResponse(['error' => 'Prénom, nom et grade obligatoires'], 400);
    }
    $db->prepare("INSERT INTO arbitres (prenom,nom,grade,date_naissance,lieu_naissance,photo) VALUES (?,?,?,?,?,?)")
       ->execute([trim($d['prenom']),strtoupper(trim($d['nom'])),$d['grade'],($d['dateNaissance']??'')?:null,trim($d['lieuNaissance']??''),$d['photo']??'']);
    $id = $db->lastInsertId();
    // Ajouter aux présences existantes
    $progs = $db->query("SELECT id FROM programmes")->fetchAll();
    foreach ($progs as $p) {
        $db->prepare("INSERT IGNORE INTO presences_matchs (programme_id,arbitre_id,present) VALUES (?,?,0)")
           ->execute([$p['id'],$id]);
    }
    $sems = $db->query("SELECT id FROM seminaires")->fetchAll();
    foreach ($sems as $s) {
        $db->prepare("INSERT IGNORE INTO presences_seminaires (seminaire_id,arbitre_id,present) VALUES (?,?,0)")
           ->execute([$s['id'],$id]);
    }
    jsonResponse(['id' => $id]);
}

if ($method === 'PUT') {
    requireAdmin();
    $d  = getInput();
    $id = (int)($d['id'] ?? 0);
    if (!$id || !trim($d['prenom']??'') || !trim($d['nom']??'') || !($d['grade']??'')) {
        jsonResponse(['error' => 'Prénom, nom et grade obligatoires'], 400);
    }
    if ($d['photo'] ?? '') {
        $db->prepare("UPDATE arbitres SET prenom=?,nom=?,grade=?,date_naissance=?,lieu_naissance=?,photo=? WHERE id=?")
           ->execute([trim($d['prenom']),strtoupper(trim($d['nom'])),$d['grade'],($d['dateNaissance']??'')?:null,trim($d['lieuNaissance']??''),$d['photo'],$id]);
    } else {
        $db->prepare("UPDATE arbitres SET prenom=?,nom=?,grade=?,date_naissance=?,lieu_naissance=? WHERE id=?")
           ->execute([trim($d['prenom']),strtoupper(trim($d['nom'])),$d['grade'],($d['dateNaissance']??'')?:null,trim($d['lieuNaissance']??''),$id]);
    }
    jsonResponse(['ok' => true]);
}

if ($method === 'DELETE') {
    requireAdmin();
    $id = (int)($_GET['id'] ?? 0);
    $db->prepare("DELETE FROM arbitres WHERE id=?")->execute([$id]);
    jsonResponse(['ok' => true]);
}

jsonResponse(['error' => 'Méthode non supportée'], 405);
