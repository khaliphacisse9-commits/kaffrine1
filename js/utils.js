/* utils.js — Helpers partagés */

let _toastTimer;
function toast(msg, type="ok", dur=3000) {
  const el=document.getElementById("toast");
  el.textContent=msg; el.className="show"+(type==="err"?" err":"");
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>el.classList.remove("show"),dur);
}
function tauxColor(t){if(t>=75)return"var(--g900)";if(t>=50)return"var(--gold)";return"var(--red)";}
function noteColor(n){if(n>=16)return"var(--g900)";if(n>=12)return"var(--gold)";if(n>=8)return"#f97316";return"var(--red)";}
function avatarSrc(a){if(a.photo)return a.photo;const i=`${(a.prenom||"")[0]||""}${(a.nom||"")[0]||""}`;return`https://ui-avatars.com/api/?name=${encodeURIComponent(i)}&background=0a5c1e&color=fff&bold=true&size=120`;}
const GRADES={Eleve:"Élève Arbitre",District:"Arbitre District",Ligue:"Arbitre Ligue",Federal:"Arbitre Fédéral",Inspecteur:"Inspecteur"};
function gradeLabel(g){return GRADES[g]||g;}
function computeTaux(cle,progs){let t=0,p=0;progs.forEach(x=>{if(x.presence){const r=x.presence.find(y=>y.nom===cle);if(r){t++;if(r.present)p++;}}});return{total:t,present:p,taux:t?Math.round(p/t*100):null};}
function computeTauxSem(cle,sems){let t=0,p=0;sems.forEach(x=>{if(x.presence){const r=x.presence.find(y=>y.nom===cle);if(r){t++;if(r.present)p++;}}});return{total:t,present:p,taux:t?Math.round(p/t*100):null};}
function computePerf(cle,perfs,id){const e=perfs.filter(p=>p.arbitre===cle||(id!=null&&p.arbitre_id===id));if(!e.length)return{nb:0,moyNote:null,totalMatchs:0,totalCartons:0};const wn=e.filter(p=>p.note!==""&&p.note!==null&&p.note!==undefined);const mn=wn.length?Math.round((wn.reduce((s,p)=>s+Number(p.note),0)/wn.length)*10)/10:null;return{nb:e.length,moyNote:mn,totalMatchs:e.reduce((s,p)=>s+(Number(p.matchs)||0),0),totalCartons:e.reduce((s,p)=>s+(Number(p.cartons)||0),0)};}
/* Retrouve la clé "prog-<id>"/"sem-<id>" réelle d'une performance, même si son
   evenementId a été enregistré avec l'ancien système (basé sur la position). */
function resolveEvenementKey(p){
  const progs=getProgs(),sems=getSems();
  if(p.evenementId){
    const [type,id]=String(p.evenementId).split('-');
    if(type==='prog'&&progs.some(x=>String(x.id)===id)) return p.evenementId;
    if(type==='sem'&&sems.some(x=>String(x.id)===id)) return p.evenementId;
  }
  const prog=progs.find(x=>x.date===p.date&&x.titre===p.match);
  if(prog) return 'prog-'+prog.id;
  const sem=sems.find(x=>x.date===p.date&&x.titre===p.match);
  if(sem) return 'sem-'+sem.id;
  return p.evenementId||'';
}
function compressImage(file,cb){const r=new FileReader();r.onload=e=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");const S=300;let w=img.width,h=img.height;if(w>h){h*=S/w;w=S;}else{w*=S/h;h=S;}c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);cb(c.toDataURL("image/jpeg",0.75));};img.src=e.target.result;};r.readAsDataURL(file);}
function _today(){return new Date().toISOString().slice(0,10);}
function _dl(csv,filename){const l=document.createElement("a");l.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));l.download=filename;l.click();}

