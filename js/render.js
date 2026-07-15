/* ══════════════════════════════════════
   render.js — Affichage de toutes les pages
══════════════════════════════════════ */

/* ════════════════════════════════
   DASHBOARD
════════════════════════════════ */
function renderDash() {
  const arbs  = getArbs();
  const progs = getProgs();
  const sems  = getSems();
  const perfs = getPerfs();

  document.getElementById("kNarb").textContent  = arbs.length;
  document.getElementById("kNprog").textContent = progs.length;
  document.getElementById("kNsem").textContent  = sems.length;

  let tot = 0, pres = 0;
  progs.forEach(p => p.presence?.forEach(r => { tot++; if (r.present) pres++; }));
  document.getElementById("kTaux").textContent = tot ? Math.round(pres / tot * 100) + "%" : "—";

  const tops = arbs
    .map(a => ({ ...a, ...computeTaux(clePresence(a), progs) }))
    .sort((a, b) => (b.taux ?? -1) - (a.taux ?? -1));
  document.getElementById("kTop").textContent = tops[0]?.prenom || "—";

  document.getElementById("tb-arb").textContent  = arbs.length;
  document.getElementById("tb-prog").textContent = progs.length;
  document.getElementById("tb-sem").textContent  = sems.length;

  const wta = document.getElementById("wTopArb");
  wta.innerHTML = !tops.length ? '<div class="emptyw">Aucun arbitre.</div>' :
    tops.slice(0, 5).map(a => {
      const tv = a.taux ?? 0, col = a.taux !== null ? tauxColor(tv) : "var(--muted)";
      return `<div class="wrow">
        <img class="wavatar" src="${avatarSrc(a)}" alt="${nomAffiche(a)}">
        <div style="flex:1"><div class="wname">${nomAffiche(a)}</div><div style="font-size:.72rem;color:var(--muted)">${gradeLabel(a.grade)}</div></div>
        <div><div class="wtaux" style="color:${col}">${a.taux !== null ? tv + "%" : "—"}</div>
        <div class="pct-bar"><div class="pct-fill" style="width:${tv}%;background:${col}"></div></div></div>
      </div>`;
    }).join("");

  const wp = document.getElementById("wProgs");
  const sortedP = [...progs].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  wp.innerHTML = !sortedP.length ? '<div class="emptyw">Aucun programme.</div>' :
    sortedP.map(p => `<div class="wevent">
      <div class="wedate">📅 ${p.date}</div>
      <div class="wetitle">${p.titre}</div>
      ${p.lieu ? `<div class="welieu">📍 ${p.lieu}</div>` : ""}
    </div>`).join("");

  const ws = document.getElementById("wSems");
  const sortedS = [...sems].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  ws.innerHTML = !sortedS.length ? '<div class="emptyw">Aucun séminaire.</div>' :
    sortedS.map(s => `<div class="wevent">
      <div class="wedate">🎓 ${s.date}</div>
      <div class="wetitle">${s.titre}</div>
      ${s.theme ? `<div class="welieu">📌 ${s.theme}</div>` : ""}
    </div>`).join("");
}

