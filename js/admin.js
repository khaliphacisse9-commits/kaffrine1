/* ══════════════════════════════════════
   admin.js — Actions réservées à l'admin
   CRUD arbitres, programmes, séminaires, performances
══════════════════════════════════════ */

let _editIdx     = null;
let _editSemIdx  = null;
let _editPerfIdx = null;
let _editCompteIdx = null;
let tempPres     = {};
let tempPresSem  = {};

/* ════════════════════════════════
   MODAL ARBITRE
════════════════════════════════ */
function openModal(idx = null) {
  _editIdx = idx;
  const a = idx !== null ? getArbs()[idx] : null;
  document.getElementById("modalLbl").textContent = a ? "Modifier l'arbitre" : "Ajouter un arbitre";
  document.getElementById("mPrenom").value        = a?.prenom || "";
  document.getElementById("mNom").value           = a?.nom    || "";
  document.getElementById("mGrade").value         = a?.grade  || "";
  document.getElementById("mDateNaissance").value = a?.dateNaissance || "";
  document.getElementById("mLieuNaissance").value = a?.lieuNaissance || "";
  document.getElementById("mPhoto").value         = "";
  document.getElementById("arbModal").classList.add("open");
  setTimeout(() => document.getElementById("mPrenom").focus(), 80);
}
function closeModal() {
  document.getElementById("arbModal").classList.remove("open");
  _editIdx = null;
}

/* ════════════════════════════════
   CRUD ARBITRES
════════════════════════════════ */


/* ════════════════════════════════
   CRUD PROGRAMMES (matchs)
   Structure de designation :
   { ac, aa1, aa2, arb4 } — clés de présence
════════════════════════════════ */

function editProg(idx) {
  const p = getProgs()[idx];
  if (!p) return;
  const form = document.getElementById("progForm");
  form.dataset.edit = idx;
  document.getElementById("pDate").value  = p.date  || "";
  document.getElementById("pHeure").value = p.heure || "";
  document.getElementById("pTitre").value = p.titre || "";
  document.getElementById("pLieu").value  = p.lieu  || "";
  // Inspecteur
  if (p.inspecteur) {
    if (p.inspecteur.type === "arbitre") {
      toggleInspType("arbitre");
      const si = document.getElementById("pInspArbitre");
      if (si) si.value = p.inspecteur.cle || "";
    } else {
      toggleInspType("externe");
      const parts = (p.inspecteur.nom || "").split(" ");
      const pPrenom = document.getElementById("pInspPrenom");
      const pNom    = document.getElementById("pInspNom");
      if (pPrenom) pPrenom.value = parts[0] || "";
      if (pNom)    pNom.value    = parts.slice(1).join(" ") || "";
    }
  }
  // Désignations
  peuplerSelectsDesignation();
  const d = p.designation || {};
  ["pAC","pAA1","pAA2","pArb4"].forEach((id, i) => {
    const key = ["ac","aa1","aa2","arb4"][i];
    const el = document.getElementById(id);
    if (el) el.value = d[key] || "";
  });
  peuplerSelectsDesignation();
  // Scroller vers le formulaire
  form.scrollIntoView({ behavior: "smooth" });
  toast("📝 Programme chargé pour modification");
}


function resetProg() {
  document.getElementById("progForm").reset();
  delete document.getElementById("progForm").dataset.edit;
  ["pAC","pAA1","pAA2","pArb4"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  toggleInspType("arbitre");
  const si = document.getElementById("pInspArbitre"); if (si) si.value = "";
  const sp = document.getElementById("pInspPrenom");  if (sp) sp.value = "";
  const sn = document.getElementById("pInspNom");     if (sn) sn.value = "";
  peuplerSelectsDesignation();
}


/* ──────────────────────────────
   Remplir les selects de désignation
   avec la liste des arbitres
────────────────────────────── */
function peuplerSelectsDesignation() {
  const arbs = getArbs();
  const DESIG_IDS = ["pAC", "pAA1", "pAA2", "pArb4"];
  // Peupler aussi le select inspecteur (tous les arbitres, sans exclusion)
  const selInsp = document.getElementById("pInspArbitre");
  if (selInsp) {
    const cur = selInsp.value;
    selInsp.innerHTML = '<option value="">\u2014 Choisir un arbitre \u2014</option>' +
      arbs.map(a => {
        const cle = clePresence(a);
        return `<option value="${cle}" ${cle === cur ? "selected" : ""}>${nomAffiche(a)} (${gradeLabel(a.grade)})</option>`;
      }).join("");
    selInsp.value = cur;
  }
  DESIG_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const currentVal = el.value;
    // Clés choisies dans les AUTRES selects
    const autresChoisies = DESIG_IDS
      .filter(oid => oid !== id)
      .map(oid => document.getElementById(oid)?.value || "")
      .filter(v => v !== "");
    el.innerHTML = '<option value="">\u2014 Non d\u00e9sign\u00e9 \u2014</option>' +
      arbs
        .filter(a => !autresChoisies.includes(clePresence(a)))
        .map(a => {
          const cle = clePresence(a);
          return `<option value="${cle}" ${cle === currentVal ? "selected" : ""}>${nomAffiche(a)} (${gradeLabel(a.grade)})</option>`;
        }).join("");
    el.value = currentVal;
  });
}

