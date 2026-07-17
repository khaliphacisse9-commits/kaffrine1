<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Libellés lisibles des postes (pour l'affichage frontend)
const LIBELLES_POSTES = [
    'president'                                => 'Président',
    'vp1_formation_jeunes'                     => '1er Vice-Président chargé de la formation des jeunes arbitres',
    'vp2_detection_jeunes'                     => '2ème Vice-Président chargé de la détection des jeunes arbitres',
    'vp3_massification'                        => '3ème Vice-Président chargé de la massification',
    'secretaire_general'                       => 'Secrétaire Général',
    'secretaire_general_adjoint'                => 'Secrétaire Général Adjoint',
    'tresorier_general'                        => 'Trésorier Général',
    'adjoint_tresorier_teckoff'                => 'Adjoint Trésorier chargé des paiements et collectes de Teck-off',
    'president_commission_designation'         => 'Président Commission de Désignation',
    'president_commission_formation_technique' => 'Président Commission de Formation Technique et des cours',
    'president_commission_finance'             => 'Président Commission Finance',
    'president_commission_sociale'             => 'Président Commission Sociale',
    'presidente_commission_feminine'           => 'Présidente Commission Féminine',
    'president_commission_discipline'          => 'Président Commission de Discipline',
    'president_commission_organisation'        => "Président Commission d'Organisation",
    'intendant'                                => 'Intendant',
    'intendante_adjointe'                      => 'Intendant(e) Adjoint(e)',
    'commission_sages'                         => 'Commission des Sages',
    'president_communication'                  => 'Président chargé de la Communication',
    'instructeur_physique'                     => 'Instructeur Physique',
    'president_honneur'                        => "Président d'Honneur",
];

// ─── LISTE DU BUREAU ─────────────────────────
if ($method === 'GET') {
    $db   = getDB();
    $rows = $db->query("SELECT * FROM bureau ORDER BY FIELD(poste_id,
        'president','vp1_formation_jeunes','vp2_detection_jeunes','vp3_massification',
        'secretaire_general','secretaire_general_adjoint','tresorier_general','adjoint_tresorier_teckoff',
        'president_commission_designation','president_commission_formation_technique','president_commission_finance',
        'president_commission_sociale','presidente_commission_feminine','president_commission_discipline',
        'president_commission_organisation','intendant','intendante_adjointe','commission_sages',
        'president_communication','instructeur_physique','president_honneur')")->fetchAll();

    foreach ($rows as &$r) {
        $r['libelle']  = LIBELLES_POSTES[$r['poste_id']] ?? $r['poste_id'];
        $r['adjoints'] = $r['adjoints'] ? json_decode($r['adjoints'], true) : [];
    }
    jsonResponse($rows);
}

// ─── MODIFIER UN POSTE (titulaire + adjoints) ──
// POST et PUT sont traités de façon identique : le frontend (api.js) envoie
// saveBureau() en POST pour chaque poste modifié.
if ($method === 'PUT' || $method === 'POST') {
    requireAdmin();
    $d = getInput();
    $poste_id = $d['poste_id'] ?? '';
    if (!$poste_id || !isset(LIBELLES_POSTES[$poste_id])) {
        jsonResponse(['error' => 'Poste invalide'], 400);
    }

    $prenom     = $d['prenom'] ?? '';
    $nom        = $d['nom'] ?? '';
    $tel        = $d['tel'] ?? null;
    $arbitre_id = !empty($d['arbitre_id']) ? (int)$d['arbitre_id'] : null;
    $type       = $arbitre_id ? 'arbitre' : 'externe';

    // adjoints : tableau de chaînes (noms) envoyé par le frontend
    $adjoints = null;
    if (isset($d['adjoints']) && is_array($d['adjoints'])) {
        $adjoints = json_encode(array_values($d['adjoints']), JSON_UNESCAPED_UNICODE);
    }

    $db = getDB();
    $stmt = $db->prepare("UPDATE bureau
        SET type_membre = ?, arbitre_id = ?, prenom = ?, nom = ?, tel = ?, adjoints = ?
        WHERE poste_id = ?");
    $stmt->execute([$type, $arbitre_id, $prenom, $nom, $tel, $adjoints, $poste_id]);

    if ($stmt->rowCount() === 0) {
        // Le poste n'existait pas encore en base : on le crée
        $db->prepare("INSERT INTO bureau (poste_id, type_membre, arbitre_id, prenom, nom, tel, adjoints)
            VALUES (?, ?, ?, ?, ?, ?, ?)")
           ->execute([$poste_id, $type, $arbitre_id, $prenom, $nom, $tel, $adjoints]);
    }

    jsonResponse(['ok' => true]);
}

// ─── VIDER UN POSTE (rendre vacant) ────────────
// Appelé par vacantBureau() du frontend : DELETE bureau.php?poste_id=xxx
if ($method === 'DELETE') {
    requireAdmin();
    $poste_id = $_GET['poste_id'] ?? '';
    if (!$poste_id || !isset(LIBELLES_POSTES[$poste_id])) {
        jsonResponse(['error' => 'Poste invalide'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("UPDATE bureau
        SET type_membre = 'externe', arbitre_id = NULL, prenom = '', nom = '', tel = NULL, adjoints = NULL
        WHERE poste_id = ?");
    $stmt->execute([$poste_id]);

    jsonResponse(['ok' => true]);
}

jsonResponse(['error' => 'Méthode non supportée'], 405);