/* ══════════════════════════════════════
   nav.js — Navigation entre pages (SPA)
   Gestion des onglets et transitions
══════════════════════════════════════ */

/**
 * Naviguer vers une page
 * @param {string} pageId  - ID de l'élément .page cible
 * @param {Element} tabEl  - Élément .tab cliqué (optionnel)
 */
function goTo(pageId, tabEl) {
  // Désactiver toutes les pages
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  // Désactiver tous les onglets
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

  // Activer la page cible
  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");

  // Activer l'onglet correspondant
  if (tabEl) {
    tabEl.classList.add("active");
  } else {
    // Trouver l'onglet par data-page si tabEl non fourni
    const matchTab = document.querySelector(`.tab[data-page="${pageId}"]`);
    if (matchTab) matchTab.classList.add("active");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Retourner tous les onglets de la barre
 */
function getTabs() {
  return document.querySelectorAll(".tab");
}

/**
 * Activer un onglet par index (0=dashboard, 1=arbitres, etc.)
 */
function goToIndex(index) {
  const tabs = getTabs();
  if (tabs[index]) tabs[index].click();
}
