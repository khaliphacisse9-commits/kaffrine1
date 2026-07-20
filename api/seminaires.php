<?php
require_once 'config.php';
$session = requireAuth();
$db      = getDB();
$method  = $_SERVER['REQUEST_METHOD'];

function buildSem(PDO $db, array $row): array {
    $stmt = $db->prepare("SELECT a.id, CONCAT(a.prenom,' ',a.nom) AS nom, ps.present
        FROM presences_seminaires ps JOIN arbitres a ON a.id=ps.arbitre_id
        WHERE ps.seminaire_id=? ORDER BY a.nom");
    $stmt->execute([$row['id']]);
    $row['presence'] = $stmt->fetchAll();
    $row['date'] = $row['date_sem'];
    unset($row['date_sem']);
    return $row;
}

if ($method === 'GET') {
    $rows = $db->query("SELECT * FROM seminaires ORDER BY date_sem DESC")->fetchAll();
    jsonResponse(array_map(fn($r) => buildSem($db, $r), $rows));
}

if ($method === 'POST') {
    requireAdmin();
    $d = getInput();
    if (!trim($d['titre']??'') || !trim($d['date']??'')) {
        jsonResponse(['error' => 'Titre et date obligatoires'], 400);
    }
    $db->prepare("INSERT INTO seminaires (titre,date_sem,lieu,theme,formateur) VALUES (?,?,?,?,?)")
       ->execute([$d['titre'],$d['date'],$d['lieu']??'',$d['theme']??'',$d['formateur']??'']);
    $sid = $db->lastInsertId();
    $arbs = $db->query("SELECT id FROM arbitres")->fetchAll();
    foreach ($arbs as $a) {
        $db->prepare("INSERT INTO presences_seminaires (seminaire_id,arbitre_id,present) VALUES (?,?,0)")
           ->execute([$sid,$a['id']]);
    }
    jsonResponse(['id' => $sid]);
}

if ($method === 'PUT') {
    requireAdmin();
    $d = getInput(); $id=(int)($d['id']??0);
    if (!$id || !trim($d['titre']??'') || !trim($d['date']??'')) {
        jsonResponse(['error' => 'Titre et date obligatoires'], 400);
    }
    $db->prepare("UPDATE seminaires SET titre=?,date_sem=?,lieu=?,theme=?,formateur=? WHERE id=?")
       ->execute([$d['titre'],$d['date'],$d['lieu']??'',$d['theme']??'',$d['formateur']??'',$id]);
    jsonResponse(['ok' => true]);
}

if ($method === 'DELETE') {
    requireAdmin();
    $id=(int)($_GET['id']??0);
    $db->prepare("DELETE FROM seminaires WHERE id=?")->execute([$id]);
    jsonResponse(['ok' => true]);
}

if ($method === 'PATCH') {
    requireAdmin();
    $d = getInput(); $sid=(int)($_GET['id']??0);
    $stmt = $db->prepare("UPDATE presences_seminaires SET present=? WHERE seminaire_id=? AND arbitre_id=?");
    foreach ($d as $row) $stmt->execute([(int)$row['present'],$sid,(int)$row['arbitre_id']]);
    jsonResponse(['ok' => true]);
}

jsonResponse(['error' => 'Méthode non supportée'], 405);
