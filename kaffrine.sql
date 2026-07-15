-- ══════════════════════════════════════════════
--  KAFFRINE — Base de données MariaDB/MySQL
--  Commission Régionale des Arbitres de Kaffrine
--  Importer dans phpMyAdmin : Importer > kaffrine.sql
-- ══════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS kaffrine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kaffrine;

-- ─── ARBITRES ───────────────────────────────
CREATE TABLE IF NOT EXISTS arbitres (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  prenom      VARCHAR(100) NOT NULL,
  nom         VARCHAR(100) NOT NULL,
  grade       ENUM('Eleve','District','Ligue','Federal') NOT NULL,
  date_naissance DATE NULL,
  lieu_naissance VARCHAR(150) NULL,
  photo       LONGTEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Si la table existe déjà, exécuter aussi ces 2 lignes dans phpMyAdmin :
-- ALTER TABLE arbitres ADD COLUMN date_naissance DATE NULL AFTER grade;
-- ALTER TABLE arbitres ADD COLUMN lieu_naissance VARCHAR(150) NULL AFTER date_naissance;

-- ─── PROGRAMMES (matchs) ────────────────────
CREATE TABLE IF NOT EXISTS programmes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  titre       VARCHAR(200) NOT NULL,
  date_prog   DATE NOT NULL,
  heure_prog  TIME,
  lieu        VARCHAR(200),
  desig_ac    VARCHAR(200),
  desig_aa1   VARCHAR(200),
  desig_aa2   VARCHAR(200),
  desig_arb4  VARCHAR(200),
  insp_type   ENUM('arbitre','externe'),
  insp_cle    VARCHAR(200),
  insp_nom    VARCHAR(200),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Pour une base existante déjà créée sans la colonne heure_prog :
-- ALTER TABLE programmes ADD COLUMN heure_prog TIME AFTER date_prog;

-- ─── PRÉSENCES MATCHS ───────────────────────
CREATE TABLE IF NOT EXISTS presences_matchs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  programme_id INT NOT NULL,
  arbitre_id   INT NOT NULL,
  present      TINYINT(1) DEFAULT 0,
  FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE,
  FOREIGN KEY (arbitre_id)   REFERENCES arbitres(id)   ON DELETE CASCADE,
  UNIQUE KEY uq_prog_arb (programme_id, arbitre_id)
) ENGINE=InnoDB;

-- ─── SÉMINAIRES ─────────────────────────────
CREATE TABLE IF NOT EXISTS seminaires (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  titre       VARCHAR(200) NOT NULL,
  date_sem    DATE NOT NULL,
  lieu        VARCHAR(200),
  theme       VARCHAR(200),
  formateur   VARCHAR(200),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── PRÉSENCES SÉMINAIRES ───────────────────
CREATE TABLE IF NOT EXISTS presences_seminaires (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  seminaire_id INT NOT NULL,
  arbitre_id   INT NOT NULL,
  present      TINYINT(1) DEFAULT 0,
  FOREIGN KEY (seminaire_id) REFERENCES seminaires(id)  ON DELETE CASCADE,
  FOREIGN KEY (arbitre_id)   REFERENCES arbitres(id)    ON DELETE CASCADE,
  UNIQUE KEY uq_sem_arb (seminaire_id, arbitre_id)
) ENGINE=InnoDB;

-- ─── PERFORMANCES ───────────────────────────
CREATE TABLE IF NOT EXISTS performances (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  arbitre_id   INT NOT NULL,
  evenement_id VARCHAR(50),
  match_titre  VARCHAR(200),
  date_perf    DATE,
  note         DECIMAL(4,1),
  matchs       INT DEFAULT 0,
  cartons      INT DEFAULT 0,
  commentaire  TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (arbitre_id) REFERENCES arbitres(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── BUREAU ─────────────────────────────────
CREATE TABLE IF NOT EXISTS bureau (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  poste_id    VARCHAR(50) NOT NULL UNIQUE,
  type_membre ENUM('arbitre','externe') NOT NULL,
  arbitre_id  INT,
  prenom      VARCHAR(100),
  nom         VARCHAR(100),
  grade       VARCHAR(100),
  date_debut  DATE,
  date_fin    DATE,
  tel         VARCHAR(30),
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (arbitre_id) REFERENCES arbitres(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── COMPTES ────────────────────────────────
CREATE TABLE IF NOT EXISTS comptes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nom           VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  role          ENUM('admin','viewer') DEFAULT 'admin',
  actif         TINYINT(1) DEFAULT 1,
  date_creation DATE DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── SESSIONS ───────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  token      VARCHAR(64) PRIMARY KEY,
  email      VARCHAR(150) NOT NULL,
  role       VARCHAR(20)  NOT NULL,
  nom        VARCHAR(150),
  expires_at DATETIME NOT NULL
) ENGINE=InnoDB;

SELECT 'Base de données Kaffrine créée avec succès !' AS message;