function onDesigChange() {
  peuplerSelectsDesignation();
}

function toggleInspType(type) {
  document.getElementById("inspArbitreRow").style.display = type === "arbitre" ? "" : "none";
  document.getElementById("inspExterneRow").style.display = type === "externe" ? "" : "none";
  document.getElementById("inspTypeArbitre").checked = type === "arbitre";
  document.getElementById("inspTypeExterne").checked = type === "externe";
}
/* ════════════════════════════════
   PRÉSENCES MATCHS
   (toggle manuel en dehors de la désignation)
════════════════════════════════ */
function toggleTemp(pi, cle) {
  const pr = tempPres[pi]?.find(x => x.nom === cle);
  if (!pr) return;
  pr.present = !pr.present;
  const badge = document.querySelector(`[data-badge="m-${pi}-${cle}"]`);
  if (badge) {
    badge.textContent = pr.present ? "✓ Présent" : "✗ Absent";
    badge.className   = "badge " + (pr.present ? "badge-y" : "badge-n");
  }
}

/* ════════════════════════════════
   CRUD SÉMINAIRES
════════════════════════════════ */

function resetSem() {
  document.getElementById("semForm").reset();
  delete document.getElementById("semForm").dataset.edit;
}

/* ════════════════════════════════
   PRÉSENCES SÉMINAIRES
════════════════════════════════ */
function toggleTempSem(si, cle) {
  const pr = tempPresSem[si]?.find(x => x.nom === cle);
  if (!pr) return;
  pr.present = !pr.present;
  const badge = document.querySelector(`[data-badge="s-${si}-${cle}"]`);
  if (badge) {
    badge.textContent = pr.present ? "✓ Présent" : "✗ Absent";
    badge.className   = "badge " + (pr.present ? "badge-y" : "badge-n");
  }
}

/* ════════════════════════════════
   CRUD PERFORMANCES TERRAIN
════════════════════════════════ */
function openPerfModal(idx = null) {
  _editPerfIdx = idx;
  const p = idx !== null ? getPerfs()[idx] : null;
  const evKey = p ? resolveEvenementKey(p) : '';
  document.getElementById("perfModalLbl").textContent = p ? "Modifier la performance" : "Ajouter une performance";

  // Peupler événements
  const selEv = document.getElementById("pfEvenement");
  const progs = getProgs(), sems = getSems();
  selEv.innerHTML = '<option value="">-- Sélectionner un événement --</option>' +
    progs.map(ev => `<option value="prog-${ev.id}" ${evKey === "prog-"+ev.id ? "selected":""}>⚽ ${ev.date} — ${ev.titre}</option>`).join("") +
    sems.map(ev  => `<option value="sem-${ev.id}"  ${evKey === "sem-"+ev.id  ? "selected":""}>🎓 ${ev.date} — ${ev.titre}</option>`).join("");

  // Si édition, recharger l'arbitre
  if (evKey) {
    onPerfEvenementChange(p.arbitre_id);
  } else {
    document.getElementById("pfArbitre").innerHTML = '<option value="">-- Choisir d\'abord un événement --</option>';
  }

  document.getElementById("pfNote").value        = p?.note        ?? "";
  document.getElementById("pfMatchs").value      = p?.matchs      ?? "";
  document.getElementById("pfCartons").value     = p?.cartons     ?? "";
  document.getElementById("pfCommentaire").value = p?.commentaire || "";

  document.getElementById("perfModal").classList.add("open");
}

