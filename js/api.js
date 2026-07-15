/* ══════════════════════════════════════
   api.js — Couche de communication avec le serveur PHP/MySQL
   Remplace le localStorage de l'ancienne version
══════════════════════════════════════ */

// Détection automatique du port et de l'hôte (WAMP port 80, 8080, etc.)
const API_BASE = window.location.origin + '/kaffrine/api';
let _sessionToken = localStorage.getItem('kf_token') || null;

// ─── Requête générique ────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (_sessionToken) opts.headers['X-Session-Token'] = _sessionToken;
  if (body) opts.body = JSON.stringify(body);

  try {
    const sep = endpoint.includes('?') ? '&' : '?';
    const tokenParam = _sessionToken ? `${sep}token=${encodeURIComponent(_sessionToken)}` : '';
    const res  = await fetch(`${API_BASE}/${endpoint}${tokenParam}`, opts);
    const data = await res.json();
    if (!res.ok) {
      toast('⚠ ' + (data.error || 'Erreur serveur'), 'err');
      throw new Error(data.error || 'Erreur');
    }
    return data;
  } catch (e) {
    if (e.message !== 'Failed to fetch') throw e;
    toast('⚠ Impossible de contacter le serveur', 'err');
    throw e;
  }
}

/* ══════════════════════════════════════
   AUTH
══════════════════════════════════════ */
async function doLogin() {
  const emailInput = document.getElementById('emailInput').value.trim().toLowerCase();
  const pw         = document.getElementById('pwInput').value;
  const errEl      = document.getElementById('loErr');
  errEl.style.display = 'none';
  if (!emailInput || !pw) {
    errEl.textContent = '⚠ Identifiant et mot de passe obligatoires';
    errEl.style.display = 'block'; return;
  }
  try {
    // Utiliser GET pour le login (évite les problèmes CORS/preflight sur WAMP)
    const url = `${API_BASE}/auth.php?action=login&email=${encodeURIComponent(emailInput)}&password=${encodeURIComponent(pw)}`;
    const res  = await fetch(url);
    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      // Le serveur a répondu mais pas en JSON (page d'erreur Apache/PHP)
      // → cause fréquente sous WAMP : mod_headers ou mod_rewrite désactivé,
      //   .htaccess bloquant, ou erreur PHP fatale (voir config.php)
      errEl.textContent = `⚠ Le serveur a répondu une erreur (HTTP ${res.status}) au lieu de JSON. Vérifie que mod_headers et mod_rewrite sont activés dans WAMP, et consulte le journal Apache.`;
      errEl.style.display = 'block'; return;
    }
    if (!res.ok) {
      errEl.textContent = '⚠ ' + (data.error || `Erreur serveur (HTTP ${res.status})`);
      errEl.style.display = 'block'; return;
    }
    if (!data.token) {
      errEl.textContent = '⚠ Identifiant ou mot de passe incorrect';
      errEl.style.display = 'block'; return;
    }
    _sessionToken = data.token;
    localStorage.setItem('kf_token', data.token);
    localStorage.setItem('kf_role',  data.role);
    localStorage.setItem('kf_nom',   data.nom);
    localStorage.setItem('kf_email', data.email);
    document.getElementById('lo').style.display = 'none';
    applyRole();
    await renderAll();
  } catch (e) {
    // Ici : la requête n'a même pas atteint le serveur
    // (Apache/MySQL arrêté, mauvais chemin/port, CORS bloqué...)
    errEl.textContent = '⚠ Impossible de contacter le serveur (vérifie qu\'Apache et MySQL sont bien démarrés dans WAMP, et que l\'URL du projet est correcte)';
    errEl.style.display = 'block';
  }
}

async function doLogout() {
  try { await apiCall('auth.php?action=logout', 'POST'); } catch(_) {}
  _sessionToken = null;
  localStorage.removeItem('kf_token');
  localStorage.removeItem('kf_role');
  localStorage.removeItem('kf_nom');
  localStorage.removeItem('kf_email');
  location.reload();
}

