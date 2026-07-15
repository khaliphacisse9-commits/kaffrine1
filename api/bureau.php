<?php
require_once 'config.php';
$session = requireAuth();
$db      = getDB();
$method  = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = $db->query("SELECT b.*, a.prenom AS arb_prenom, a.nom AS arb_nom, a.grade AS arb_grade, a.photo AS arb_photo
        FROM bureau b LEFT JOIN arbitres a ON a.id=b.arbitre_id")->fetchAll();
    $result = [];
    foreach ($rows as $r) {
        $result[$r['poste_id']] = [
            'type'       => $r['type_membre'],
            'arbitre_id' => $r['arbitre_id'],
            'prenom'     => $r['type_membre']==='arbitre' ? $r['arb_prenom'] : $r['prenom'],
            'nom'        => $r['type_membre']==='arbitre' ? $r['arb_nom']   : $r['nom'],
            'grade'      => $r['type_membre']==='arbitre' ? $r['arb_grade'] : $r['grade'],
            'photo'      => $r['arb_photo'] ?? '',
            'dateDebut'  => $r['date_debut'],
            'dateFin'    => $r['date_fin'],
            'tel'        => $r['tel'],
        ];
    }
    jsonResponse($result);
}

if ($method === 'POST' || $method === 'PUT') {
    requireAdmin();
    $d = getInput();
    $poste=$d['poste_id']??''; $type=$d['type']??'';
    $arb_id = $type==='arbitre' ? (int)($d['arbitre_id']??0) : null;
    $db->prepare("INSERT INTO bureau (poste_id,type_membre,arbitre_id,prenom,nom,grade,date_debut,date_fin,tel)
        VALUES (?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE type_membre=VALUES(type_membre),arbitre_id=VALUES(arbitre_id),
        prenom=VALUES(prenom),nom=VALUES(nom),grade=VALUES(grade),date_debut=VALUES(date_debut),date_fin=VALUES(date_fin),tel=VALUES(tel)")
       ->execute([$poste,$type,$arb_id,$d['prenom']??'',$d['nom']??'',$d['grade']??'',$d['dateDebut']??null,$d['dateFin']??null,$d['tel']??'']);
    jsonResponse(['ok'=>true]);
}

if ($method === 'DELETE') {
    requireAdmin();
    $poste=$_GET['poste_id']??'';
    $db->prepare("DELETE FROM bureau WHERE poste_id=?")->execute([$poste]);
    jsonResponse(['ok'=>true]);
}

jsonResponse(['error'=>'Méthode non supportée'],405);
