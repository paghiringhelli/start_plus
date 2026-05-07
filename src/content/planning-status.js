import planningStatusCsv from '../../resources/planning_status.csv?raw'

const DEFAULT_PLANNING_STATUS = [
  { code: 1, libelle: 'GR_SERV', couleur: '#c8ff00', bulle_d_aide: 'Groupe de service', priorite_etat: 10 },
  { code: 2, libelle: 'RENF_1', couleur: '#aae1ff', bulle_d_aide: 'Renfort 1', priorite_etat: 20 },
  { code: 3, libelle: 'RENF_2', couleur: '#33a8ff', bulle_d_aide: 'Renfort 2', priorite_etat: 25 },
  { code: 7, libelle: 'ABSENT', couleur: '#000000', bulle_d_aide: 'Absent', priorite_etat: 109 },
  { code: 9, libelle: 'RENF_3', couleur: '#3d79c2', bulle_d_aide: 'Renfort 3', priorite_etat: 30 },
  { code: 10, libelle: 'RENF_4', couleur: '#475185', bulle_d_aide: 'Renfort 4', priorite_etat: 35 },
  { code: 11, libelle: 'RENF_5', couleur: '#475185', bulle_d_aide: 'Renfort 5', priorite_etat: 40 },
  { code: 26, libelle: 'DISPO_ALARME', couleur: '#ffe100', bulle_d_aide: 'Disponible pour alarme', priorite_etat: 15 },
  { code: 28, libelle: 'CADRE_ECA', couleur: '#a851ff', bulle_d_aide: 'Cadre cours ECAFORM', priorite_etat: 100 },
  { code: 29, libelle: 'ELEVE_ECA', couleur: '#cf9fff', bulle_d_aide: 'Élève cours ECAFORM', priorite_etat: 101 },
  { code: 30, libelle: 'EXERCICE', couleur: '#5a3282', bulle_d_aide: 'Cours SDIS', priorite_etat: 102 },
  { code: 31, libelle: 'GARDE', couleur: '#ff96c8', bulle_d_aide: 'Garde', priorite_etat: 103 },
  { code: 32, libelle: 'RESERVE', couleur: '#ff8000', bulle_d_aide: 'Réserve pour alarme', priorite_etat: 62 },
  { code: 35, libelle: 'MAL_ACC', couleur: '#000000', bulle_d_aide: 'Maladie Accident', priorite_etat: 114 },
  { code: 37, libelle: 'PLAN_SPECIALIST', couleur: '#e6e6e6', bulle_d_aide: 'Planning spécialiste', priorite_etat: 112 },
  { code: 38, libelle: 'NON_RENSEIGNE', couleur: '#afafaf', bulle_d_aide: 'Non renseigné', priorite_etat: 110 },
  { code: 40, libelle: 'PERM_SEULE', couleur: '#00ff00', bulle_d_aide: 'Permanence seule', priorite_etat: 5 },
  { code: 41, libelle: 'GR_SERV_MANUEL', couleur: '#008000', bulle_d_aide: 'Groupe de service manuel', priorite_etat: 9 },
  { code: 42, libelle: 'INTERVENTIONS', couleur: '#2596be', bulle_d_aide: 'Interventions', priorite_etat: 0 },
  { code: 43, libelle: 'PLAN_SPEC_ACTIF', couleur: '#ff0000', bulle_d_aide: 'Spécialiste actif', priorite_etat: 4 },
  { code: 44, libelle: 'OCCUPE', couleur: '#5b5b5b', bulle_d_aide: 'Occupé', priorite_etat: 113 },
]

function parsePlanningStatusCsv(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) {
    return []
  }

  const rows = []
  for (const line of lines.slice(1)) {
    const parts = line.split(',').map((part) => part.trim())
    if (parts.length < 5) {
      continue
    }

    const code = Number.parseInt(parts[0], 10)
    const bulle_d_aide = parts[1]
    const priorite_etat = Number.parseInt(parts[2], 10)
    const libelle = parts[3]
    const couleur = parts[4].toLowerCase() === '#ffffff' && libelle.toUpperCase() === 'VIERGE'
      ? '#afafaf'
      : parts[4]

    if (!Number.isFinite(code) || !Number.isFinite(priorite_etat) || !libelle) {
      continue
    }

    rows.push({
      code,
      bulle_d_aide,
      priorite_etat,
      libelle,
      couleur,
    })
  }

  return rows
}

const PLANNING_STATUS = parsePlanningStatusCsv(planningStatusCsv)

export const PLANNING_STATUS_BY_LIBELLE = new Map(
  (PLANNING_STATUS.length > 0 ? PLANNING_STATUS : DEFAULT_PLANNING_STATUS)
    .map((status) => [status.libelle.toLowerCase(), status]),
)
