import { useContext } from "react";
import { dashboardDataStore } from "../contexts/dashboardDataStore";

export function useDashboardData() {
  const context = useContext(dashboardDataStore);
  if (!context)
    throw new Error(
      "useDashboardData must be used within DashboardDataProvider.",
    );
  return context;
}