/* ════════════════════════════════
   ARBITRES
════════════════════════════════ */
function renderArbitres() {
  const q     = (document.getElementById("srchArb")?.value || "").toLowerCase();
  const fg    = document.getElementById("fGrade")?.value || "";
  const progs = getProgs(), sems = getSems(), perfs = getPerfs();
  const all   = getArbs();
  const arbs  = all.filter(a => nomAffiche(a).toLowerCase().includes(q) && (!fg || a.grade === fg));
  const c     = document.getElementById("arbList");
  if (!arbs.length) { c.innerHTML = '<div class="empty" style="grid-column:1/-1">Aucun arbitre trouvé.</div>'; return; }
  c.innerHTML = arbs.map((a, rank) => {
    const ri = all.findIndex(x => x.id === a.id);
    const { total, present, taux } = computeTaux(clePresence(a), progs);
    const ts = computeTauxSem(clePresence(a), sems);
    const pf = computePerf(clePresence(a), perfs, a.id);
    const tv = taux ?? 0, col = taux !== null ? tauxColor(tv) : "var(--muted)";
    return `<div class="acard" onclick="openArbDetailModal(${ri})" style="cursor:pointer">
      <div class="acard-top">
        <div class="arank">#${rank + 1}</div>
        <img class="aphoto" src="${avatarSrc(a)}" alt="${nomAffiche(a)}">
      </div>
      <div class="acard-body">
        <div class="aname">${nomAffiche(a)}</div>
        <div class="agrade">${gradeLabel(a.grade)}</div>
        <div class="acard-mini-stats">
          <div class="ams"><div class="ams-n" style="color:${col}">${taux !== null ? tv + "%" : "—"}</div><div class="ams-l">Présence</div></div>
          <div class="ams-sep"></div>
          <div class="ams"><div class="ams-n" style="color:var(--gold)">${ts.taux !== null ? ts.taux + "%" : "—"}</div><div class="ams-l">Séminaires</div></div>
          <div class="ams-sep"></div>
          <div class="ams"><div class="ams-n" style="color:${pf.moyNote !== null ? noteColor(pf.moyNote) : "var(--muted)"}">${pf.moyNote !== null ? pf.moyNote + "/20" : "—"}</div><div class="ams-l">Note moy.</div></div>
        </div>
        <div class="progress"><div class="progress-bar" style="width:${tv}%;background:${col}"></div></div>
      </div>
      ${isAdmin() ? `<div class="acard-actions">
        <button class="btn btn-xs btn-gold" onclick="event.stopPropagation();openModal(${ri})">✏ Modifier</button>
        <button class="btn btn-xs btn-danger" onclick="event.stopPropagation();delArb(${ri})">🗑</button>
      </div>` : ""}
    </div>`;
  }).join("");
}

/* ════════════════════════════════
   HELPER — Nom arbitre depuis clé
════════════════════════════════ */
function nomDepuisCle(cle) {
  if (!cle) return "";
  const arb = getArbs().find(a => clePresence(a) === cle);
  return arb ? nomAffiche(arb) : cle;
}