function getRole()      { return localStorage.getItem('kf_role'); }
function isAdmin()      { const r=getRole(); return r==='admin'||r==='superadmin'; }
function isSuperAdmin() { return getRole()==='superadmin'; }
function getCurrentUser() {
  return { role:getRole(), nom:localStorage.getItem('kf_nom'), email:localStorage.getItem('kf_email') };
}

function applyRole() {
  const admin=isAdmin(), su=isSuperAdmin(), user=getCurrentUser();
  document.querySelectorAll('.admin-only').forEach(el => el.style.display=admin?'':'none');
  document.querySelectorAll('.superadmin-only').forEach(el => el.style.display=su?'':'none');
  const badge=document.getElementById('roleBadge');
  if (badge) { badge.textContent=su?'Super Admin':admin?'Admin':'Observateur'; badge.className='chip '+(su?'chip-su':admin?'chip-a':'chip-v'); }
  const userEl=document.getElementById('currentUserName');
  if (userEl&&user) userEl.textContent=user.nom||user.email;
}

/* ══════════════════════════════════════
   ARBITRES
══════════════════════════════════════ */
let _arbs = [];
async function loadArbs()  { _arbs = await apiCall('arbitres.php'); return _arbs; }
function getArbs()         { return _arbs; }

async function submitArb() {
  const prenom = document.getElementById('mPrenom').value.trim();
  const nom    = document.getElementById('mNom').value.trim().toUpperCase();
  const grade  = document.getElementById('mGrade').value;
  const dateNaissance = document.getElementById('mDateNaissance').value;
  const lieuNaissance = document.getElementById('mLieuNaissance').value.trim();
  const file   = document.getElementById('mPhoto').files[0];
  if (!prenom||!nom||!grade) { toast('⚠ Remplissez tous les champs','err'); return; }
  const doSave = async (photo) => {
    const payload = { prenom, nom, grade, dateNaissance, lieuNaissance, photo: photo||'' };
    if (_editIdx !== null) {
      payload.id = _arbs[_editIdx].id;
      await apiCall('arbitres.php', 'PUT', payload);
      toast('✅ Arbitre modifié !');
    } else {
      await apiCall('arbitres.php', 'POST', payload);
      toast('✅ Arbitre ajouté !');
    }
    closeModal(); await renderAll();
  };
  file ? compressImage(file, doSave) : doSave(null);
}

async function delArb(i) {
  if (!confirm('Supprimer cet arbitre définitivement ?')) return;
  await apiCall('arbitres.php?id='+_arbs[i].id, 'DELETE');
  toast('🗑 Arbitre supprimé'); await renderAll();
}

/* ══════════════════════════════════════
   PROGRAMMES
══════════════════════════════════════ */
let _progs = [];
async function loadProgs() { _progs = await apiCall('programmes.php'); return _progs; }
function getProgs()        { return _progs; }

async function submitProg(e) {
  e.preventDefault();
  const date  = document.getElementById('pDate').value;
  const heure = document.getElementById('pHeure').value;
  const titre = document.getElementById('pTitre').value;
  const lieu  = document.getElementById('pLieu').value;
  const inspType = document.querySelector('input[name="inspTypeRadio"]:checked')?.value||'arbitre';
  let inspecteur = null;
  if (inspType==='arbitre') {
    const cle=document.getElementById('pInspArbitre').value;
    if (cle) { const arb=_arbs.find(a=>nomComplet(a)===cle); inspecteur={type:'arbitre',cle,nom:arb?nomAffiche(arb):cle}; }
  } else {
    const prenom=document.getElementById('pInspPrenom').value.trim();
    const nom=document.getElementById('pInspNom').value.trim().toUpperCase();
    if (prenom||nom) inspecteur={type:'externe',nom:`${prenom} ${nom}`.trim()};
  }
  const designation={ac:document.getElementById('pAC').value,aa1:document.getElementById('pAA1').value,aa2:document.getElementById('pAA2').value,arb4:document.getElementById('pArb4').value};
  const form=document.getElementById('progForm');
  const editIdx=form.dataset.edit!==undefined?Number(form.dataset.edit):null;
  const payload={titre,date,heure,lieu,designation,inspecteur};
  if (editIdx!==null) { payload.id=_progs[editIdx].id; await apiCall('programmes.php','PUT',payload); delete form.dataset.edit; toast('📅 Programme modifié !'); }
  else { await apiCall('programmes.php','POST',payload); toast('📅 Programme ajouté !'); }
  resetProg(); await renderAll();
}

