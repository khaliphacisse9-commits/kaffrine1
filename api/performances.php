<?php
require_once 'config.php';
$session = requireAuth();
$db      = getDB();
$method  = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = $db->query("SELECT p.*, a.prenom, a.nom, a.grade,
        CONCAT(a.prenom,' ',a.nom) AS arbitre_nom
        FROM performances p JOIN arbitres a ON a.id=p.arbitre_id
        ORDER BY p.date_perf DESC")->fetchAll();
    jsonResponse($rows);
}

if ($method === 'POST') {
    requireAdmin();
    $d = getInput();
    $arb_id=(int)($d['arbitre_id']??0);
    if (!$arb_id) jsonResponse(['error'=>'Arbitre obligatoire'],400);
    $note = (($d['note']??'')!==''&&($d['note']??null)!==null) ? (float)$d['note'] : null;
    if ($note!==null&&($note<0||$note>20)) jsonResponse(['error'=>'Note entre 0 et 20'],400);
    $db->prepare("INSERT INTO performances (arbitre_id,evenement_id,match_titre,date_perf,note,matchs,cartons,commentaire) VALUES (?,?,?,?,?,?,?,?)")
       ->execute([$arb_id,$d['evenementId']??'',$d['match']??'',$d['date']??null,$note,(int)($d['matchs']??0),(int)($d['cartons']??0),$d['commentaire']??'']);
    jsonResponse(['id'=>$db->lastInsertId()]);
}

if ($method === 'PUT') {
    requireAdmin();
    $d=getInput(); $id=(int)($d['id']??0);
    $note=(($d['note']??'')!==''&&($d['note']??null)!==null)?(float)$d['note']:null;
    if ($note!==null&&($note<0||$note>20)) jsonResponse(['error'=>'Note entre 0 et 20'],400);
    $db->prepare("UPDATE performances SET arbitre_id=?,evenement_id=?,match_titre=?,date_perf=?,note=?,matchs=?,cartons=?,commentaire=? WHERE id=?")
       ->execute([(int)($d['arbitre_id']??0),$d['evenementId']??'',$d['match']??'',$d['date']??null,$note,(int)($d['matchs']??0),(int)($d['cartons']??0),$d['commentaire']??'',$id]);
    jsonResponse(['ok'=>true]);
}

if ($method === 'DELETE') {
    requireAdmin();
    $id=(int)($_GET['id']??0);
    $db->prepare("DELETE FROM performances WHERE id=?")->execute([$id]);
    jsonResponse(['ok'=>true]);
}

jsonResponse(['error'=>'Méthode non supportée'],405);