/* ════════════════════════════════
   PROGRAMMES — Désignation uniquement
════════════════════════════════ */
function renderProgs() {
  const progs = getProgs();
  const c = document.getElementById("progList");

  // Toujours repeupler les selects avec les arbitres actuels
  peuplerSelectsDesignation();

  if (!progs.length) { c.innerHTML = '<div class="empty">Aucun programme enregistré.</div>'; return; }

  c.innerHTML = progs.map((p, pi) => {
    const d = p.designation || {};

    const designBlock = `
      <div class="desig-block">
        <div class="desig-title">🧑‍⚖️ Désignation</div>
        <div class="desig-grid">
          <div class="desig-role">
            <span class="desig-badge desig-ac">AC</span>
            <span class="desig-nom">${nomDepuisCle(d.ac) || '<em style="color:var(--muted)">Non désigné</em>'}</span>
          </div>
          <div class="desig-role">
            <span class="desig-badge desig-aa1">AA1</span>
            <span class="desig-nom">${nomDepuisCle(d.aa1) || '<em style="color:var(--muted)">Non désigné</em>'}</span>
          </div>
          <div class="desig-role">
            <span class="desig-badge desig-aa2">AA2</span>
            <span class="desig-nom">${nomDepuisCle(d.aa2) || '<em style="color:var(--muted)">Non désigné</em>'}</span>
          </div>
          ${d.arb4 ? `<div class="desig-role">
            <span class="desig-badge desig-arb4">4e</span>
            <span class="desig-nom">${nomDepuisCle(d.arb4)}</span>
          </div>` : ""}
        </div>
        ${p.inspecteur ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;background:#b45309;color:#fff;font-size:.65rem;font-weight:800;padding:2px 8px;border-radius:4px;letter-spacing:.5px">INSP</span>
          <span style="font-weight:600;font-size:.88rem">${p.inspecteur.nom}</span>
        </div>` : ""}
      </div>`;

    return `<div class="evwrap"><div class="evcard">
      <div class="evhdr" onclick="toggleEv(this)">
        <div class="evleft">
          <span class="evdate">📅 ${p.date}${p.heure ? ` — 🕐 ${p.heure}` : ""}</span>
          <div>
            <div class="evtitle">${p.titre}</div>
            ${p.lieu ? `<div class="evlieu">📍 ${p.lieu}</div>` : ""}
          </div>
        </div>
        <div class="evright">
          ${isAdmin() ? `<button class="btn btn-xs btn-gold" onclick="editProg(${pi});event.stopPropagation()">✏</button><button class="btn btn-xs btn-danger" onclick="delProg(${pi});event.stopPropagation()">🗑</button>` : ""}
          <span class="evchev">▾</span>
        </div>
      </div>
      <div class="evbody">
        ${designBlock}
      </div>
    </div></div>`;
  }).join("");
}

/* ════════════════════════════════
   SÉMINAIRES / FORMATIONS
════════════════════════════════ */
function renderSems() {
  const sems = getSems(), arbs = getArbs();
  const c = document.getElementById("semList");
  tempPresSem = {};
  if (!sems.length) { c.innerHTML = '<div class="empty">Aucun séminaire enregistré.</div>'; return; }
  c.innerHTML = sems.map((s, si) => {
    tempPresSem[si] = s.presence ? JSON.parse(JSON.stringify(s.presence)) : [];
    arbs.forEach(a => { const cle = clePresence(a); if (!tempPresSem[si].find(x => x.nom === cle)) tempPresSem[si].push({ nom: cle, present: false }); });
    const pc  = tempPresSem[si].filter(x => x.present && arbs.find(a => clePresence(a) === x.nom)).length;
    const pct = arbs.length ? Math.round(pc / arbs.length * 100) : 0;
    const col = tauxColor(pct);
    const rows = arbs.map(a => {
      const cle = clePresence(a);
      const pr  = tempPresSem[si].find(x => x.nom === cle) || { present: false };
      return `<tr>
        <td><span style="font-weight:600">${a.prenom||""}</span> <span style="text-transform:uppercase;font-size:.82rem;color:var(--muted)">${a.nom||""}</span></td>
        <td><span class="badge ${pr.present?"badge-y":"badge-n"}" data-badge="s-${si}-${cle}">${pr.present?"✓ Présent":"✗ Absent"}</span></td>
        ${isAdmin() ? `<td><label class="toggle-lbl">
          <input type="checkbox" class="toggle-inp" ${pr.present?"checked":""} onchange="toggleTempSem(${si},'${cle.replace(/'/g,"\\'")}')">
          <span class="toggle-track"></span></label></td>` : ""}
      </tr>`;
    }).join("");
    return `<div class="evwrap"><div class="evcard">
      <div class="evhdr" onclick="toggleEv(this)">
        <div class="evleft">
          <span class="evdate" style="background:linear-gradient(135deg,#1e3a5f,#2563eb)">🎓 ${s.date}</span>
          <div>
            <div class="evtitle">${s.titre}</div>
            <div class="evlieu">${s.theme ? "📌 " + s.theme : ""}${s.formateur ? " · 👤 " + s.formateur : ""}${s.lieu ? " · 📍 " + s.lieu : ""}</div>
          </div>
        </div>
        <div class="evright">
          <span class="evpct" style="background:${col}22;color:${col}">${pct}% présents</span>
          ${isAdmin()?`<button class="btn btn-xs btn-danger" onclick="delSem(${si});event.stopPropagation()">🗑</button>`:""}
          <span class="evchev">▾</span>
        </div>
      </div>
      <div class="evbody"><table>
        <tr><th>Arbitre</th><th>Statut</th>${isAdmin()?"<th>Modifier</th>":""}</tr>
        ${rows}
      </table></div>
    </div></div>`;
  }).join("");
}

/* ════════════════════════════════
   PERFORMANCES TERRAIN
════════════════════════════════ */
function renderPerfs() {
  const perfs = getPerfs(), arbs = getArbs();
  const c     = document.getElementById("perfList");
  const fArb  = document.getElementById("fPerfArb")?.value || "";

  const fEv = document.getElementById("fPerfEv")?.value || "";

  const sel = document.getElementById("fPerfArb");
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Tous les arbitres</option>' +
      arbs.map(a => { const cle = clePresence(a); return `<option value="${cle}" ${cle===cur?"selected":""}>${nomAffiche(a)}</option>`; }).join("");
  }

  const selEv = document.getElementById("fPerfEv");
  if (selEv) {
    const curEv = selEv.value;
    const progs = getProgs(), sems = getSems();
    selEv.innerHTML = '<option value="">Tous les événements</option>' +
      progs.map(p => `<option value="prog-${p.id}" ${curEv==="prog-"+p.id?"selected":""}>⚽ ${p.date} — ${p.titre}</option>`).join("") +
      sems.map(s  => `<option value="sem-${s.id}"  ${curEv==="sem-"+s.id ?"selected":""}>🎓 ${s.date} — ${s.titre}</option>`).join("");
  }

  const filtered = perfs.filter(p => {
    const arb = arbs.find(a => a.id === p.arbitre_id) || arbs.find(a => clePresence(a) === p.arbitre);
    const matchArb = !fArb || (arb && clePresence(arb) === fArb);
    if (!fEv) return matchArb;
    return matchArb && resolveEvenementKey(p) === fEv;
  });
  if (!filtered.length) { c.innerHTML = '<div class="empty">Aucune performance enregistrée.</div>'; return; }

  const sorted = [...filtered].sort((a, b) => (b.date||"").localeCompare(a.date||""));
  c.innerHTML = `<div class="perf-table-wrap"><table>
    <tr>
      <th>Date</th><th>Arbitre</th><th>Match / Événement</th>
      <th>Note /20</th><th>Matchs</th><th>Cartons</th><th>Commentaire</th>
      ${isAdmin() ? "<th>Actions</th>" : ""}
    </tr>
    ${sorted.map((p) => {
      const realIdx = perfs.indexOf(p);
      const arb = arbs.find(a => a.id === p.arbitre_id) || arbs.find(a => clePresence(a) === p.arbitre);
      const noteStr = p.note !== "" && p.note !== null && p.note !== undefined ? p.note : "—";
      const noteCol = (p.note !== "" && p.note !== null) ? noteColor(Number(p.note)) : "var(--muted)";
      return `<tr>
        <td style="white-space:nowrap">${p.date || "—"}</td>
        <td><span style="font-weight:600">${arb ? nomAffiche(arb) : p.arbitre}</span><br><span style="font-size:.72rem;color:var(--muted)">${arb ? gradeLabel(arb.grade) : ""}</span></td>
        <td>${p.match || "—"}</td>
        <td><span style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;color:${noteCol}">${noteStr}</span></td>
        <td style="text-align:center">${p.matchs || 0}</td>
        <td style="text-align:center">${p.cartons || 0}</td>
        <td style="max-width:180px;font-size:.82rem;color:var(--muted)">${p.commentaire || "—"}</td>
        ${isAdmin() ? `<td style="white-space:nowrap">
          <button class="btn btn-xs btn-gold" onclick="openPerfModal(${realIdx})">✏</button>
          <button class="btn btn-xs btn-danger" onclick="delPerf(${realIdx})">🗑</button>
        </td>` : ""}
      </tr>`;
    }).join("")}
  </table></div>`;
}

/* ════════════════════════════════
   STATISTIQUES
════════════════════════════════ */
function renderStats() {
  const arbs  = getArbs();
  const progs = getProgs();
  const sems  = getSems();
  const perfs = getPerfs();
  const sg    = document.getElementById("statsGrid");
  const ss    = document.getElementById("statsSummary");
  if (!arbs.length) { sg.innerHTML = '<div class="empty">Aucun arbitre.</div>'; ss.innerHTML = ""; return; }

  const data = arbs.map(a => {
    const cle = clePresence(a);
    const tp  = computeTaux(cle, progs);
    const ts  = computeTauxSem(cle, sems);
    const pf  = computePerf(cle, perfs, a.id);
    return { ...a, ...tp, tauxSem: ts.taux, semTotal: ts.total, semPresent: ts.present, perf: pf };
  }).sort((a, b) => (b.taux ?? -1) - (a.taux ?? -1));

  let tot = 0, pres = 0; progs.forEach(p => p.presence?.forEach(r => { tot++; if (r.present) pres++; }));
  let stot = 0, spres = 0; sems.forEach(s => s.presence?.forEach(r => { stot++; if (r.present) spres++; }));
  const g75  = data.filter(a => a.taux !== null && a.taux >= 75).length;
  const topP = data.find(a => a.perf.moyNote !== null);

  ss.innerHTML = `
    <div class="sum-card"><div class="sum-n" style="color:var(--g900)">${tot?Math.round(pres/tot*100):0}%</div><div class="sum-l">Présence matchs</div></div>
    <div class="sum-card"><div class="sum-n" style="color:#2563eb">${stot?Math.round(spres/stot*100):0}%</div><div class="sum-l">Présence séminaires</div></div>
    <div class="sum-card"><div class="sum-n" style="color:var(--gold)">${g75}</div><div class="sum-l">Arbitres ≥ 75%</div></div>
    <div class="sum-card"><div class="sum-n" style="color:${topP?noteColor(topP.perf.moyNote):"var(--muted)"};font-size:${topP?"1.5rem":"2rem"}">${topP?topP.perf.moyNote+"/20":"—"}</div><div class="sum-l">Meilleure note moy.</div></div>`;

  const rk = i => i===0?"gold":i===1?"silver":i===2?"bronze":"";
  const md = i => i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1;

  sg.innerHTML = data.map((a, i) => {
    const tv   = a.taux ?? 0, col = a.taux !== null ? tauxColor(tv) : "var(--muted)";
    const tsv  = a.tauxSem ?? 0;
    const note = a.perf.moyNote;
    return `<div class="srow">
      <div class="srank ${rk(i)}">${md(i)}</div>
      <img class="savatar" src="${avatarSrc(a)}" alt="${nomAffiche(a)}">
      <div class="sinfo">
        <div class="sname">${nomAffiche(a)}</div>
        <div class="sgrade">${gradeLabel(a.grade)}</div>
        <div class="stat-mini-row">
          <span style="color:${col};font-size:.8rem;font-weight:600">⚽ ${a.taux!==null?tv+"%":"—"}</span>
          <span style="color:#2563eb;font-size:.8rem;font-weight:600">🎓 ${a.tauxSem!==null?tsv+"%":"—"}</span>
          <span style="color:${note!==null?noteColor(note):"var(--muted)"};font-size:.8rem;font-weight:600">⭐ ${note!==null?note+"/20":"—"}</span>
        </div>
        <div class="progress"><div class="progress-bar" style="width:${tv}%;background:${col}"></div></div>
      </div>
      <div style="text-align:right">
        <div class="snum" style="color:${col}">${a.taux!==null?tv+"%":"—"}</div>
        <div class="smatch">${a.present}/${a.total} matchs</div>
        <div class="smatch">${a.perf.totalMatchs} arbitrés</div>
      </div>
    </div>`;
  }).join("");
}

/* ════════════════════════════════
   COMPTES ADMIN (Super Admin uniquement)
   (fonctionnalité manquante à l'origine — corrigée)
════════════════════════════════ */
function renderComptes() {
  const list = document.getElementById("comptesList");
  if (!list) return;
  const comptes = getComptes();
  if (!comptes.length) { list.innerHTML = '<div class="empty">Aucun compte créé.</div>'; return; }
  list.innerHTML = comptes.map((c, i) => `
    <div style="display:flex;align-items:center;gap:14px;padding:12px 18px;border-bottom:1px solid var(--border)">
      <div style="width:42px;height:42px;border-radius:50%;background:var(--g900);color:#fff;font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(c.nom||"?")[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700">${c.nom}</div>
        <div style="font-size:.8rem;color:var(--muted)">${c.email}</div>
      </div>
      <span class="badge ${c.actif ? "badge-y" : "badge-n"}" style="cursor:pointer" onclick="toggleActifCompte(${i})">${c.actif ? "✓ Actif" : "✗ Inactif"}</span>
      <button class="btn btn-xs btn-gold" onclick="openCompteModal(${i})">✏</button>
      <button class="btn btn-xs btn-danger" onclick="deleteCompte(${i})">🗑</button>
    </div>`).join("");
}

/* ════════════════════════════════
   ACCORDÉON
════════════════════════════════ */
function toggleEv(hdr) {
  const body = hdr.nextElementSibling, chev = hdr.querySelector(".evchev");
  body.classList.toggle("open"); chev.classList.toggle("open");
}