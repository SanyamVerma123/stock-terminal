import type { ReactNode } from "react";
import { SiteHeader } from "@/components/finance/SiteHeader";

export function DashboardShell({ children }: { children: ReactNode }) {
  return <><SiteHeader/><main className="dashboard-shell">{children}</main></>;
}
