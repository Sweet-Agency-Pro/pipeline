export type ClientStatus =
  | "prospect"
  | "contacte"
  | "qualifie"
  | "proposition"
  | "negociation"
  | "gagne"
  | "perdu";

export type ProjectStatus =
  | "en_attente"
  | "en_cours"
  | "pas_de_retours"
  | "termine"
  | "en_pause"
  | "annule"
  | "archive";

export type UserRole = "admin" | "user";

export type RdvStatus = "planifie" | "confirme" | "annule" | "termine";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: ClientStatus;
  source: string | null;
  github_url: string | null;
  estimated_amount: number;
  notes: string | null;
  last_contacted_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_profile?: Profile;
}

export interface Project {
  id: string;
  name: string;
  client_id: string;
  status: ProjectStatus;
  budget: number;
  deadline: string | null;
  description: string | null;
  github_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields
  profile?: Profile;
}

export interface RendezVous {
  id: string;
  title: string;
  client_id: string | null;
  assigned_to: string;
  start_time: string;
  end_time: string;
  location: string | null;
  description: string | null;
  status: RdvStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  assigned_profile?: Profile;
}

export interface BusySlot {
  start: string;
  end: string;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string | null;
  allDay: boolean;
  calendarId: string;
}

export interface CalendarAvailability {
  [calendarId: string]: BusySlot[];
}

// Status display helpers
export const CLIENT_STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; color: string; bgColor: string }
> = {
  prospect: {
    label: "Prospect",
    color: "text-slate-300",
    bgColor: "bg-slate-700/60",
  },
  contacte: {
    label: "Contacté",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15",
  },
  qualifie: {
    label: "Qualifié",
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
  },
  proposition: {
    label: "Proposition",
    color: "text-purple-400",
    bgColor: "bg-purple-500/15",
  },
  negociation: {
    label: "Négociation",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
  },
  gagne: {
    label: "Gagné",
    color: "text-teal-400",
    bgColor: "bg-teal-500/15",
  },
  perdu: {
    label: "Perdu",
    color: "text-red-400",
    bgColor: "bg-red-500/15",
  },
};

export const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string; bgColor: string }
> = {
  en_attente: {
    label: "En attente",
    color: "text-slate-400",
    bgColor: "bg-slate-500/15",
  },
  en_cours: {
    label: "En cours",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15",
  },
  pas_de_retours: {
    label: "Pas de retours",
    color: "text-rose-400",
    bgColor: "bg-rose-500/15",
  },
  termine: {
    label: "Terminé",
    color: "text-teal-400",
    bgColor: "bg-teal-500/15",
  },
  en_pause: {
    label: "En pause",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
  },
  annule: {
    label: "Annulé",
    color: "text-red-400",
    bgColor: "bg-red-500/15",
  },
  archive: {
    label: "Archivé",
    color: "text-slate-500",
    bgColor: "bg-slate-700/15",
  },
};

export const CLIENT_SOURCES = [
  "Bouche à oreille",
  "LinkedIn",
  "Site web",
  "Salon / Événement",
  "Recommandation",
  "Publicité",
  "Autre",
];

export const RDV_STATUS_CONFIG: Record<
  RdvStatus,
  { label: string; color: string; bgColor: string }
> = {
  planifie: {
    label: "Planifié",
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
  },
  confirme: {
    label: "Confirmé",
    color: "text-teal-400",
    bgColor: "bg-teal-500/15",
  },
  annule: {
    label: "Annulé",
    color: "text-red-400",
    bgColor: "bg-red-500/15",
  },
  termine: {
    label: "Terminé",
    color: "text-slate-400",
    bgColor: "bg-slate-500/15",
  },
};