async function delProg(i) {
  if (!confirm('Supprimer ce programme ?')) return;
  await apiCall('programmes.php?id='+_progs[i].id,'DELETE');
  toast('🗑 Programme supprimé'); await renderAll();
}

async function confirmPresence() {
  const progs=_progs;
  for (const [i,p] of progs.entries()) {
    if (!tempPres[i]) continue;
    await apiCall('programmes.php?id='+p.id,'PATCH', tempPres[i].map(r=>({arbitre_id:r.id,present:r.present?1:0})));
  }
  toast('✅ Présences matchs enregistrées !'); await renderAll();
}

/* ══════════════════════════════════════
   SÉMINAIRES
══════════════════════════════════════ */
let _sems = [];
async function loadSems() { _sems = await apiCall('seminaires.php'); return _sems; }
function getSems()        { return _sems; }

async function submitSem(e) {
  e.preventDefault();
  const form=document.getElementById('semForm');
  const obj={titre:document.getElementById('sTitre').value,date:document.getElementById('sDate').value,lieu:document.getElementById('sLieu').value,theme:document.getElementById('sTheme').value,formateur:document.getElementById('sFormateur').value};
  const idx=form.dataset.edit;
  if (idx!==undefined) { obj.id=_sems[idx].id; await apiCall('seminaires.php','PUT',obj); delete form.dataset.edit; toast('🎓 Séminaire modifié !'); }
  else { await apiCall('seminaires.php','POST',obj); toast('🎓 Séminaire ajouté !'); }
  resetSem(); await renderAll();
}

async function delSem(i) {
  if (!confirm('Supprimer ce séminaire ?')) return;
  await apiCall('seminaires.php?id='+_sems[i].id,'DELETE');
  toast('🗑 Séminaire supprimé'); await renderAll();
}

async function confirmPresenceSem() {
  for (const [i,s] of _sems.entries()) {
    if (!tempPresSem[i]) continue;
    await apiCall('seminaires.php?id='+s.id,'PATCH', tempPresSem[i].map(r=>({arbitre_id:r.id,present:r.present?1:0})));
  }
  toast('✅ Présences séminaires enregistrées !'); await renderAll();
}

/* ══════════════════════════════════════
   PERFORMANCES
══════════════════════════════════════ */
let _perfs = [];
async function loadPerfs() {
  const rows = await apiCall('performances.php');
  _perfs = rows.map(r => ({
    ...r,
    evenementId: r.evenementId ?? r.evenement_id ?? '',
    match: r.match ?? r.match_titre ?? '',
    date: r.date ?? r.date_perf ?? ''
  }));
  return _perfs;
}
function getPerfs()        { return _perfs; }

async function submitPerf() {
  const arbitre_id=parseInt(document.getElementById('pfArbitre').value);
  const evenementId=document.getElementById('pfEvenement').value;
  const note=document.getElementById('pfNote').value;
  const matchs=document.getElementById('pfMatchs').value;
  const cartons=document.getElementById('pfCartons').value;
  const commentaire=document.getElementById('pfCommentaire').value.trim();
  if (!arbitre_id||!evenementId) { toast('⚠ Événement et arbitre obligatoires','err'); return; }
  if (note!==''&&(Number(note)<0||Number(note)>20)) { toast('⚠ Note entre 0 et 20','err'); return; }
  const [type,id]=evenementId.split('-');
  const ev=type==='prog'?_progs.find(x=>String(x.id)===id):_sems.find(x=>String(x.id)===id);
  const payload={arbitre_id,evenementId,match:ev?.titre||'',date:ev?.date||'',note:note!==''?Number(note):'',matchs:Number(matchs)||0,cartons:Number(cartons)||0,commentaire};
  if (_editPerfIdx!==null) { payload.id=_perfs[_editPerfIdx].id; await apiCall('performances.php','PUT',payload); toast('✅ Performance modifiée !'); }
  else { await apiCall('performances.php','POST',payload); toast('✅ Performance ajoutée !'); }
  closePerfModal(); await renderAll();
}

