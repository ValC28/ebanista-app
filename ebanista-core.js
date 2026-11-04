// ebanista-core.js — Fonctions partagées index.html + display.html

/**
 * Jalons de suivi (remplacent les anciennes listes de cases à cocher).
 * Trois groupes : lancement (bureau d'études / achats), atelier, pose.
 */
const JALONS = {
  lancement: [
    { k: 'plans',              label: 'Plans validés' },
    { k: 'cnc',                label: 'Fichiers CNC prêts' },
    { k: 'matieresCommandees', label: 'Matières commandées' },
  ],
  atelier: [
    { k: 'matieresRecues',     label: 'Matières reçues' },
    { k: 'fabrique',           label: 'Fabrication terminée' },
    { k: 'controle',           label: 'Contrôle qualité OK' },
  ],
  pose: [
    { k: 'docsTransmis',       label: 'Dossier transmis aux poseurs' },
    { k: 'posee',              label: 'Pose terminée' },
    { k: 'reservesLevees',     label: 'Pas de réserve / réserves levées' },
  ],
};

/** Référence affichée d'un projet : CL-xxxx, ou à défaut l'ancienne référence EBA-… */
function projectRef(p) {
  const id = p.identification || {};
  return id.codeProjet || id.codeLegacy || '';
}

const _allTrue = arr => Array.isArray(arr) && arr.length > 0 && arr.every(Boolean);
const _allDone = arr => Array.isArray(arr) && arr.length > 0 && arr.every(x => x && x.done);

/**
 * Calcule les jalons d'un projet ancien (listes de cases) pour reprendre
 * l'avancement existant. N'écrit rien dans le projet.
 */
function deriveJalons(p) {
  const l = p.lancement || {}, a = p.atelier || {}, ps = p.pose || {};
  const controle = _allDone(a.controleQualite);
  const fabrique = controle || (Array.isArray(a.meubles) && a.meubles.length > 0 && a.meubles.every(m => m.done));
  const posee = _allTrue(ps.suiviInstallation);
  return {
    plans:              _allTrue(l.dossierTech),
    cnc:                _allTrue(l.fichiersProd),
    matieresCommandees: _allTrue(l.matieresFourn),
    matieresRecues:     fabrique || (Array.isArray(a.quincaillerie) && a.quincaillerie.some(x => x.done)),
    fabrique,
    controle,
    docsTransmis:       _allTrue(ps.documentsTransmis),
    posee,
    reservesLevees:     posee && !((ps.reserves || '').trim()),
  };
}

/** Jalons d'un projet (ceux enregistrés, sinon ceux déduits de l'ancien format). */
function getJalons(p) {
  return p.jalons || deriveJalons(p);
}

/** Garantit que le projet porte ses jalons (migration à la première ouverture). */
function ensureJalons(p) {
  if (!p.jalons) p.jalons = deriveJalons(p);
  return p;
}

function _groupProgress(p, group) {
  const j = getJalons(p);
  const list = JALONS[group];
  return { done: list.filter(x => j[x.k]).length, total: list.length };
}

/**
 * Calcule le pourcentage d'avancement global d'un projet
 * (9 jalons : lancement, atelier, pose).
 */
function calcProgress(p) {
  let done = 0, total = 0;
  for (const g of Object.keys(JALONS)) {
    const s = _groupProgress(p, g);
    done += s.done; total += s.total;
  }
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
 * Pourcentage d'avancement du lancement (plans, CNC, matières commandées).
 */
function launchProgress(p) {
  const s = _groupProgress(p, 'lancement');
  return s.total ? Math.round(s.done / s.total * 100) : 0;
}

/**
 * Pourcentage d'avancement de l'atelier (matières reçues, fabrication, contrôle).
 */
function atelierProgress(p) {
  const s = _groupProgress(p, 'atelier');
  return s.total ? Math.round(s.done / s.total * 100) : 0;
}

/**
 * Catégorie d'avancement (0-4) utilisée pour les onglets du dashboard
 * et les colonnes du tableau de bord atelier :
 * 0 Nouveau · 1 En étude · 2 En production · 3 Prêt à livrer · 4 Clôturé
 */
function getDisplayStatus(p) {
  if (p.archived) return 4; // Clôturé (fermé manuellement)
  const lp = launchProgress(p);
  const ap = atelierProgress(p);
  if (lp === 0)               return 0; // Nouveau
  if (lp < 100)                return 1; // En étude
  if (lp === 100 && ap < 100)  return 2; // En production
  return 3;                              // Prêt à livrer
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
