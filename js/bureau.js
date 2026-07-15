/* ══════════════════════════════════════
   bureau.js — Membres du Bureau (version API)
══════════════════════════════════════ */

const POSTES_BUREAU = [
  { id:"pres_cra",   label:"Président",           org:"CRA"    },
  { id:"vp_cra",     label:"Vice-Président",       org:"CRA"    },
  { id:"sg_cra",     label:"Secrétaire Général",   org:"CRA"    },
  { id:"tres_cra",   label:"Trésorier",            org:"CRA"    },
  { id:"pres_scra",  label:"Président",            org:"S/CRA"  },
  { id:"vp_scra",    label:"Vice-Président",       org:"S/CRA"  },
  { id:"sg_scra",    label:"Secrétaire Général",   org:"S/CRA"  },
  { id:"tres_scra",  label:"Trésorier",            org:"S/CRA"  },
  { id:"mb1",        label:"Membre du Bureau 1",   org:"Bureau" },
  { id:"mb2",        label:"Membre du Bureau 2",   org:"Bureau" },
  { id:"mb3",        label:"Membre du Bureau 3",   org:"Bureau" },
];

/* ════════════════════════════════
   ÉTAT LOCAL
════════════════════════════════ */
let _bureauPosteId = null;

/* ════════════════════════════════
   RENDER — Grille des postes
════════════════════════════════ */
function renderBureau() {
  const bureau = getBureau(); // depuis api.js (_bureau)
  const grid   = document.getElementById("bureauGrid");
  const nb     = document.getElementById("bureauNbPostes");
  const wBureau = document.getElementById("wBureau");

  if (!grid) return;

  const pourvus = POSTES_BUREAU.filter(p => bureau[p.id]).length;
  if (nb) nb.textContent = pourvus;

  const orgs = [...new Set(POSTES_BUREAU.map(p => p.org))];

  grid.innerHTML = orgs.map(org => {
    const postes = POSTES_BUREAU.filter(p => p.org === org);
    return `
      <div class="bureau-section">
        <div class="bureau-section-title">${org}</div>
        <div class="bureau-cards">
          ${postes.map(poste => {
            const m    = bureau[poste.id];
            const nom  = membreNom(m);
            const photo= membrePhoto(m);
            const grade= membreGrade(m);
            const vide = !m;
            return `
              <div class="bureau-card ${vide ? "bureau-card-vide" : ""}">
                <div class="bureau-card-inner">
                  <img class="bureau-photo" src="${photo}" alt="${nom}">
                  <div class="bureau-poste">${poste.label}</div>
                  <div class="bureau-nom">${nom}</div>
                  ${grade ? `<div class="bureau-grade">${grade}</div>` : ""}
                  ${m?.dateDebut ? `<div class="bureau-mandat">📅 Depuis ${m.dateDebut}</div>` : ""}
                  ${m?.tel ? `<div class="bureau-tel">📞 ${m.tel}</div>` : ""}
                </div>
                ${isAdmin() ? `
                  <div class="bureau-card-actions">
                    <button class="btn btn-xs btn-gold" onclick="openBureauModal('${poste.id}')">
                      ${vide ? "➕ Affecter" : "✏ Modifier"}
                    </button>
                    ${!vide ? `<button class="btn btn-xs btn-danger" onclick="vacantBureau('${poste.id}')">🗑</button>` : ""}
                  </div>
                ` : ""}
              </div>`;
          }).join("")}
        </div>
      </div>`;
  }).join("");

  if (wBureau) {
    const remplis = POSTES_BUREAU.filter(p => bureau[p.id]).slice(0, 4);
    if (!remplis.length) {
      wBureau.innerHTML = '<div class="emptyw">Aucun membre affecté.</div>';
    } else {
      wBureau.innerHTML = remplis.map(p => {
        const m = bureau[p.id];
        return `<div class="wrow">
          <img class="wavatar" src="${membrePhoto(m)}" alt="${membreNom(m)}">
          <div style="flex:1">
            <div class="wname">${membreNom(m)}</div>
            <div style="font-size:.72rem;color:var(--muted)">${p.org} — ${p.label}</div>
          </div>
        </div>`;
      }).join("");
    }
  }
}

