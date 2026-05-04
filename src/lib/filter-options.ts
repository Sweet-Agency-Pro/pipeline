export interface FilterOption {
  value: string;
  label: string;
}

export const CLIENT_SORT_OPTIONS: FilterOption[] = [
  { value: "created_at:desc", label: "Plus récent" },
  { value: "created_at:asc", label: "Plus ancien" },
  { value: "last_name:asc", label: "Nom A→Z" },
  { value: "last_name:desc", label: "Nom Z→A" },
  { value: "estimated_amount:desc", label: "Montant ↓" },
  { value: "estimated_amount:asc", label: "Montant ↑" },
];

export const PROJECT_SORT_OPTIONS: FilterOption[] = [
  { value: "created_at:desc", label: "Plus récents" },
  { value: "created_at:asc", label: "Plus anciens" },
  { value: "budget:desc", label: "Plus gros budget" },
  { value: "name:asc", label: "Nom (A-Z)" },
  { value: "deadline:asc", label: "Échéance proche" },
];

export const RDV_FILTER_OPTIONS: FilterOption[] = [
  { value: "Pertinence", label: "Pertinence" },
  { value: "Futurs", label: "Futurs" },
  { value: "Passés", label: "Passés" },
];