function exportCSV(){let csv="\uFEFFPrénom,Nom,Grade,Programme,Date,Lieu,Présence\n";getProgs().forEach(p=>{getArbs().forEach(a=>{const cle=clePresence(a);const pr=p.presence?.find(x=>x.nom===cle);csv+=`"${a.prenom||""}","${a.nom||""}","${gradeLabel(a.grade)}","${p.titre}","${p.date}","${p.lieu||""}","${pr?.present?"Présent":"Absent"}"\n`;});});_dl(csv,`presences_matchs_${_today()}.csv`);}
function exportCSVSem(){let csv="\uFEFFPrénom,Nom,Grade,Séminaire,Date,Lieu,Thème,Formateur,Présence\n";getSems().forEach(s=>{getArbs().forEach(a=>{const cle=clePresence(a);const pr=s.presence?.find(x=>x.nom===cle);csv+=`"${a.prenom||""}","${a.nom||""}","${gradeLabel(a.grade)}","${s.titre}","${s.date}","${s.lieu||""}","${s.theme||""}","${s.formateur||""}","${pr?.present?"Présent":"Absent"}"\n`;});});_dl(csv,`presences_seminaires_${_today()}.csv`);}
function exportCSVPerf(){let csv="\uFEFFPrénom,Nom,Grade,Match/Événement,Date,Note/20,Matchs,Cartons,Commentaire\n";getPerfs().forEach(p=>{const arb=getArbs().find(a=>a.id===p.arbitre_id)||getArbs().find(a=>clePresence(a)===p.arbitre);csv+=`"${arb?.prenom||""}","${arb?.nom||""}","${gradeLabel(arb?.grade||"")}","${p.match||""}","${p.date||""}","${p.note||""}","${p.matchs||0}","${p.cartons||0}","${(p.commentaire||"").replace(/"/g,"'")}"\n`;});_dl(csv,`performances_${_today()}.csv`);}

/* ══ EXPORTS PDF ══ */
/* Préchargement du logo : détouré en cercle, fond transparent, haute définition */
let _logoDataUrl=null;
(function _preloadLogo(){
  const img=new Image();
  img.onload=function(){
    try{
      const S=240;
      const c=document.createElement('canvas');
      c.width=S;c.height=S;
      const ctx=c.getContext('2d');
      ctx.save();
      ctx.beginPath();
      ctx.arc(S/2,S/2,S/2,0,Math.PI*2);
      ctx.closePath();
      ctx.clip();
      const ratio=Math.max(S/img.naturalWidth,S/img.naturalHeight);
      const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
      ctx.drawImage(img,(S-w)/2,(S-h)/2,w,h);
      ctx.restore();
      _logoDataUrl=c.toDataURL('image/png');
    }catch(e){_logoDataUrl=null;}
  };
  img.onerror=function(){_logoDataUrl=null;};
  img.src='logo.png';
})();
function _pdfInit(o='portrait'){const{jsPDF}=window.jspdf;return new jsPDF({orientation:o,unit:'mm',format:'a4'});}
function _pdfHeader(doc,titre){
  const W=doc.internal.pageSize.getWidth();
  const cx=16,cy=12,r=8.5; // centre et rayon du médaillon logo
  doc.setFillColor(10,92,30);
  doc.rect(0,0,W,24,'F');
  const textX=_logoDataUrl?cx+r+6:10;
  if(_logoDataUrl){
    try{
      doc.setFillColor(255,255,255);
      doc.circle(cx,cy,r,'F');
      doc.addImage(_logoDataUrl,'PNG',cx-r+0.6,cy-r+0.6,(r-0.6)*2,(r-0.6)*2);
      doc.setDrawColor(212,160,23);
      doc.setLineWidth(0.6);
      doc.circle(cx,cy,r,'S');
    }catch(e){}
  }
  doc.setTextColor(255,255,255);
  doc.setFontSize(11);
  doc.setFont('helvetica','bold');
  doc.text('COMMISSION RÉGIONALE DES ARBITRES',textX,cy-1.5);
  doc.setFontSize(8);
  doc.setFont('helvetica','normal');
  doc.setTextColor(220,235,220);
  doc.text('Kaffrine',textX,cy+4);
  doc.setFontSize(7.5);
  doc.setTextColor(230,230,230);
  doc.text('Généré le '+new Date().toLocaleDateString('fr-FR'),W-10,8,{align:'right'});
  doc.setTextColor(10,92,30);
  doc.setFontSize(14);
  doc.setFont('helvetica','bold');
  doc.text(titre,10,32);
  doc.setDrawColor(212,160,23);
  doc.setLineWidth(0.6);
  doc.line(10,35.5,W-10,35.5);
  doc.setTextColor(0,0,0);
  doc.setFont('helvetica','normal');
}
function _pdfFooter(doc){
  const pages=doc.internal.getNumberOfPages();
  const W=doc.internal.pageSize.getWidth();
  const H=doc.internal.pageSize.getHeight();
  for(let i=1;i<=pages;i++){
    doc.setPage(i);
    doc.setDrawColor(212,160,23);
    doc.setLineWidth(0.3);
    doc.line(10,H-14,W-10,H-14);
    doc.setFontSize(7.5);
    doc.setFont('helvetica','normal');
    doc.setTextColor(120,120,120);
    doc.text('Commission Régionale des Arbitres — Kaffrine',10,H-9);
    doc.text('Page '+i+' / '+pages,W/2,H-9,{align:'center'});
    doc.text('Document à usage officiel',W-10,H-9,{align:'right'});
  }
}
function _pdfTable(doc,head,body){doc.autoTable({startY:40,head:[head],body,headStyles:{fillColor:[10,92,30],textColor:255,fontStyle:'bold',fontSize:8},alternateRowStyles:{fillColor:[240,248,240]},styles:{fontSize:8,cellPadding:3,overflow:'linebreak'},margin:{left:10,right:10}});}

