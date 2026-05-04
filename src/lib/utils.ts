import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeDate(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return formatDate(date);
}

export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Affiche le nom d'un client/prospect de façon intelligente.
 * Si first_name est vide ou "-", fallback sur company ou last_name.
 */
export function displayClientName(client: {
  first_name: string;
  last_name: string;
  company?: string | null;
}): string {
  if (client.first_name && client.first_name !== "-" && client.first_name.trim()) {
    return `${client.first_name} ${client.last_name}`;
  }
  return client.company || client.last_name;
}

/**
 * Génère un label complet pour un client (nom + entreprise entre parenthèses).
 * Utilisé par les selects de RDV et les boutons "Planifier".
 */
export function getClientLabel(client: {
  first_name: string;
  last_name: string;
  company?: string | null;
}): string {
  return `${client.first_name} ${client.last_name}${client.company ? ` (${client.company})` : ""}`;
}

