import { CLIENT_STATUS_CONFIG, type ClientStatus } from "@/types";

interface DashboardClient {
  status: string;
  estimated_amount: number | null;
}

interface DashboardProject {
  status: string;
}

export interface DashboardMetrics {
  totalClients: number;
  activeProjects: number;
  totalPipeline: number;
  conversionRate: number;
  wonAmount: number;
  statusCounts: Array<{
    status: ClientStatus;
    label: string;
    color: string;
    bgColor: string;
    count: number;
    ratio: number;
  }>;
}

function amount(value: number | null): number {
  return typeof value === "number" ? value : 0;
}

export function computeDashboardMetrics(
  clients: DashboardClient[],
  projects: DashboardProject[]
): DashboardMetrics {
  const totalClients = clients.length;
  const activeProjects = projects.filter((project) => project.status === "en_cours").length;
  const totalPipeline = clients
    .filter((client) => !["gagne", "perdu"].includes(client.status))
    .reduce((sum, client) => sum + amount(client.estimated_amount), 0);

  const wonClients = clients.filter((client) => client.status === "gagne");
  const lostClients = clients.filter((client) => client.status === "perdu");
  const totalClosed = wonClients.length + lostClients.length;
  const conversionRate = totalClosed > 0 ? (wonClients.length / totalClosed) * 100 : 0;
  const wonAmount = wonClients.reduce((sum, client) => sum + amount(client.estimated_amount), 0);

  const statusCounts = (Object.keys(CLIENT_STATUS_CONFIG) as ClientStatus[]).map((status) => {
    const count = clients.filter((client) => client.status === status).length;

    return {
      status,
      ...CLIENT_STATUS_CONFIG[status],
      count,
      ratio: totalClients > 0 ? (count / totalClients) * 100 : 0,
    };
  });

  return {
    totalClients,
    activeProjects,
    totalPipeline,
    conversionRate,
    wonAmount,
    statusCounts,
  };
}