function exportPDFArbitres(){const doc=_pdfInit();_pdfHeader(doc,'Liste des Arbitres');const arbs=getArbs(),progs=getProgs(),sems=getSems(),perfs=getPerfs();const body=arbs.map((a,i)=>{const tp=computeTaux(clePresence(a),progs);const ts=computeTauxSem(clePresence(a),sems);const pf=computePerf(clePresence(a),perfs,a.id);return[i+1,a.prenom||'',(a.nom||'').toUpperCase(),gradeLabel(a.grade),tp.taux!==null?tp.taux+'%':'—',ts.taux!==null?ts.taux+'%':'—',pf.moyNote!==null?pf.moyNote+'/20':'—'];});_pdfTable(doc,['#','Prénom','Nom','Grade','Présence Matchs','Présence Séminaires','Note Moy.'],body);_pdfFooter(doc);doc.save('arbitres_kaffrine_'+_today()+'.pdf');toast('✅ PDF Arbitres téléchargé !');}

function exportPDFBureau(){const doc=_pdfInit();_pdfHeader(doc,'Bureau CRA & S/CRA');const bureau=getBureau();const body=POSTES_BUREAU.map(p=>{const m=bureau[p.id];return[p.org,p.label,membreNom(m)!=='Poste vacant'?membreNom(m):'—',membreGrade(m)||'—',m?.dateDebut||'—',m?.tel||'—'];});_pdfTable(doc,['Organisation','Poste','Titulaire','Grade','Depuis','Téléphone'],body);_pdfFooter(doc);doc.save('bureau_cra_'+_today()+'.pdf');toast('✅ PDF Bureau téléchargé !');}