async function delPerf(i) {
  if (!confirm('Supprimer cette performance ?')) return;
  await apiCall('performances.php?id='+_perfs[i].id,'DELETE');
  toast('🗑 Performance supprimée'); await renderAll();
}

/* ══════════════════════════════════════
   BUREAU
══════════════════════════════════════ */
let _bureau = {};
async function loadBureau() { _bureau = await apiCall('bureau.php'); return _bureau; }
function getBureau()        { return _bureau; }
async function saveBureau(obj) {
  for (const [poste_id, m] of Object.entries(obj)) {
    await apiCall('bureau.php','POST',{poste_id,...m});
  }
  _bureau=obj; renderBureau();
}
async function vacantBureau(posteId) {
  if (!confirm('Retirer ce membre du poste ?')) return;
  await apiCall('bureau.php?poste_id='+posteId,'DELETE');
  toast('🗑 Poste vacant'); await loadBureau(); renderBureau();
}

/* ══════════════════════════════════════
   COMPTES
══════════════════════════════════════ */
let _comptes = [];
async function loadComptes() { _comptes = await apiCall('auth.php?action=comptes'); return _comptes; }
function getComptes()        { return _comptes; }

async function submitCompte() {
  const nom=document.getElementById('cNom').value.trim();
  const email=document.getElementById('cEmail').value.trim().toLowerCase();
  const password=document.getElementById('cPassword').value;
  const actif=document.getElementById('cActif').checked;
  if (!nom||!email||!password) { toast('⚠ Tous les champs sont obligatoires','err'); return; }
  if (!email.includes('@')) { toast('⚠ Email invalide','err'); return; }
  if (password.length<6) { toast('⚠ Mot de passe trop court (6 caractères min)','err'); return; }
  if (_editCompteIdx!==null) {
    await apiCall('auth.php?action=comptes','PUT',{id:_comptes[_editCompteIdx].id,nom,email,password,actif});
    toast('✅ Compte modifié !');
  } else {
    await apiCall('auth.php?action=comptes','POST',{nom,email,password,actif});
    toast('✅ Compte admin créé !');
  }
  closeCompteModal(); await loadComptes(); renderComptes();
}

async function toggleActifCompte(idx) {
  const c=_comptes[idx];
  const newActif = c.actif ? 0 : 1;
  await apiCall('auth.php?action=comptes','PUT',{...c, actif: newActif});
  await loadComptes(); renderComptes();
  // Correction : utiliser newActif (état cible) et non _comptes[idx].actif après rechargement
  toast(newActif ? '✅ Compte activé' : '⚠ Compte désactivé');
}

async function deleteCompte(idx) {
  if (!confirm('Supprimer définitivement ce compte ?')) return;
  await apiCall('auth.php?action=comptes&id='+_comptes[idx].id,'DELETE');
  await loadComptes(); renderComptes(); toast('🗑 Compte supprimé');
}

/* ══════════════════════════════════════
   HELPERS — clés & noms
══════════════════════════════════════ */
function nomComplet(a)  { return a.nomComplet || `${a.prenom} ${a.nom}`; }
function clePresence(a) { return a.nomComplet || `${a.prenom} ${a.nom}`; }
function nomAffiche(a)  { return a.prenom ? `${a.prenom} ${a.nom}` : a.nomComplet||a.nom||''; }

/* ══════════════════════════════════════
   RENDER ALL (async)
══════════════════════════════════════ */
async function renderAll() {
  await Promise.all([loadArbs(), loadProgs(), loadSems(), loadPerfs(), loadBureau()]);
  renderDash(); renderBureau(); renderArbitres(); renderProgs(); renderSems(); renderPerfs(); renderStats();
  if (isSuperAdmin()) { await loadComptes(); renderComptes(); }
}

/* ══════════════════════════════════════
   INIT AU CHARGEMENT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  if (_sessionToken) {
    try {
      await apiCall('auth.php?action=me');
      document.getElementById('lo').style.display = 'none';
      applyRole();
      await renderAll();
    } catch(_) {
      localStorage.removeItem('kf_token');
      _sessionToken = null;
    }
  }
});