/* ════════════════════════════════
   MODAL — AFFECTER / MODIFIER
════════════════════════════════ */
function openBureauModal(posteId) {
  _bureauPosteId = posteId;
  const poste  = POSTES_BUREAU.find(p => p.id === posteId);
  const bureau = getBureau();
  const m      = bureau[posteId] || {};
  const arbs   = getArbs();

  document.getElementById("bureauModalTitre").textContent = `${poste.org} — ${poste.label}`;

  const type = m.type || "arbitre";
  document.getElementById("bType").value = type;
  document.getElementById("bTypeArbitre").checked = type === "arbitre";
  document.getElementById("bTypeExterne").checked = type === "externe";
  toggleBureauType(type);

  const sel = document.getElementById("bArbitre");
  sel.innerHTML = `<option value="">— Choisir un arbitre —</option>` +
    arbs.map(a => {
      const cle = clePresence(a);
      return `<option value="${cle}" ${m.arbitre_id === a.id ? "selected" : ""}>${nomAffiche(a)} — ${gradeLabel(a.grade)}</option>`;
    }).join("");

  document.getElementById("bPrenom").value    = m.prenom || "";
  document.getElementById("bNom").value       = (m.nom   || "").toUpperCase();
  document.getElementById("bGradeExt").value  = m.grade  || "";
  document.getElementById("bDateDebut").value = m.dateDebut || "";
  document.getElementById("bDateFin").value   = m.dateFin   || "";
  document.getElementById("bTel").value       = m.tel       || "";

  document.getElementById("bureauModal").classList.add("open");
}

function closeBureauModal() {
  document.getElementById("bureauModal").classList.remove("open");
  _bureauPosteId = null;
}

function toggleBureauType(type) {
  document.getElementById("bArbitreRow").style.display = type === "arbitre" ? "" : "none";
  document.getElementById("bExterneRow").style.display = type === "externe" ? "" : "none";
}

async function submitBureau() {
  const type      = document.getElementById("bType").value;
  const dateDebut = document.getElementById("bDateDebut").value;
  const dateFin   = document.getElementById("bDateFin").value;
  const tel       = document.getElementById("bTel").value.trim();

  let membre = { type, dateDebut, dateFin, tel };

  if (type === "arbitre") {
    const arbitre = document.getElementById("bArbitre").value;
    if (!arbitre) { toast("⚠ Sélectionnez un arbitre", "err"); return; }
    const arb = getArbs().find(a => clePresence(a) === arbitre);
    if (arb) {
      membre.arbitre_id = arb.id; // Correction : envoyer l'ID numérique attendu par bureau.php
      membre.prenom = arb.prenom; membre.nom = arb.nom; membre.grade = arb.grade;
    }
  } else {
    const prenom = document.getElementById("bPrenom").value.trim();
    const nom    = document.getElementById("bNom").value.trim().toUpperCase();
    if (!prenom || !nom) { toast("⚠ Prénom et Nom obligatoires", "err"); return; }
    membre.prenom = prenom;
    membre.nom    = nom;
    membre.grade  = document.getElementById("bGradeExt").value.trim();
  }

  // Sauvegarder via API (api.js)
  const bureau = getBureau();
  bureau[_bureauPosteId] = membre;
  await saveBureau(bureau);
  closeBureauModal();
  toast(`✅ ${membre.prenom||''} ${membre.nom||''} affecté au poste !`);
}

/* ════════════════════════════════
   HELPERS — nom / photo / grade
════════════════════════════════ */
function membreNom(m) {
  if (!m) return "— Poste vacant —";
  if (m.type === "arbitre" && m.arbitre_id) {
    const arb = getArbs().find(a => a.id === m.arbitre_id);
    if (arb) return nomAffiche(arb);
  }
  return `${m.prenom || ""} ${m.nom || ""}`.trim() || "—";
}

function membrePhoto(m) {
  if (!m) return `https://ui-avatars.com/api/?name=?&background=2d2d2d&color=666&size=200`;
  if (m.type === "arbitre" && m.arbitre_id) {
    const arb = getArbs().find(a => a.id === m.arbitre_id);
    if (arb) return avatarSrc(arb);
  }
  const initiales = `${(m.prenom||"")[0]||""}${(m.nom||"")[0]||""}`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initiales||"?")}&background=0a5c1e&color=fff&bold=true&size=200`;
}

function membreGrade(m) {
  if (!m) return "";
  if (m.type === "arbitre" && m.arbitre_id) {
    const arb = getArbs().find(a => a.id === m.arbitre_id);
    if (arb) return gradeLabel(arb.grade);
  }
  return m.grade || "";
}

/* ════════════════════════════════
   EXPORT CSV
════════════════════════════════ */
function exportCSVBureau() {
  const bureau = getBureau();
  let csv = "\uFEFFOrganisation,Poste,Prénom,Nom,Grade,Depuis,Jusqu'au,Téléphone\n";
  POSTES_BUREAU.forEach(p => {
    const m = bureau[p.id];
    csv += `"${p.org}","${p.label}","${m?.prenom||""}","${m?.nom||""}","${membreGrade(m)}","${m?.dateDebut||""}","${m?.dateFin||""}","${m?.tel||""}"\n`;
  });
  _dl(csv, `bureau_cra_${_today()}.csv`);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("bureauModal")
    ?.addEventListener("click", e => { if (e.target.id === "bureauModal") closeBureauModal(); });
});