function exportPDFProgrammes(){const doc=_pdfInit('landscape');_pdfHeader(doc,'Programmes & Désignations');const body=getProgs().map(p=>{const d=p.designation||{};return[p.date||'—',p.heure||'—',p.titre||'—',p.lieu||'—',d.ac?nomDepuisCle(d.ac):'—',d.aa1?nomDepuisCle(d.aa1):'—',d.aa2?nomDepuisCle(d.aa2):'—',d.arb4?nomDepuisCle(d.arb4):'—',p.inspecteur?.nom||'—'];});_pdfTable(doc,['Date','Heure','Titre','Lieu','AC','AA1','AA2','4e Arb.','Inspecteur'],body);_pdfFooter(doc);doc.save('programmes_'+_today()+'.pdf');toast('✅ PDF Programmes téléchargé !');}

function exportPDFSem(){const doc=_pdfInit('landscape');_pdfHeader(doc,'Séminaires & Formations');const sems=getSems(),arbs=getArbs();const body=[];sems.forEach(s=>{arbs.forEach(a=>{const pr=s.presence?.find(x=>x.nom===clePresence(a));body.push([s.date||'—',s.titre||'—',s.theme||'—',s.formateur||'—',a.prenom||'',(a.nom||'').toUpperCase(),gradeLabel(a.grade),pr?.present?'Présent':'Absent']);});});doc.autoTable({startY:40,head:[['Date','Séminaire','Thème','Formateur','Prénom','Nom','Grade','Présence']],body,headStyles:{fillColor:[10,92,30],textColor:255,fontStyle:'bold',fontSize:8},alternateRowStyles:{fillColor:[240,248,240]},styles:{fontSize:8,cellPadding:3},margin:{left:10,right:10},didParseCell(d){if(d.section==='body'&&d.column.index===7){d.cell.styles.textColor=d.cell.raw==='Présent'?[10,92,30]:[200,30,30];d.cell.styles.fontStyle='bold';}}});_pdfFooter(doc);doc.save('seminaires_'+_today()+'.pdf');toast('✅ PDF Séminaires téléchargé !');}

function exportPDFPerf(){const doc=_pdfInit('landscape');_pdfHeader(doc,'Performances Terrain');const arbs=getArbs();const body=getPerfs().map(p=>{const arb=arbs.find(a=>a.id===p.arbitre_id)||arbs.find(a=>clePresence(a)===p.arbitre);return[p.date||'—',arb?nomAffiche(arb):'—',arb?gradeLabel(arb.grade):'—',p.match||'—',p.note!==null&&p.note!==''?p.note+'/20':'—',p.matchs||0,p.cartons||0,p.commentaire||'—'];});_pdfTable(doc,['Date','Arbitre','Grade','Match / Événement','Note','Matchs','Cartons','Commentaire'],body);_pdfFooter(doc);doc.save('performances_'+_today()+'.pdf');toast('✅ PDF Performances téléchargé !');}

function exportPDFStats(){const doc=_pdfInit();_pdfHeader(doc,'Statistiques Générales');const arbs=getArbs(),progs=getProgs(),sems=getSems(),perfs=getPerfs();const data=arbs.map(a=>{const tp=computeTaux(clePresence(a),progs);const ts=computeTauxSem(clePresence(a),sems);const pf=computePerf(clePresence(a),perfs,a.id);return{a,tp,ts,pf};}).sort((x,y)=>(y.tp.taux??-1)-(x.tp.taux??-1));const medals=['Or','Argent','Bronze'];const body=data.map(({a,tp,ts,pf},i)=>[i<3?medals[i]:i+1,nomAffiche(a),gradeLabel(a.grade),tp.taux!==null?tp.taux+'%':'—',tp.present+'/'+tp.total,ts.taux!==null?ts.taux+'%':'—',ts.present+'/'+ts.total,pf.moyNote!==null?pf.moyNote+'/20':'—',pf.totalMatchs,pf.totalCartons]);_pdfTable(doc,['','Arbitre','Grade','Taux M.','Matchs','Taux S.','Sémin.','Note Moy.','Total','Cartons'],body);_pdfFooter(doc);doc.save('statistiques_'+_today()+'.pdf');toast('✅ PDF Statistiques téléchargé !');}