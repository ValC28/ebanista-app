// ebanista-core.js — Fonctions partagées index.html + display.html

/**
 * Calcule le pourcentage d'avancement global d'un projet.
 * Compte : lancement (4 sous-listes) + contrôle atelier + suivi installation.
 */
function calcProgress(p) {
  let done = 0, total = 0;
  const addArr = arr => { total += arr.length; done += arr.filter(Boolean).length; };
  const addObj = arr => { total += arr.length; done += arr.filter(x => x.done).length; };
  if (p.lancement) addArr([
    ...(p.lancement.dossierTech     || []),
    ...(p.lancement.fichiersProd    || []),
    ...(p.lancement.matieresFourn   || []),
    ...(p.lancement.pointsCritiques || []),
  ]);
  if (p.atelier?.controleQualite) addObj(p.atelier.controleQualite);
  if (p.pose?.suiviInstallation)  addArr(p.pose.suiviInstallation);
  return total ? Math.round(done / total * 100) : 0;
}

/**
 * Retourne la couleur CSS correspondant à un pourcentage d'avancement.
 * Utilise les variables CSS --gray2, --red, --orange, --blue, --green
 * définies dans le :root de chaque page.
 */
function progressColor(pct) {
  if (pct === 0)  return 'var(--gray2)';
  if (pct < 34)   return 'var(--red)';
  if (pct < 67)   return 'var(--orange)';
  if (pct < 100)  return 'var(--blue)';
  return 'var(--green)';
}

/**
 * Retourne le nombre de jours ouvrables (lun–ven) jusqu'à dateStr.
 * Retourne -1 si la date est passée, 0 si c'est aujourd'hui, null si pas de date.
 */
function workingDaysLeft(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  if (target - today < 0) return -1;
  if (target - today === 0) return 0;
  let count = 0;
  const d = new Date(today);
  while (d < target) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}