function onPerfEvenementChange(preselectArbitreId = null) {
  const evId  = document.getElementById("pfEvenement").value;
  const sel   = document.getElementById("pfArbitre");
  if (!evId) {
    sel.innerHTML = '<option value="">-- Choisir d\'abord un événement --</option>';
    return;
  }
  const [type, id] = evId.split("-");
  const ev = type === "prog" ? getProgs().find(x => String(x.id) === id) : getSems().find(x => String(x.id) === id);
  if (!ev) return;

  let arbsAvecRole = [];
  if (type === "prog") {
    // Programmes : arbitres désignés (ac, aa1, aa2, arb4)
    const d = ev.designation || {};
    const roles = [
      { cle: d.ac,   label: " [AC]"  },
      { cle: d.aa1,  label: " [AA1]" },
      { cle: d.aa2,  label: " [AA2]" },
      { cle: d.arb4, label: " [4e Arb.]" }
    ].filter(r => r.cle);
    arbsAvecRole = roles.map(r => {
      const a = getArbs().find(x => clePresence(x) === r.cle);
      return a ? { ...a, role: r.label } : null;
    }).filter(Boolean);
  } else {
    // Séminaires : arbitres présents (présence cochée)
    const presents = (ev.presence || []).filter(r => r.present).map(r => r.nom);
    arbsAvecRole = getArbs().filter(a => presents.includes(clePresence(a))).map(a => ({ ...a, role: "" }));
  }

  sel.innerHTML = '<option value="">-- Choisir un arbitre --</option>' +
    arbsAvecRole.map(a =>
      `<option value="${a.id}" ${preselectArbitreId == a.id ? "selected":""}>${nomAffiche(a)}${a.role} (${gradeLabel(a.grade)})</option>`
    ).join("");
}

function closePerfModal() {
  document.getElementById("perfModal").classList.remove("open");
  _editPerfIdx = null;
}

