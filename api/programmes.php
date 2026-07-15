<?php
require_once 'config.php';
$session = requireAuth();
$db      = getDB();
$method  = $_SERVER['REQUEST_METHOD'];

function buildProg(PDO $db, array $row): array {
    // Désignation
    $row['designation'] = [
        'ac'   => $row['desig_ac']   ?? '',
        'aa1'  => $row['desig_aa1']  ?? '',
        'aa2'  => $row['desig_aa2']  ?? '',
        'arb4' => $row['desig_arb4'] ?? '',
    ];
    // Inspecteur
    $row['inspecteur'] = $row['insp_nom'] ? [
        'type' => $row['insp_type'],
        'cle'  => $row['insp_cle'],
        'nom'  => $row['insp_nom'],
    ] : null;
    // Présences
    $stmt = $db->prepare("SELECT a.id, CONCAT(a.prenom,' ',a.nom) AS nom, pm.present
        FROM presences_matchs pm JOIN arbitres a ON a.id=pm.arbitre_id
        WHERE pm.programme_id=? ORDER BY a.nom");
    $stmt->execute([$row['id']]);
    $row['presence'] = $stmt->fetchAll();
    // Formater date
    $row['date'] = $row['date_prog'];
    $row['heure'] = $row['heure_prog'] ? substr($row['heure_prog'], 0, 5) : '';
    unset($row['desig_ac'],$row['desig_aa1'],$row['desig_aa2'],$row['desig_arb4'],
          $row['insp_type'],$row['insp_cle'],$row['insp_nom'],$row['date_prog'],$row['heure_prog']);
    return $row;
}

if ($method === 'GET') {
    $rows = $db->query("SELECT * FROM programmes ORDER BY date_prog DESC")->fetchAll();
    $result = array_map(fn($r) => buildProg($db, $r), $rows);
    jsonResponse($result);
}

if ($method === 'POST') {
    requireAdmin();
    $d = getInput();
    if (!trim($d['titre']??'') || !trim($d['date']??'')) {
        jsonResponse(['error' => 'Titre et date obligatoires'], 400);
    }
    // Vérifier conflits
    $clés = array_filter([$d['designation']['ac']??'', $d['designation']['aa1']??'', $d['designation']['aa2']??'', $d['designation']['arb4']??'']);
    if ($clés) {
        $editId = (int)($d['id'] ?? 0);
        // Correction : requête préparée pour éviter toute injection SQL sur la date
        $sql = "SELECT p.id, p.titre, p.desig_ac, p.desig_aa1, p.desig_aa2, p.desig_arb4
            FROM programmes p WHERE date_prog=?" . ($editId ? " AND p.id<>?" : "");
        $params = $editId ? [$d['date'], $editId] : [$d['date']];
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $autres = $stmt->fetchAll();
        foreach ($autres as $p) {
            $autresRoles = array_filter([$p['desig_ac'],$p['desig_aa1'],$p['desig_aa2'],$p['desig_arb4']]);
            foreach ($clés as $cle) {
                if (in_array($cle, $autresRoles)) jsonResponse(['error' => "Conflit : \"$cle\" déjà désigné dans \"{$p['titre']}\" à cette date"], 409);
            }
        }
    }
    $insp = $d['inspecteur'] ?? null;
    $db->prepare("INSERT INTO programmes (titre,date_prog,heure_prog,lieu,desig_ac,desig_aa1,desig_aa2,desig_arb4,insp_type,insp_cle,insp_nom)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)")->execute([
        $d['titre'],$d['date'],$d['heure']?:null,$d['lieu']??'',
        $d['designation']['ac']??'',$d['designation']['aa1']??'',$d['designation']['aa2']??'',$d['designation']['arb4']??'',
        $insp['type']??null,$insp['cle']??null,$insp['nom']??null
    ]);
    $pid = $db->lastInsertId();
    // Initialiser présences
    $arbs = $db->query("SELECT id, CONCAT(prenom,' ',nom) AS nomComplet FROM arbitres")->fetchAll();
    $désignés = array_filter([$d['designation']['ac']??'',$d['designation']['aa1']??'',$d['designation']['aa2']??'',$d['designation']['arb4']??'']);
    foreach ($arbs as $a) {
        $present = in_array($a['nomComplet'], $désignés) ? 1 : 0;
        $db->prepare("INSERT INTO presences_matchs (programme_id,arbitre_id,present) VALUES (?,?,?)")
           ->execute([$pid,$a['id'],$present]);
    }
    jsonResponse(['id' => $pid]);
}

if ($method === 'PUT') {
    requireAdmin();
    $d  = getInput();
    $id = (int)($d['id'] ?? 0);
    if (!$id || !trim($d['titre']??'') || !trim($d['date']??'')) {
        jsonResponse(['error' => 'Titre et date obligatoires'], 400);
    }
    $insp = $d['inspecteur'] ?? null;
    $db->prepare("UPDATE programmes SET titre=?,date_prog=?,heure_prog=?,lieu=?,desig_ac=?,desig_aa1=?,desig_aa2=?,desig_arb4=?,insp_type=?,insp_cle=?,insp_nom=? WHERE id=?")
       ->execute([$d['titre'],$d['date'],$d['heure']?:null,$d['lieu']??'',
         $d['designation']['ac']??'',$d['designation']['aa1']??'',$d['designation']['aa2']??'',$d['designation']['arb4']??'',
         $insp['type']??null,$insp['cle']??null,$insp['nom']??null,$id]);
    jsonResponse(['ok' => true]);
}

if ($method === 'DELETE') {
    requireAdmin();
    $id = (int)($_GET['id'] ?? 0);
    $db->prepare("DELETE FROM programmes WHERE id=?")->execute([$id]);
    jsonResponse(['ok' => true]);
}

// ─── PRÉSENCES ────────────────────────────────
if ($method === 'PATCH') {
    requireAdmin();
    $d = getInput(); // [{arbitre_id, present}, ...]
    $pid = (int)($_GET['id'] ?? 0);
    $stmt = $db->prepare("UPDATE presences_matchs SET present=? WHERE programme_id=? AND arbitre_id=?");
    foreach ($d as $row) $stmt->execute([(int)$row['present'], $pid, (int)$row['arbitre_id']]);
    jsonResponse(['ok' => true]);
}

jsonResponse(['error' => 'Méthode non supportée'], 405);
