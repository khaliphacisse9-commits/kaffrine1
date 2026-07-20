/* ══════════════════════════════════════
   bureau.js — Page Bureau CRA & S/CRA
   Liste des postes, affichage, modal d'affectation, exports
   (fonctionnalité manquante à l'origine — corrigée)
══════════════════════════════════════ */

// Liste des postes du bureau — doit rester alignée avec LIBELLES_POSTES
// et l'ordre FIELD(poste_id, ...) définis côté serveur dans api/bureau.php
const POSTES_BUREAU = [
  { id: 'president',                                label: 'Président',                                                          org: 'CRA' },
  { id: 'vp1_formation_jeunes',                      label: '1er Vice-Président chargé de la formation des jeunes arbitres',      org: 'CRA' },
  { id: 'vp2_detection_jeunes',                      label: '2ème Vice-Président chargé de la détection des jeunes arbitres',     org: 'CRA' },
  { id: 'vp3_massification',                         label: '3ème Vice-Président chargé de la massification',                    org: 'CRA' },
  { id: 'secretaire_general',                        label: 'Secrétaire Général',                                                 org: 'CRA' },
  { id: 'secretaire_general_adjoint',                label: 'Secrétaire Général Adjoint',                                         org: 'CRA' },
  { id: 'tresorier_general',                         label: 'Trésorier Général',                                                  org: 'CRA' },
  { id: 'adjoint_tresorier_teckoff',                 label: 'Adjoint Trésorier chargé des paiements et collectes de Teck-off',    org: 'CRA' },
  { id: 'president_commission_designation',          label: 'Président Commission de Désignation',                               org: 'CRA' },
  { id: 'president_commission_formation_technique',  label: 'Président Commission de Formation Technique et des cours',          org: 'CRA' },
  { id: 'president_commission_finance',              label: 'Président Commission Finance',                                       org: 'CRA' },
  { id: 'president_commission_sociale',              label: 'Président Commission Sociale',                                       org: 'CRA' },
  { id: 'presidente_commission_feminine',            label: 'Présidente Commission Féminine',                                     org: 'CRA' },
  { id: 'president_commission_discipline',           label: 'Président Commission de Discipline',                                 org: 'CRA' },
  { id: 'president_commission_organisation',         label: "Président Commission d'Organisation",                                org: 'CRA' },
  { id: 'intendant',                                 label: 'Intendant',                                                          org: 'S/CRA' },
  { id: 'intendante_adjointe',                       label: 'Intendant(e) Adjoint(e)',                                            org: 'S/CRA' },
  { id: 'commission_sages',                          label: 'Commission des Sages',                                               org: 'S/CRA' },
  { id: 'president_communication',                   label: 'Président chargé de la Communication',                              org: 'S/CRA' },
  { id: 'instructeur_physique',                      label: 'Instructeur Physique',                                               org: 'S/CRA' },
  { id: 'president_honneur',                         label: "Président d'Honneur",                                                org: 'S/CRA' },
];

let _editPosteId = null;

/* ── Helpers d'affichage d'un membre ── */
function membreNom(m) {
  if (!m || (!m.prenom && !m.nom)) return 'Poste vacant';
  return `${m.prenom || ''} ${m.nom || ''}`.trim() || 'Poste vacant';
}
function membreGrade(m) {
  if (!m) return '';
  if (m.type_membre === 'arbitre' && m.arbitre_id) {
    const arb = getArbs().find(a => a.id === m.arbitre_id);
    if (arb) return gradeLabel(arb.grade);
  }
  return m.grade || '';
}