/* ══════════════════════════════════════
   FICHE DÉTAILLÉE ARBITRE
══════════════════════════════════════ */
function openArbDetailModal(idx) {
  const a     = getArbs()[idx];
  if (!a) return;
  const progs = getProgs();
  const sems  = getSems();
  const perfs = getPerfs();
  const cle   = clePresence(a);
  const bureau= getBureau();

  // En-tête
  document.getElementById("adPhoto").src  = avatarSrc(a);
  document.getElementById("adNom").textContent   = nomAffiche(a);
  document.getElementById("adGrade").textContent = gradeLabel(a.grade);
  const naisEl = document.getElementById("adNaissance");
  if (a.dateNaissance || a.lieuNaissance) {
    const dn = a.dateNaissance ? new Date(a.dateNaissance).toLocaleDateString('fr-FR') : '';
    naisEl.textContent = ['Né(e) le', dn, a.lieuNaissance ? ('à ' + a.lieuNaissance) : ''].filter(Boolean).join(' ');
  } else {
    naisEl.textContent = '';
  }

  // Poste au bureau
  const posteBureau = Object.entries(bureau).find(([pid, m]) => m && m.arbitre_id === a.id);
  const posteEl = document.getElementById("adBureauBadge");
  if (posteBureau) {
    const poste = POSTES_BUREAU.find(p => p.id === posteBureau[0]);
    posteEl.innerHTML = `<span style="background:var(--gold);color:#000;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:20px">🏅 ${poste?.org} — ${poste?.label}</span>`;
  } else {
    posteEl.innerHTML = '';
  }

  // Stats globales
  const tp = computeTaux(cle, progs);
  const ts = computeTauxSem(cle, sems);
  const pf = computePerf(cle, perfs, a.id);
  const col = tp.taux !== null ? tauxColor(tp.taux) : 'var(--muted)';
  document.getElementById("adTauxMatch").innerHTML = `<span style="color:${col}">${tp.taux !== null ? tp.taux+'%' : '—'}</span><br><small style="color:var(--muted);font-size:.7rem">${tp.present}/${tp.total} matchs</small>`;
  document.getElementById("adTauxSem").innerHTML   = `<span style="color:#2563eb">${ts.taux !== null ? ts.taux+'%' : '—'}</span><br><small style="color:var(--muted);font-size:.7rem">${ts.present}/${ts.total} séminaires</small>`;
  document.getElementById("adNoteMoy").innerHTML   = `<span style="color:${pf.moyNote !== null ? noteColor(pf.moyNote) : 'var(--muted)'}">${pf.moyNote !== null ? pf.moyNote+'/20' : '—'}</span><br><small style="color:var(--muted);font-size:.7rem">${pf.nb} évaluation(s)</small>`;

  // Détail matchs
  const matchsEl = document.getElementById("adMatchsList");
  const progsCle = progs.filter(p => p.presence?.find(r => r.nom === cle));
  if (!progsCle.length) {
    matchsEl.innerHTML = '<div style="padding:10px;color:var(--muted);font-size:.85rem;text-align:center">Aucun programme enregistré</div>';
  } else {
    matchsEl.innerHTML = progsCle.map(p => {
      const r = p.presence.find(x => x.nom === cle);
      const d = p.designation || {};
      let role = '';
      if (d.ac === cle) role = '<span style="background:#0a5c1e;color:#fff;font-size:.65rem;padding:1px 6px;border-radius:4px;margin-left:6px">AC</span>';
      else if (d.aa1 === cle) role = '<span style="background:#1d4ed8;color:#fff;font-size:.65rem;padding:1px 6px;border-radius:4px;margin-left:6px">AA1</span>';
      else if (d.aa2 === cle) role = '<span style="background:#1d4ed8;color:#fff;font-size:.65rem;padding:1px 6px;border-radius:4px;margin-left:6px">AA2</span>';
      else if (d.arb4 === cle) role = '<span style="background:#7c3aed;color:#fff;font-size:.65rem;padding:1px 6px;border-radius:4px;margin-left:6px">4e Arb.</span>';
      const present = r?.present;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 12px;border-bottom:1px solid var(--border)">
        <div>
          <span style="font-weight:600;font-size:.85rem">${p.titre}</span>${role}
          <div style="font-size:.75rem;color:var(--muted)">${p.date}${p.lieu ? ' · '+p.lieu : ''}</div>
        </div>
        <span class="badge ${present ? 'badge-y' : 'badge-n'}">${present ? '✓ Présent' : '✗ Absent'}</span>
      </div>`;
    }).join('');
  }

  // Détail séminaires
  const semsEl = document.getElementById("adSemsList");
  const semsCle = sems.filter(s => s.presence?.find(r => r.nom === cle));
  if (!semsCle.length) {
    semsEl.innerHTML = '<div style="padding:10px;color:var(--muted);font-size:.85rem;text-align:center">Aucun séminaire enregistré</div>';
  } else {
    semsEl.innerHTML = semsCle.map(s => {
      const r = s.presence.find(x => x.nom === cle);
      const present = r?.present;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 12px;border-bottom:1px solid var(--border)">
        <div>
          <span style="font-weight:600;font-size:.85rem">${s.titre}</span>
          <div style="font-size:.75rem;color:var(--muted)">${s.date}${s.theme ? ' · '+s.theme : ''}${s.formateur ? ' · '+s.formateur : ''}</div>
        </div>
        <span class="badge ${present ? 'badge-y' : 'badge-n'}">${present ? '✓ Présent' : '✗ Absent'}</span>
      </div>`;
    }).join('');
  }

  // Performances
  const perfsEl = document.getElementById("adPerfsList");
  const perfsArb = perfs.filter(p => p.arbitre_id === a.id || clePresence(a) === p.arbitre);
  if (!perfsArb.length) {
    perfsEl.innerHTML = '<div style="padding:10px;color:var(--muted);font-size:.85rem;text-align:center">Aucune performance enregistrée</div>';
  } else {
    perfsEl.innerHTML = perfsArb.map(p => {
      const nc = p.note !== null && p.note !== '' ? noteColor(Number(p.note)) : 'var(--muted)';
      return `<div style="padding:8px 12px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-weight:600;font-size:.85rem">${p.match || '—'}</span>
            <div style="font-size:.75rem;color:var(--muted)">${p.date || ''}${p.commentaire ? ' · '+p.commentaire : ''}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.1rem;font-weight:700;color:${nc}">${p.note !== null && p.note !== '' ? p.note+'/20' : '—'}</div>
            <div style="font-size:.72rem;color:var(--muted)">${p.matchs||0} matchs · ${p.cartons||0} cartons</div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  document.getElementById("arbDetailModal").classList.add("open");
}

function closeArbDetailModal() {
  document.getElementById("arbDetailModal").classList.remove("open");
}

/* ─── Fermeture modals sur clic fond ─── */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("arbModal")?.addEventListener("click",  e => { if (e.target.id === "arbModal")  closeModal(); });
  document.getElementById("perfModal")?.addEventListener("click", e => { if (e.target.id === "perfModal") closePerfModal(); });
  document.getElementById("arbDetailModal")?.addEventListener("click", e => { if (e.target.id === "arbDetailModal") closeArbDetailModal(); });
  document.getElementById("compteModal")?.addEventListener("click", e => { if (e.target.id === "compteModal") closeCompteModal(); });
});

/* ════════════════════════════════
   MODAL COMPTE ADMIN
   (fonctionnalité manquante à l'origine — corrigée)
════════════════════════════════ */
function openCompteModal(idx = null) {
  _editCompteIdx = idx;
  const c = idx !== null ? getComptes()[idx] : null;
  document.getElementById("compteModalTitre").textContent = c ? "Modifier le compte" : "Créer un compte admin";
  document.getElementById("cNom").value      = c?.nom   || "";
  document.getElementById("cEmail").value    = c?.email || "";
  document.getElementById("cPassword").value = c?.password || "";
  document.getElementById("cActif").checked  = c ? !!c.actif : true;
  document.getElementById("compteModal").classList.add("open");
  setTimeout(() => document.getElementById("cNom").focus(), 80);
}
function closeCompteModal() {
  document.getElementById("compteModal").classList.remove("open");
  _editCompteIdx = null;
}