/* ── Rendu de la grille des postes ── */
function renderBureau() {
  const bureau = getBureau();
  const grid = document.getElementById('bureauGrid');
  const wBureau = document.getElementById('wBureau');
  const nbPostesEl = document.getElementById('bureauNbPostes');

  const pourvus = POSTES_BUREAU.filter(p => membreNom(bureau[p.id]) !== 'Poste vacant').length;
  if (nbPostesEl) nbPostesEl.textContent = pourvus;

  if (grid) {
    grid.innerHTML = POSTES_BUREAU.map(p => {
      const m = bureau[p.id];
      const nom = membreNom(m);
      const vacant = nom === 'Poste vacant';
      const grade = membreGrade(m);
      const adjoints = m?.adjoints || [];
      return `<div class="bcard">
        <div class="bcard-top">
          <span class="badge" style="background:${p.org === 'CRA' ? 'var(--goldbg)' : 'var(--border)'};color:${p.org === 'CRA' ? 'var(--gold)' : 'var(--muted)'};font-size:.62rem;font-weight:700">${p.org}</span>
        </div>
        <div class="bcard-poste">${p.label}</div>
        <div class="bcard-titulaire" style="color:${vacant ? 'var(--muted)' : 'inherit'}">${vacant ? '— Poste vacant —' : nom}</div>
        ${!vacant && grade ? `<div class="bcard-grade">${grade}</div>` : ''}
        ${!vacant && m?.tel ? `<div class="bcard-tel">📞 ${m.tel}</div>` : ''}
        ${adjoints.length ? `<div class="bcard-adjoints">👥 ${adjoints.join(', ')}</div>` : ''}
        ${isAdmin() ? `<div class="bcard-actions">
          <button class="btn btn-xs btn-gold" onclick="openBureauModal('${p.id}')">✏ ${vacant ? 'Affecter' : 'Modifier'}</button>
          ${!vacant ? `<button class="btn btn-xs btn-danger" onclick="vacantBureau('${p.id}')">🗑</button>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');
  }

  if (wBureau) {
    const occupes = POSTES_BUREAU.filter(p => membreNom(bureau[p.id]) !== 'Poste vacant').slice(0, 5);
    wBureau.innerHTML = !occupes.length ? '<div class="emptyw">Aucun membre affecté.</div>' :
      occupes.map(p => {
        const m = bureau[p.id];
        return `<div class="wrow">
          <div style="flex:1">
            <div class="wname">${membreNom(m)}</div>
            <div style="font-size:.72rem;color:var(--muted)">${p.label}</div>
          </div>
        </div>`;
      }).join('');
  }
}

/* ── Modal affecter/modifier un membre ── */
function openBureauModal(posteId) {
  _editPosteId = posteId;
  const poste = POSTES_BUREAU.find(p => p.id === posteId);
  const bureau = getBureau();
  const m = bureau[posteId];

  document.getElementById('bureauModalTitre').textContent = poste ? poste.label : 'Affecter un membre';

  // Peupler le select des arbitres
  const sel = document.getElementById('bArbitre');
  if (sel) {
    sel.innerHTML = '<option value="">— Choisir un arbitre —</option>' +
      getArbs().map(a => `<option value="${a.id}">${nomAffiche(a)} (${gradeLabel(a.grade)})</option>`).join('');
  }

  const type = m?.type_membre === 'arbitre' ? 'arbitre' : (m ? 'externe' : 'arbitre');
  toggleBureauType(type);
  document.getElementById('bType').value = type;
  document.getElementById('bTypeArbitre').checked = type === 'arbitre';
  document.getElementById('bTypeExterne').checked = type === 'externe';

  if (type === 'arbitre' && m?.arbitre_id && sel) {
    sel.value = m.arbitre_id;
  }
  document.getElementById('bPrenom').value = m?.prenom || '';
  document.getElementById('bNom').value    = m?.nom    || '';
  document.getElementById('bGradeExt').value = (m && m.type_membre !== 'arbitre') ? (m.grade || '') : '';
  document.getElementById('bDateDebut').value = m?.dateDebut || m?.date_debut || '';
  document.getElementById('bDateFin').value   = m?.dateFin   || m?.date_fin   || '';
  document.getElementById('bTel').value = m?.tel || '';

  document.getElementById('bureauModal').classList.add('open');
}

function closeBureauModal() {
  document.getElementById('bureauModal').classList.remove('open');
  _editPosteId = null;
}

function toggleBureauType(type) {
  document.getElementById('bArbitreRow').style.display = type === 'arbitre' ? '' : 'none';
  document.getElementById('bExterneRow').style.display = type === 'externe' ? '' : 'none';
}

async function submitBureau() {
  if (!_editPosteId) return;
  const type = document.getElementById('bType').value;
  let prenom = '', nom = '', arbitre_id = null;

  if (type === 'arbitre') {
    arbitre_id = parseInt(document.getElementById('bArbitre').value) || null;
    if (!arbitre_id) { toast('⚠ Choisissez un arbitre', 'err'); return; }
    const arb = getArbs().find(a => a.id === arbitre_id);
    prenom = arb?.prenom || '';
    nom    = arb?.nom    || '';
  } else {
    prenom = document.getElementById('bPrenom').value.trim();
    nom    = document.getElementById('bNom').value.trim().toUpperCase();
    if (!prenom && !nom) { toast('⚠ Renseignez au moins le nom', 'err'); return; }
  }

  const tel = document.getElementById('bTel').value.trim();
  const payload = { poste_id: _editPosteId, prenom, nom, tel: tel || null, arbitre_id };

  await saveBureau(payload);
  closeBureauModal();
  toast('✅ Poste mis à jour !');
}

/* ── Export CSV ── */
function exportCSVBureau() {
  const bureau = getBureau();
  let csv = "\uFEFFOrganisation,Poste,Titulaire,Grade,Téléphone\n";
  POSTES_BUREAU.forEach(p => {
    const m = bureau[p.id];
    const nom = membreNom(m);
    csv += `"${p.org}","${p.label}","${nom !== 'Poste vacant' ? nom : ''}","${membreGrade(m)}","${m?.tel || ''}"\n`;
  });
  _dl(csv, `bureau_cra_${_today()}.csv`);
}
